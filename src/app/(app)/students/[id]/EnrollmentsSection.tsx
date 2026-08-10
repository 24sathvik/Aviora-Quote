'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import { StatusBadge, type StatusType } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  IndianRupee,
  Loader2,
  X,
  ArrowRight,
  BookOpen,
} from 'lucide-react'
import type { Course, CourseTerm, Enrollment, EnrollmentStatus } from '@/types/database'

interface EnrollmentsSectionProps {
  studentId: string
}

export function EnrollmentsSection({ studentId }: EnrollmentsSectionProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null)
  const [deletingEnrollment, setDeletingEnrollment] = useState<Enrollment | null>(null)

  // Fetch student's enrollments with joined course details
  const { data: enrollments, isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['student-enrollments', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          student_id,
          course_id,
          batch_year,
          current_term,
          status,
          enrolled_at,
          created_at,
          courses (
            id,
            name,
            duration_terms,
            course_terms (
              id,
              term_no,
              term_label,
              term_fee
            )
          )
        `)
        .eq('student_id', studentId)
        .order('enrolled_at', { ascending: false })

      if (error) throw error

      return ((data || []) as unknown as Array<Enrollment & { courses: Course & { course_terms: CourseTerm[] } }>).map((enr) => {
        const c = enr.courses
        const terms = c?.course_terms || []
        const totalFee = terms.reduce(
          (sum: number, t: CourseTerm) => sum + (Number(t.term_fee) || 0),
          0
        )
        const currentTermObj = terms.find((t: CourseTerm) => t.term_no === enr.current_term)

        return {
          ...enr,
          courses: {
            ...c,
            total_fee: totalFee,
            course_terms: terms,
          },
          current_term_fee: currentTermObj ? Number(currentTermObj.term_fee) : 0,
          current_term_label: currentTermObj?.term_label || `Term ${enr.current_term}`,
        }
      })
    },
  })

  // Fetch available courses for enrollment dropdown
  const { data: allCourses } = useQuery({
    queryKey: ['courses-for-enrollment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          duration_terms,
          course_terms (
            id,
            term_no,
            term_label,
            term_fee
          )
        `)
        .order('name', { ascending: true })

      if (error) throw error
      return (data || []) as unknown as Array<Course & { course_terms: CourseTerm[] }>
    },
  })

  // Add / Edit Enrollment Mutation (Optimistic)
  const saveEnrollmentMutation = useMutation({
    mutationFn: async (values: {
      id?: string
      course_id: string
      batch_year: number
      current_term: number
      status: EnrollmentStatus
      enrolled_at: string
    }) => {
      if (values.id) {
        const { error } = await supabase
          .from('enrollments')
          .update({
            current_term: values.current_term,
            status: values.status,
            batch_year: values.batch_year,
            enrolled_at: values.enrolled_at,
          })
          .eq('id', values.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('enrollments')
          .insert({
            student_id: studentId,
            course_id: values.course_id,
            batch_year: values.batch_year,
            current_term: values.current_term,
            status: values.status,
            enrolled_at: values.enrolled_at,
          })
        if (error) throw error
      }
    },
    onMutate: async (newEnr) => {
      await queryClient.cancelQueries({ queryKey: ['student-enrollments', studentId] })
      const prev = queryClient.getQueryData(['student-enrollments', studentId])

      // Optimistic update
      if (prev && newEnr.id) {
        queryClient.setQueryData<Enrollment[]>(['student-enrollments', studentId], (old) =>
          (old || []).map((e) => (e.id === newEnr.id ? ({ ...e, ...newEnr } as Enrollment) : e))
        )
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(['student-enrollments', studentId], context?.prev)
      toastError('Failed to save enrollment', err.message)
    },
    onSuccess: () => {
      success(editingEnrollment ? 'Enrollment updated' : 'Student enrolled into course successfully')
      setIsAddModalOpen(false)
      setEditingEnrollment(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments', studentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })

  // Delete Enrollment Mutation (Optimistic)
  const deleteEnrollmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('enrollments').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['student-enrollments', studentId] })
      const prev = queryClient.getQueryData(['student-enrollments', studentId])
      if (prev) {
        queryClient.setQueryData<Enrollment[]>(['student-enrollments', studentId], (old) =>
          (old || []).filter((e) => e.id !== id)
        )
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(['student-enrollments', studentId], context?.prev)
      toastError('Failed to delete enrollment', err.message)
    },
    onSuccess: () => {
      success('Enrollment removed')
      setDeletingEnrollment(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments', studentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })

  if (isLoadingEnrollments) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const enrollmentList = enrollments || []

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-800 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Course Enrollments</h3>
                <span className="text-xs bg-navy-50 text-navy-800 font-semibold px-2 py-0.5 rounded-full">
                  {enrollmentList.length} {enrollmentList.length === 1 ? 'Program' : 'Programs'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Students can be enrolled in one or more concurrent academic programs or certification tracks.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingEnrollment(null)
              setIsAddModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Enroll In Course
          </button>
        </div>

        {/* Enrollments List */}
        {enrollmentList.length === 0 ? (
          <div className="py-12 text-center bg-gray-50/70 rounded-xl border border-dashed border-gray-200">
            <BookOpen className="w-8 h-8 mx-auto text-navy-400 mb-2" />
            <h4 className="text-sm font-semibold text-gray-800">No Course Enrollments</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              This student has not been enrolled into any academic courses yet.
            </p>
            <button
              onClick={() => {
                setEditingEnrollment(null)
                setIsAddModalOpen(true)
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-navy-800 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Enroll Student Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollmentList.map((enr) => {
              const course = enr.courses
              const currentTermFee = enr.current_term_fee || 0
              const totalCourseFee = course?.total_fee || 0

              return (
                <div
                  key={enr.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/courses/${enr.course_id}`}
                        className="text-base font-bold text-gray-900 hover:text-accent flex items-center gap-1.5"
                      >
                        {course?.name || 'Unknown Course'}
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      </Link>
                      <StatusBadge status={enr.status as StatusType} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs text-gray-600">
                      <div>
                        <span className="text-gray-400 block">Batch Year</span>
                        <span className="font-semibold text-gray-900 mt-0.5 block flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          Batch of {enr.batch_year}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block">Current Progress</span>
                        <span className="font-semibold text-gray-900 mt-0.5 block flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-gray-400" />
                          {enr.current_term_label} ({enr.current_term} of {course?.duration_terms || 1})
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block">Current Term Fee</span>
                        <span className="font-bold text-navy-800 mt-0.5 block flex items-center gap-1">
                          <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
                          {formatCurrency(currentTermFee)}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block">Total Program Fee</span>
                        <span className="font-bold text-emerald-800 mt-0.5 block">
                          {formatCurrency(totalCourseFee)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 justify-end">
                    <button
                      onClick={() => {
                        setEditingEnrollment(enr)
                        setIsAddModalOpen(true)
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Update Progress / Term
                    </button>
                    <button
                      onClick={() => setDeletingEnrollment(enr)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Remove Enrollment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Enrollment Modal */}
      {isAddModalOpen && (
        <EnrollmentModal
          enrollment={editingEnrollment}
          courses={allCourses || []}
          isOpen={isAddModalOpen}
          isSubmitting={saveEnrollmentMutation.isPending}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingEnrollment(null)
          }}
          onSubmit={(data) => {
            saveEnrollmentMutation.mutate({
              id: editingEnrollment?.id,
              ...data,
            })
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Remove Course Enrollment</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to remove the enrollment in{' '}
              <span className="font-semibold text-gray-900">
                {deletingEnrollment.courses?.name || 'this course'}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setDeletingEnrollment(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteEnrollmentMutation.mutate(deletingEnrollment.id)}
                disabled={deleteEnrollmentMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {deleteEnrollmentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface EnrollmentModalProps {
  enrollment: Enrollment | null
  courses: Array<Course & { course_terms: CourseTerm[] }>
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: {
    course_id: string
    batch_year: number
    current_term: number
    status: EnrollmentStatus
    enrolled_at: string
  }) => void
}

function EnrollmentModal({
  enrollment,
  courses,
  isSubmitting,
  onClose,
  onSubmit,
}: EnrollmentModalProps) {
  const currentYear = new Date().getFullYear()

  const [courseId, setCourseId] = useState(enrollment?.course_id || courses[0]?.id || '')
  const [batchYear, setBatchYear] = useState(enrollment?.batch_year || currentYear)
  const [currentTerm, setCurrentTerm] = useState(enrollment?.current_term || 1)
  const [status, setStatus] = useState<EnrollmentStatus>(enrollment?.status || 'active')
  const [enrolledAt, setEnrolledAt] = useState(
    enrollment?.enrolled_at || new Date().toISOString().split('T')[0]
  )
  const [error, setError] = useState<string | null>(null)

  const selectedCourse = courses.find((c) => c.id === courseId)
  const availableTerms = selectedCourse?.course_terms || []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) {
      setError('Please select a course')
      return
    }
    setError(null)
    onSubmit({
      course_id: courseId,
      batch_year: Number(batchYear),
      current_term: Number(currentTerm),
      status,
      enrolled_at: enrolledAt,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {enrollment ? 'Update Course Enrollment' : 'Enroll Student in Course'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-700">Course / Program *</label>
            <select
              disabled={!!enrollment} // Cannot change course on existing enrollment, create new one instead
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value)
                setCurrentTerm(1)
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent disabled:bg-gray-100"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.duration_terms} {c.duration_terms === 1 ? 'Term' : 'Terms'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Batch Year *</label>
              <input
                type="number"
                min={2000}
                max={2099}
                required
                value={batchYear}
                onChange={(e) => setBatchYear(parseInt(e.target.value) || currentYear)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Current Term *</label>
              <select
                value={currentTerm}
                onChange={(e) => setCurrentTerm(parseInt(e.target.value) || 1)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              >
                {availableTerms.length > 0 ? (
                  availableTerms.map((t) => (
                    <option key={t.id} value={t.term_no}>
                      {t.term_label} ({formatCurrency(t.term_fee)})
                    </option>
                  ))
                ) : (
                  Array.from({ length: selectedCourse?.duration_terms || 1 }, (_, i) => i + 1).map(
                    (termNum) => (
                      <option key={termNum} value={termNum}>
                        Term {termNum}
                      </option>
                    )
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Enrollment Date *</label>
              <input
                type="date"
                required
                value={enrolledAt}
                onChange={(e) => setEnrolledAt(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EnrollmentStatus)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              >
                <option value="active">Active (Ongoing)</option>
                <option value="completed">Completed (Graduated)</option>
                <option value="dropped">Dropped (Withdrawn)</option>
              </select>
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
              {enrollment ? 'Save Progress' : 'Confirm Enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
