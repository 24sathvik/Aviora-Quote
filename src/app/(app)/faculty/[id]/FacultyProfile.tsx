'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { FacultySalarySection } from './FacultySalarySection'
import {
  ArrowLeft,
  Phone,
  Mail,
  Building,
  Calendar,
  CreditCard,
  Briefcase,
  Edit2,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react'
import type { Faculty } from '@/types/database'

export function FacultyProfile() {
  const params = useParams()
  const facultyId = params.id as string
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Fetch faculty profile
  const { data: faculty, isLoading, isError } = useQuery({
    queryKey: queryKeys.faculty.detail(facultyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty')
        .select('*')
        .eq('id', facultyId)
        .single()

      if (error) throw error
      return data as Faculty
    },
  })

  // Full Profile Update Mutation (Optimistic)
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: Partial<Faculty>) => {
      const { error } = await supabase
        .from('faculty')
        .update(updatedData)
        .eq('id', facultyId)

      if (error) throw error
    },
    onMutate: async (updatedData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.faculty.detail(facultyId) })
      const prev = queryClient.getQueryData<Faculty>(queryKeys.faculty.detail(facultyId))
      if (prev) {
        queryClient.setQueryData<Faculty>(queryKeys.faculty.detail(facultyId), {
          ...prev,
          ...updatedData,
        })
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(queryKeys.faculty.detail(facultyId), context?.prev)
      toastError('Failed to update faculty profile', err.message)
    },
    onSuccess: () => {
      success('Faculty profile updated')
      setIsEditModalOpen(false)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.detail(facultyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.all })
    },
  })

  // Soft Deactivate / Reactivate
  const toggleActiveMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const { error } = await supabase
        .from('faculty')
        .update({ active })
        .eq('id', facultyId)
      if (error) throw error
    },
    onMutate: async (active) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.faculty.detail(facultyId) })
      const prev = queryClient.getQueryData<Faculty>(queryKeys.faculty.detail(facultyId))
      if (prev) {
        queryClient.setQueryData<Faculty>(queryKeys.faculty.detail(facultyId), {
          ...prev,
          active,
        })
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(queryKeys.faculty.detail(facultyId), context?.prev)
      toastError('Failed to update status', err.message)
    },
    onSuccess: (_, active) => {
      success(active ? 'Faculty activated' : 'Faculty deactivated (retained for past payslips)')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.detail(facultyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.all })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !faculty) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Faculty member not found</h3>
        <p className="text-sm text-gray-500">
          The requested faculty profile does not exist or has been removed.
        </p>
        <Link
          href="/faculty"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Faculty Directory
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/faculty"
            className="p-2 text-gray-400 hover:text-navy-700 hover:bg-white rounded-lg border border-gray-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Faculty Directory
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                {faculty.department || 'General'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
              {faculty.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleActiveMutation.mutate(!faculty.active)}
            disabled={toggleActiveMutation.isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              faculty.active
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {faculty.active ? (
              <>
                <XCircle className="w-3.5 h-3.5" />
                Deactivate Member
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Reactivate Member
              </>
            )}
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Main Profile Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-navy-100 text-navy-800 font-bold text-2xl flex items-center justify-center border-4 border-white shadow-md shrink-0">
              {faculty.name.substring(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{faculty.name}</h2>
                <span className="text-xs bg-navy-50 text-navy-800 px-2.5 py-0.5 rounded-md font-semibold">
                  {faculty.designation || 'Instructor'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-2xs font-medium px-2 py-0.5 rounded-full border ${
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
                  {faculty.active ? 'Active Status' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    Department: <strong className="text-gray-900">{faculty.department || 'General'}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-gray-900">{faculty.phone}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{faculty.email || <span className="text-gray-400 italic">No email</span>}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    Joined:{' '}
                    {faculty.date_of_joining ? (
                      <strong className="text-gray-900">
                        {new Date(faculty.date_of_joining).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>
                    ) : (
                      <span className="text-gray-400 italic">Not set</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:col-span-2">
                  <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    Bank:{' '}
                    {faculty.bank_name || faculty.bank_account_number ? (
                      <strong className="text-gray-900">
                        {faculty.bank_name ? `${faculty.bank_name} ` : ''}
                        {faculty.bank_account_number ? `(A/C: ${faculty.bank_account_number})` : ''}
                        {faculty.bank_ifsc ? ` [IFSC: ${faculty.bank_ifsc}]` : ''}
                      </strong>
                    ) : (
                      <span className="text-gray-400 italic">Banking details not configured</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Faculty Salary Structure & Payslip History (Phase 8) */}
      <FacultySalarySection facultyId={facultyId} />

      {/* Edit Faculty Modal */}
      {isEditModalOpen && (
        <EditFacultyModal
          faculty={faculty}
          isOpen={isEditModalOpen}
          isSubmitting={updateProfileMutation.isPending}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={(data) => updateProfileMutation.mutate(data)}
        />
      )}
    </div>
  )
}

function EditFacultyModal({
  faculty,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  faculty: Faculty
  isOpen?: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: Partial<Faculty>) => void
}) {
  const [name, setName] = useState(faculty.name)
  const [designation, setDesignation] = useState(faculty.designation || '')
  const [department, setDepartment] = useState(faculty.department || '')
  const [phone, setPhone] = useState(faculty.phone)
  const [email, setEmail] = useState(faculty.email || '')
  const [dateOfJoining, setDateOfJoining] = useState(faculty.date_of_joining || '')
  const [bankAccountName, setBankAccountName] = useState(faculty.bank_account_name || '')
  const [bankAccountNumber, setBankAccountNumber] = useState(faculty.bank_account_number || '')
  const [bankIfsc, setBankIfsc] = useState(faculty.bank_ifsc || '')
  const [bankName, setBankName] = useState(faculty.bank_name || '')
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
      designation: designation.trim() || null,
      department: department.trim() || null,
      phone: phone.trim(),
      email: email.trim() || null,
      date_of_joining: dateOfJoining || null,
      bank_account_name: bankAccountName.trim() || null,
      bank_account_number: bankAccountNumber.trim() || null,
      bank_ifsc: bankIfsc.trim() || null,
      bank_name: bankName.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-gray-900">Edit Faculty Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}

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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Department</label>
                <input
                  type="text"
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
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

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-navy-700" />
              Banking Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Beneficiary Name</label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Account Number</label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">IFSC Code</label>
                <input
                  type="text"
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
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
