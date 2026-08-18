'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { StatusBadge, type StatusType } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Filter,
  GraduationCap,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import type { Course, Student } from '@/types/database'

const PAGE_SIZE = 15

export function StudentList() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  // State
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)

  // Fetch available courses for filter dropdown
  const { data: coursesList } = useQuery({
    queryKey: queryKeys.students.filterList,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .order('name', { ascending: true })
      if (error) throw error
      return (data || []) as Course[]
    },
  })

  // Debounce search query (~300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(0) // Reset to first page when search changes
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Server-side filtered and paginated query
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: queryKeys.students.list({ page, search: debouncedSearch, status: statusFilter, course: courseFilter }),
    queryFn: async () => {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      // If filtering by course, use inner join on enrollments
      const selectClause = courseFilter !== 'all' ? '*, enrollments!inner(course_id)' : '*'

      let query = supabase
        .from('students')
        .select(selectClause, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (courseFilter !== 'all') {
        query = query.eq('enrollments.course_id', courseFilter)
      }

      if (debouncedSearch) {
        // Search by name, admission_no, phone, email, or roll_number
        query = query.or(
          `name.ilike.%${debouncedSearch}%,admission_no.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,roll_number.ilike.%${debouncedSearch}%`
        )
      }

      const { data: students, count, error } = await query.range(from, to)

      if (error) throw error

      return {
        students: (students || []) as unknown as Student[],
        totalCount: count || 0,
      }
    },
    placeholderData: keepPreviousData,
  })

  // Delete Student Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) throw error
    },
    onError: (err: Error) => {
      toastError('Failed to delete student', err.message)
    },
    onSuccess: () => {
      success('Student record deleted')
      setDeletingStudent(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all, refetchType: 'all' })
    },
  })

  const students = data?.students || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Student Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Students & Admissions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse, search, enroll, and manage student profiles and admission records.
          </p>
        </div>

        <Link
          href="/students/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </Link>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-4">
        {/* Search input (Debounced ~300ms) */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, admission no (e.g. AV-2026-0001), or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 pl-1 pr-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {['all', 'enquiry', 'enrolled', 'active', 'completed', 'dropped'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st)
                  setPage(0)
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-navy-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {coursesList && coursesList.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> Course:
              </span>
              <select
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value)
                  setPage(0)
                }}
                className="text-xs rounded-md border border-gray-300 px-2.5 py-1 bg-white focus:outline-none focus:ring-accent"
              >
                <option value="all">All Courses</option>
                {coursesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-5 gap-4">
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-navy-50 flex items-center justify-center text-navy-700 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No students found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {debouncedSearch || statusFilter !== 'all'
                ? 'No student records match the active filter or search query.'
                : 'Get started by creating your first student admission profile.'}
            </p>
            {!debouncedSearch && statusFilter === 'all' && (
              <Link
                href="/students/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900"
              >
                <Plus className="w-4 h-4" />
                Add First Student
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Admission No
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Roll No
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Student Details
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Contact & Guardian
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Admission Date
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
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    {/* Admission Number */}
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-xs text-navy-800">
                      <Link
                        href={`/students/${student.id}`}
                        className="hover:underline hover:text-accent font-semibold"
                      >
                        {student.admission_no}
                      </Link>
                    </td>

                    {/* Roll Number */}
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-xs text-gray-700">
                      {student.roll_number || <span className="text-gray-400 italic font-sans">—</span>}
                    </td>

                    {/* Student Details with Avatar */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {student.photo_url ? (
                          <img
                            src={student.updated_at ? `${student.photo_url}?v=${student.updated_at}` : student.photo_url}
                            alt={student.name}
                            className="w-9 h-9 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-700 font-bold flex items-center justify-center text-xs">
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/students/${student.id}`}
                            className="font-semibold text-gray-900 hover:text-accent block text-sm"
                          >
                            {student.name}
                          </Link>
                          {student.email && (
                            <span className="text-xs text-gray-500 block">
                              {student.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      <div className="flex items-center gap-1.5 font-medium text-gray-900">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {student.phone}
                      </div>
                      {student.guardian_name && (
                        <div className="text-gray-500 mt-0.5">
                          Guardian: {student.guardian_name}{' '}
                          {student.guardian_phone ? `(${student.guardian_phone})` : ''}
                        </div>
                      )}
                    </td>

                    {/* Admission Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(student.admission_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={student.status as StatusType} />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/students/${student.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-gray-700 bg-gray-100 hover:bg-navy-50 hover:text-navy-800 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                        <button
                          onClick={() => setDeletingStudent(student)}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-gray-900">
              {totalCount === 0 ? 0 : page * PAGE_SIZE + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-gray-900">
              {Math.min((page + 1) * PAGE_SIZE, totalCount)}
            </span>{' '}
            of <span className="font-semibold text-gray-900">{totalCount}</span> student records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="px-2 font-medium text-gray-800">
              Page {totalPages === 0 ? 1 : page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages || isPlaceholderData || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete Student Record</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the student profile for{' '}
              <span className="font-semibold text-gray-900">{deletingStudent.name}</span> (
              {deletingStudent.admission_no})?
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingStudent.id)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
