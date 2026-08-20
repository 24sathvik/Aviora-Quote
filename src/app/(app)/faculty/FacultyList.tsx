'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { Pagination } from '@/components/ui/Pagination'
import {
  Users,
  Search,
  Plus,
  Filter,
  UserCheck,
  UserX,
  CreditCard,
  Building,
  Mail,
  Phone,
  FileSpreadsheet,
  Eye,
  Edit2,
  X,
  Loader2,
  Calendar,
  XCircle,
  CheckCircle2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Faculty } from '@/types/database'

const PAGE_SIZE = 15

export function FacultyList() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null)

  // Debounce search query (~300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch departments list for filter dropdown
  const { data: departmentsList = [] } = useQuery({
    queryKey: ['faculty', 'departments'],
    queryFn: async () => {
      const { data } = await supabase.from('faculty').select('department')
      const depts = Array.from(new Set((data || []).map((f: any) => f.department).filter(Boolean)))
      return depts as string[]
    },
  })

  // Paginated & filtered faculty query
  const { data, isLoading } = useQuery({
    queryKey: ['faculty', 'list', { page, pageSize, search: debouncedSearch, department: departmentFilter }],
    queryFn: async () => {
      const from = page * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('faculty')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (departmentFilter !== 'all') {
        query = query.eq('department', departmentFilter)
      }

      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,designation.ilike.%${debouncedSearch}%,department.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`
        )
      }

      const { data: facultyRows, count, error } = await query.range(from, to)
      if (error) throw error

      return {
        faculty: (facultyRows || []) as Faculty[],
        totalCount: count || 0,
      }
    },
    placeholderData: keepPreviousData,
  })

  // Add / Edit Faculty Mutation (Optimistic)
  const saveMutation = useMutation({
    mutationFn: async (values: Partial<Faculty>) => {
      if (values.id) {
        const { error } = await supabase
          .from('faculty')
          .update({
            name: values.name?.trim(),
            designation: values.designation?.trim() || null,
            department: values.department?.trim() || null,
            phone: values.phone?.trim(),
            email: values.email?.trim() || null,
            bank_account_name: values.bank_account_name?.trim() || null,
            bank_account_number: values.bank_account_number?.trim() || null,
            bank_ifsc: values.bank_ifsc?.trim() || null,
            bank_name: values.bank_name?.trim() || null,
            date_of_joining: values.date_of_joining || null,
          })
          .eq('id', values.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('faculty')
          .insert({
            name: values.name?.trim(),
            designation: values.designation?.trim() || null,
            department: values.department?.trim() || null,
            phone: values.phone?.trim(),
            email: values.email?.trim() || null,
            bank_account_name: values.bank_account_name?.trim() || null,
            bank_account_number: values.bank_account_number?.trim() || null,
            bank_ifsc: values.bank_ifsc?.trim() || null,
            bank_name: values.bank_name?.trim() || null,
            date_of_joining: values.date_of_joining || null,
            active: true,
          })
        if (error) throw error
      }
    },
    onMutate: async (newFac) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.faculty.all })
      const prev = queryClient.getQueryData<Faculty[]>(queryKeys.faculty.all)

      if (prev) {
        if (newFac.id) {
          queryClient.setQueryData<Faculty[]>(queryKeys.faculty.all, (old) =>
            (old || []).map((f) =>
              f.id === newFac.id ? ({ ...f, ...newFac } as Faculty) : f
            )
          )
        } else {
          const optimisticFaculty: Faculty = {
            id: 'temp-' + Math.random().toString(36).substring(2, 9),
            name: newFac.name || '',
            designation: newFac.designation || null,
            department: newFac.department || null,
            phone: newFac.phone || '',
            email: newFac.email || null,
            bank_account_name: newFac.bank_account_name || null,
            bank_account_number: newFac.bank_account_number || null,
            bank_ifsc: newFac.bank_ifsc || null,
            bank_name: newFac.bank_name || null,
            date_of_joining: newFac.date_of_joining || null,
            active: true,
            created_at: new Date().toISOString(),
          }
          queryClient.setQueryData<Faculty[]>(queryKeys.faculty.all, (old) => [
            optimisticFaculty,
            ...(old || []),
          ])
        }
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(queryKeys.faculty.all, context?.prev)
      toastError('Failed to save faculty record', err.message)
    },
    onSuccess: () => {
      success('Faculty record saved successfully')
      setIsAddModalOpen(false)
      setEditingFaculty(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.all, refetchType: 'all' })
    },
  })

  // Soft Deactivate / Reactivate Mutation (Optimistic)
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('faculty')
        .update({ active })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.faculty.all })
      const prev = queryClient.getQueryData<Faculty[]>(queryKeys.faculty.all)
      if (prev) {
        queryClient.setQueryData<Faculty[]>(queryKeys.faculty.all, (old) =>
          (old || []).map((f) => (f.id === id ? { ...f, active } : f))
        )
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(queryKeys.faculty.all, context?.prev)
      toastError('Failed to update faculty status', err.message)
    },
    onSuccess: (_, vars) => {
      success(vars.active ? 'Faculty member activated' : 'Faculty deactivated (retained for past payslips)')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.all, refetchType: 'all' })
    },
  })

  const facultyList = data?.faculty || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Faculty &amp; Instructors
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage teaching faculty, department allocations, bank accounts, and employment records.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingFaculty(null)
            setIsAddModalOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Faculty Member
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search faculty by name, designation, department, phone, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value)
              setPage(0)
            }}
            className="py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="all">All Departments</option>
            {departmentsList.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Faculty List Table Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : facultyList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-navy-50 flex items-center justify-center text-navy-700 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No faculty members found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              {searchInput || departmentFilter !== 'all'
                ? 'No faculty members matched your search or department filter.'
                : 'Get started by adding your first instructor or teaching faculty member.'}
            </p>
            {!searchInput && departmentFilter === 'all' && (
              <button
                onClick={() => {
                  setEditingFaculty(null)
                  setIsAddModalOpen(true)
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add First Faculty Member
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Faculty Member
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Department & Role
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Contact Details
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Date of Joining
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {facultyList.map((faculty) => (
                  <tr
                    key={faculty.id}
                    className={`hover:bg-gray-50/80 transition-colors ${
                      !faculty.active ? 'opacity-65 bg-gray-50/40' : ''
                    }`}
                  >
                    {/* Name & Avatar */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            faculty.active
                              ? 'bg-navy-100 text-navy-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {faculty.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/faculty/${faculty.id}`}
                            className="font-semibold text-gray-900 hover:text-accent block text-sm"
                          >
                            {faculty.name}
                          </Link>
                          <span className="text-xs text-gray-500 block">
                            {faculty.designation || 'Faculty'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      <div className="flex items-center gap-1.5 font-medium text-gray-900">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        {faculty.department || 'General'}
                      </div>
                      <span className="text-gray-500 block mt-0.5">
                        {faculty.designation || 'Instructor'}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      <div className="flex items-center gap-1.5 font-medium text-gray-900">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {faculty.phone}
                      </div>
                      {faculty.email && (
                        <div className="flex items-center gap-1.5 text-gray-500 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {faculty.email}
                        </div>
                      )}
                    </td>

                    {/* Joining Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      {faculty.date_of_joining ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(faculty.date_of_joining).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-2xs font-medium px-2.5 py-0.5 rounded-full border ${
                          faculty.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            faculty.active ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                        {faculty.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/faculty/${faculty.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-gray-700 bg-gray-100 hover:bg-navy-50 hover:text-navy-800 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            setEditingFaculty(faculty)
                            setIsAddModalOpen(true)
                          }}
                          className="p-1 text-gray-400 hover:text-navy-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                          title="Edit Faculty"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: faculty.id,
                              active: !faculty.active,
                            })
                          }
                          disabled={toggleActiveMutation.isPending}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            faculty.active
                              ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={faculty.active ? 'Deactivate Faculty' : 'Reactivate Faculty'}
                        >
                          {faculty.active ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls Bar */}
      <Pagination
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="Faculty Members"
        isLoading={isLoading}
      />

      {/* Add / Edit Faculty Modal */}
      {isAddModalOpen && (
        <FacultyModal
          faculty={editingFaculty}
          isOpen={isAddModalOpen}
          isSubmitting={saveMutation.isPending}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingFaculty(null)
          }}
          onSubmit={(data) => {
            saveMutation.mutate({
              id: editingFaculty?.id,
              ...data,
            })
          }}
        />
      )}
    </div>
  )
}

