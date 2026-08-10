'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  GraduationCap,
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  ArrowRight,
  Loader2,
  Calendar,
  X,
} from 'lucide-react'
import type { Course, CourseTerm } from '@/types/database'

export function CourseList() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [search, setSearch] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null)

  // Fetch courses with their terms to compute totals dynamically
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          description,
          duration_terms,
          created_at,
          course_terms (
            id,
            term_no,
            term_label,
            term_fee
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      return ((data || []) as unknown as Array<Course & { course_terms: CourseTerm[] }>).map((course) => {
        const terms = course.course_terms || []
        const total_fee = terms.reduce(
          (sum: number, t: CourseTerm) => sum + (Number(t.term_fee) || 0),
          0
        )
        return {
          ...course,
          course_terms: terms,
          terms_count: terms.length,
          total_fee,
        } as Course
      })
    },
  })

  // Add / Edit Course Mutation (Optimistic)
  const saveMutation = useMutation({
    mutationFn: async (values: { id?: string; name: string; description: string; duration_terms: number }) => {
      if (values.id) {
        const { error } = await supabase
          .from('courses')
          .update({
            name: values.name,
            description: values.description,
            duration_terms: values.duration_terms,
          })
          .eq('id', values.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('courses')
          .insert({
            name: values.name,
            description: values.description,
            duration_terms: values.duration_terms,
          })
        if (error) throw error
      }
    },
    onMutate: async (newCourse) => {
      await queryClient.cancelQueries({ queryKey: ['courses'] })
      const previousCourses = queryClient.getQueryData<Course[]>(['courses'])

      if (previousCourses) {
        if (newCourse.id) {
          queryClient.setQueryData<Course[]>(['courses'], (old) =>
            (old || []).map((c) =>
              c.id === newCourse.id ? { ...c, ...newCourse } : c
            )
          )
        } else {
          const optimisticCourse: Course = {
            id: 'temp-' + Math.random().toString(36).substring(2, 9),
            name: newCourse.name,
            description: newCourse.description,
            duration_terms: newCourse.duration_terms,
            created_at: new Date().toISOString(),
            course_terms: [],
            terms_count: 0,
            total_fee: 0,
          }
          queryClient.setQueryData<Course[]>(['courses'], (old) => [
            optimisticCourse,
            ...(old || []),
          ])
        }
      }
      return { previousCourses }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(['courses'], context?.previousCourses)
      toastError('Failed to save course', err.message)
    },
    onSuccess: () => {
      success(editingCourse ? 'Course updated' : 'Course created successfully')
      setIsAddModalOpen(false)
      setEditingCourse(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })

  // Delete Course Mutation (Optimistic)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['courses'] })
      const previousCourses = queryClient.getQueryData<Course[]>(['courses'])
      if (previousCourses) {
        queryClient.setQueryData<Course[]>(['courses'], (old) =>
          (old || []).filter((c) => c.id !== id)
        )
      }
      return { previousCourses }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(['courses'], context?.previousCourses)
      toastError('Failed to delete course', err.message)
    },
    onSuccess: () => {
      success('Course deleted successfully')
      setDeletingCourse(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })

  const filteredCourses = (courses || []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Courses & Fee Structures
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage academic programs, duration, terms, and term-wise fee configurations.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCourse(null)
            setIsAddModalOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
        <div className="text-xs font-medium text-gray-500 px-2 py-1 bg-gray-100 rounded-md">
          {filteredCourses.length} {filteredCourses.length === 1 ? 'Course' : 'Courses'}
        </div>
      </div>

      {/* Courses Grid / Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
              <div className="pt-4 border-t border-gray-100 flex justify-between">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-full bg-navy-50 flex items-center justify-center text-navy-700 mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">No courses found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {search
              ? 'No courses matched your search criteria. Try a different query.'
              : 'Get started by creating your first course and configuring its term-wise fee structure.'}
          </p>
          {!search && (
            <button
              onClick={() => {
                setEditingCourse(null)
                setIsAddModalOpen(true)
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create First Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center text-navy-700 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
                        {course.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {course.duration_terms}{' '}
                        {course.duration_terms === 1 ? 'Term Duration' : 'Terms Duration'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCourse(course)
                        setIsAddModalOpen(true)
                      }}
                      title="Edit Course"
                      className="p-1.5 text-gray-400 hover:text-navy-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCourse(course)}
                      title="Delete Course"
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {course.description && (
                  <p className="text-xs text-gray-600 mt-3 line-clamp-2">
                    {course.description}
                  </p>
                )}

                <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">Terms Configured</span>
                    <span className="text-sm font-semibold text-gray-900 mt-0.5 block">
                      {course.terms_count || 0} of {course.duration_terms}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Total Course Fee</span>
                    <span className="text-sm font-bold text-navy-900 mt-0.5 block">
                      {formatCurrency(course.total_fee || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {course.terms_count === 0 ? 'No fee structure set' : `${course.terms_count} terms defined`}
                </span>
                <Link
                  href={`/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
                >
                  Configure Terms
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Course Modal */}
      {isAddModalOpen && (
        <CourseModal
          course={editingCourse}
          isOpen={isAddModalOpen}
          isSubmitting={saveMutation.isPending}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingCourse(null)
          }}
          onSubmit={(data) => {
            saveMutation.mutate({
              id: editingCourse?.id,
              ...data,
            })
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete Course</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-900">{deletingCourse.name}</span>? All configured terms and fee heads will also be removed.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setDeletingCourse(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingCourse.id)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface CourseModalProps {
  course: Course | null
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: { name: string; description: string; duration_terms: number }) => void
}

function CourseModal({ course, isSubmitting, onClose, onSubmit }: CourseModalProps) {
  const [name, setName] = useState(course?.name || '')
  const [description, setDescription] = useState(course?.description || '')
  const [durationTerms, setDurationTerms] = useState(course?.duration_terms || 1)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Course name is required')
      return
    }
    if (durationTerms < 1) {
      setError('Duration must be at least 1 term')
      return
    }
    setError(null)
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      duration_terms: Number(durationTerms),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {course ? 'Edit Course' : 'Create New Course'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Course Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bachelor of Computer Applications (BCA)"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the course structure, specialization, etc."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Duration (Number of Terms / Semesters / Years) *
            </label>
            <input
              type="number"
              min={1}
              max={20}
              required
              value={durationTerms}
              onChange={(e) => setDurationTerms(parseInt(e.target.value) || 1)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-xs text-gray-500 mt-1">
              How many terms (e.g. 6 semesters, 4 years, 8 terms) the student will pay fees for.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {course ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
