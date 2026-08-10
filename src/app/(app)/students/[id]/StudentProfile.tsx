'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge, type StatusType } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { EnrollmentsSection } from './EnrollmentsSection'
import { StudentFeeLedgerSection } from './StudentFeeLedgerSection'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Edit2,
  Receipt,
  FileText,
  AlertCircle,
  Clock,
  Loader2,
  X,
  Upload,
} from 'lucide-react'
import type { Student, StudentStatus } from '@/types/database'

function getStoragePhotoPath(fileName: string) {
  const ext = fileName.split('.').pop() || 'jpg'
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'p_' + Math.floor(Math.random() * 1000000)
  return `student-${uniqueId}.${ext}`
}

export function StudentProfile() {
  const params = useParams()
  const studentId = params.id as string
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Fetch student profile
  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (error) throw error
      return data as Student
    },
  })

  // Quick Status Update Mutation (Optimistic)
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: StudentStatus) => {
      const { error } = await supabase
        .from('students')
        .update({ status: newStatus })
        .eq('id', studentId)
      if (error) throw error
    },
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ['student', studentId] })
      const prev = queryClient.getQueryData<Student>(['student', studentId])
      if (prev) {
        queryClient.setQueryData<Student>(['student', studentId], {
          ...prev,
          status: newStatus,
        })
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(['student', studentId], context?.prev)
      toastError('Failed to update status', err.message)
    },
    onSuccess: () => {
      success('Student status updated')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })

  // Full Profile Update Mutation (Optimistic)
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: Partial<Student> & { newPhotoFile?: File | null }) => {
      let photo_url = updatedData.photo_url

      if (updatedData.newPhotoFile) {
        const path = getStoragePhotoPath(updatedData.newPhotoFile.name)
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(path, updatedData.newPhotoFile)

        if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message)
        const { data: urlData } = supabase.storage.from('student-photos').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }

      const payload: Partial<Student> = {
        name: updatedData.name,
        phone: updatedData.phone,
        email: updatedData.email,
        dob: updatedData.dob,
        admission_date: updatedData.admission_date,
        guardian_name: updatedData.guardian_name,
        guardian_phone: updatedData.guardian_phone,
        address: updatedData.address,
        status: updatedData.status,
        photo_url,
      }

      const { error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', studentId)

      if (error) throw error
    },
    onMutate: async (updatedData) => {
      await queryClient.cancelQueries({ queryKey: ['student', studentId] })
      const prev = queryClient.getQueryData<Student>(['student', studentId])
      if (prev) {
        queryClient.setQueryData<Student>(['student', studentId], {
          ...prev,
          ...updatedData,
        })
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(['student', studentId], context?.prev)
      toastError('Failed to update profile', err.message)
    },
    onSuccess: () => {
      success('Student profile updated')
      setIsEditModalOpen(false)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !student) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Student not found</h3>
        <p className="text-sm text-gray-500">
          The requested student admission record does not exist or has been deleted.
        </p>
        <Link
          href="/students"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Students Directory
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumbs & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/students"
            className="p-2 text-gray-400 hover:text-navy-700 hover:bg-white rounded-lg border border-gray-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Student Directory
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-mono font-bold text-navy-800">
                {student.admission_no}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
              {student.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Lifecycle Status Dropdown */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300 shadow-xs">
            <span className="text-xs text-gray-500 font-medium">Status:</span>
            <select
              value={student.status}
              disabled={updateStatusMutation.isPending}
              onChange={(e) => updateStatusMutation.mutate(e.target.value as StudentStatus)}
              className="text-xs font-semibold text-gray-900 bg-transparent border-0 focus:ring-0 cursor-pointer pr-2"
            >
              <option value="enquiry">Enquiry</option>
              <option value="enrolled">Enrolled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Student Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Student Photo */}
            <div className="shrink-0">
              {student.photo_url ? (
                <img
                  src={student.photo_url}
                  alt={student.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-navy-100 text-navy-800 font-bold text-2xl flex items-center justify-center border-4 border-white shadow-md">
                  {student.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Core Info & Metadata Grid */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                <span className="font-mono text-xs bg-navy-50 text-navy-800 px-2.5 py-1 rounded-md font-semibold">
                  {student.admission_no}
                </span>
                <StatusBadge status={student.status as StatusType} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-gray-900">{student.phone}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">
                    {student.email || <span className="text-gray-400 italic">No email</span>}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    Admitted:{' '}
                    <strong className="text-gray-800">
                      {new Date(student.admission_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    DOB:{' '}
                    {student.dob ? (
                      <strong className="text-gray-800">
                        {new Date(student.dob).toLocaleDateString('en-IN', {
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
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    Guardian:{' '}
                    {student.guardian_name ? (
                      <strong className="text-gray-800">
                        {student.guardian_name}{' '}
                        {student.guardian_phone ? `(${student.guardian_phone})` : ''}
                      </strong>
                    ) : (
                      <span className="text-gray-400 italic">Not specified</span>
                    )}
                  </span>
                </div>

                <div className="flex items-start gap-2 sm:col-span-3">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    Address:{' '}
                    {student.address || (
                      <span className="text-gray-400 italic">No residential address recorded</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Course Enrollments Section (Phase 3) */}
      <EnrollmentsSection studentId={studentId} />

      {/* Real Student Fee Ledger & Payment Collections (Phase 7) */}
      <StudentFeeLedgerSection studentId={studentId} />

      {/* Edit Student Modal */}
      {isEditModalOpen && (
        <EditStudentModal
          student={student}
          isOpen={isEditModalOpen}
          isSubmitting={updateProfileMutation.isPending}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={(data) => updateProfileMutation.mutate(data)}
        />
      )}
    </div>
  )
}

interface EditStudentModalProps {
  student: Student
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: Partial<Student> & { newPhotoFile?: File | null }) => void
}

function EditStudentModal({ student, isSubmitting, onClose, onSubmit }: EditStudentModalProps) {
  const [name, setName] = useState(student.name)
  const [phone, setPhone] = useState(student.phone)
  const [email, setEmail] = useState(student.email || '')
  const [dob, setDob] = useState(student.dob || '')
  const [admissionDate, setAdmissionDate] = useState(student.admission_date)
  const [guardianName, setGuardianName] = useState(student.guardian_name || '')
  const [guardianPhone, setGuardianPhone] = useState(student.guardian_phone || '')
  const [address, setAddress] = useState(student.address || '')
  const [status, setStatus] = useState<StudentStatus>(student.status)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(student.photo_url)
  const [error, setError] = useState<string | null>(null)

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Student name is required')
      return
    }
    if (!phone.trim()) {
      setError('Phone number is required')
      return
    }
    setError(null)
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      dob: dob || null,
      admission_date: admissionDate,
      guardian_name: guardianName.trim() || null,
      guardian_phone: guardianPhone.trim() || null,
      address: address.trim() || null,
      status,
      newPhotoFile: photoFile,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Edit Student Profile ({student.admission_no})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}

          {/* Photo Preview & Edit */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-navy-800 bg-navy-50 hover:bg-navy-100 px-3 py-1.5 rounded-md">
              <Upload className="w-3.5 h-3.5" />
              Change Photo
              <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </label>
          </div>

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
              <label className="block text-xs font-medium text-gray-700">Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Admission Date *</label>
              <input
                type="date"
                required
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StudentStatus)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              >
                <option value="enquiry">Enquiry</option>
                <option value="enrolled">Enrolled</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Guardian Name</label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Guardian Phone</label>
              <input
                type="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700">Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
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