interface FacultyModalProps {
  faculty: Faculty | null
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: Partial<Faculty>) => void
}

function FacultyModal({ faculty, isSubmitting, onClose, onSubmit }: FacultyModalProps) {
  const [name, setName] = useState(faculty?.name || '')
  const [designation, setDesignation] = useState(faculty?.designation || '')
  const [department, setDepartment] = useState(faculty?.department || '')
  const [phone, setPhone] = useState(faculty?.phone || '')
  const [email, setEmail] = useState(faculty?.email || '')
  const [dateOfJoining, setDateOfJoining] = useState(faculty?.date_of_joining || '')
  const [bankAccountName, setBankAccountName] = useState(faculty?.bank_account_name || '')
  const [bankAccountNumber, setBankAccountNumber] = useState(faculty?.bank_account_number || '')
  const [bankIfsc, setBankIfsc] = useState(faculty?.bank_ifsc || '')
  const [bankName, setBankName] = useState(faculty?.bank_name || '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Faculty name is required')
      return
    }
    if (!phone.trim()) {
      setError('Phone number is required')
      return
    }
    setError(null)
    onSubmit({
      name: name.trim(),
      designation: designation.trim() || undefined,
      department: department.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      date_of_joining: dateOfJoining || undefined,
      bank_account_name: bankAccountName.trim() || undefined,
      bank_account_number: bankAccountNumber.trim() || undefined,
      bank_ifsc: bankIfsc.trim() || undefined,
      bank_name: bankName.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {faculty ? 'Edit Faculty Profile' : 'Add New Faculty Member'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}

          {/* Personal & Academic Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-navy-700" />
              General Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ananya Sen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Professor, Assistant Lecturer"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science, Management"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  placeholder="faculty@aviora.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Date of Joining</label>
                <input
                  type="date"
                  value={dateOfJoining}
                  onChange={(e) => setDateOfJoining(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Bank Account Details for Future Payslips (Phase 8) */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-navy-700" />
              Banking Details (For Salary & Reimbursements)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Beneficiary Name</label>
                <input
                  type="text"
                  placeholder="Name as in bank passbook"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 50100234567890"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0000123"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent uppercase"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {faculty ? 'Update Profile' : 'Save Faculty Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
