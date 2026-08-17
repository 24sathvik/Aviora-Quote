'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { useToast } from '@/components/ui/Toast'
import {
  ArrowLeft,
  Upload,
  User,
  Phone,
  Mail,
  Shield,
  Loader2,
  X,
} from 'lucide-react'

const studentSchema = z.object({
  name: z.string().min(1, 'Student name is required'),
  phone: z.string().min(5, 'Valid phone number is required'),
  admission_date: z.string().min(1, 'Admission date is required'),
  dob: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  guardian_name: z.string().optional().nullable(),
  guardian_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.enum(['enquiry', 'enrolled', 'active', 'completed', 'dropped']),
})

type StudentFormValues = z.infer<typeof studentSchema>

export function StudentForm() {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      phone: '',
      admission_date: new Date().toISOString().split('T')[0],
      dob: '',
      email: '',
      guardian_name: '',
      guardian_phone: '',
      address: '',
      status: 'enquiry',
    },
  })

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const preview = URL.createObjectURL(file)
      setPhotoPreview(preview)
    }
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  // React Query Mutation for Student Creation
  const createStudentMutation = useMutation({
    mutationFn: async (values: StudentFormValues) => {
      setServerError(null)

      // 1. Insert student record first to get student ID
      const { data: insertedStudent, error: insertError } = await supabase
        .from('students')
        .insert({
          name: values.name.trim(),
          phone: values.phone.trim(),
          admission_date: values.admission_date,
          dob: values.dob ? values.dob : null,
          email: values.email && values.email.trim() ? values.email.trim() : null,
          guardian_name: values.guardian_name ? values.guardian_name.trim() : null,
          guardian_phone: values.guardian_phone ? values.guardian_phone.trim() : null,
          address: values.address ? values.address.trim() : null,
          status: values.status,
          photo_url: null,
        })
        .select('id, admission_no')
        .single()

      if (insertError) throw insertError

      let photo_url: string | null = null

      // 2. Upload photo if selected to exact deterministic path: students/{student_id}/profile.webp
      if (photoFile) {
        const deterministicPath = `students/${insertedStudent.id}/profile.webp`

        // Upload with upsert: true first (so previous valid image is not destroyed if upload fails)
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(deterministicPath, photoFile, { upsert: true, contentType: 'image/webp' })

        if (uploadError) {
          throw new Error('Photo upload failed: ' + uploadError.message)
        }

        const { data: urlData } = supabase.storage
          .from('student-photos')
          .getPublicUrl(deterministicPath)
        photo_url = urlData.publicUrl

        // Update photo_url on student record
        await supabase
          .from('students')
          .update({ photo_url })
          .eq('id', insertedStudent.id)
      }

      return insertedStudent
    },
    onError: (err: Error) => {
      setServerError(err.message)
      toastError('Error creating student', err.message)
    },
    onSuccess: (insertedStudent) => {
      // Invalidate student list cache with refetchType: 'all' so both active and inactive list queries refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all, refetchType: 'all' })
      success(
        'Student Created',
        `Student admission profile generated (${insertedStudent.admission_no})`
      )
      router.push(`/students/${insertedStudent.id}`)
    },
  })

  const onSubmit = (values: StudentFormValues) => {
    createStudentMutation.mutate(values)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/students"
          className="p-2 text-gray-400 hover:text-navy-700 hover:bg-white rounded-lg border border-gray-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Student Management
          </span>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            New Student Admission
          </h1>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden"
      >
        {serverError && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm">
            {serverError}
          </div>
        )}

        <div className="p-6 space-y-8">
          {/* Photo & Primary Bio Section */}
          <div className="flex flex-col sm:flex-row items-start gap-6 pb-6 border-b border-gray-100">
            {/* Photo Avatar Uploader */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden group">
                {photoPreview ? (
                  <>
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-2 text-gray-400">
                    <User className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                    <span className="text-2xs font-medium block">Photo</span>
                  </div>
                )}
              </div>

              <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900 bg-navy-50 hover:bg-navy-100 px-3 py-1.5 rounded-md transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Core Info Fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700">
                  Full Student Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  {...form.register('name')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
                {form.formState.errors.name && (
                  <p className="text-rose-500 text-xs mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Phone Number *
                </label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    {...form.register('phone')}
                    className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 shadow-xs focus:ring-accent focus:border-accent"
                  />
                </div>
                {form.formState.errors.phone && (
                  <p className="text-rose-500 text-xs mt-1">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="student@example.com"
                    {...form.register('email')}
                    className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 shadow-xs focus:ring-accent focus:border-accent"
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-rose-500 text-xs mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Admission Date *
                </label>
                <input
                  type="date"
                  {...form.register('admission_date')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  {...form.register('dob')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Guardian & Additional Particulars Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Guardian / Parent Name
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh Sharma"
                {...form.register('guardian_name')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                Guardian Contact Phone
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43211"
                {...form.register('guardian_phone')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700">
                Residential Address
              </label>
              <textarea
                rows={2}
                placeholder="Full permanent / mailing address..."
                {...form.register('address')}
                className="mt-1 block w-full rounded-lg border border-gray-300 p-3 text-xs shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          {/* Admission Status Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Admission Status *
            </label>
            <select
              {...form.register('status')}
              className="w-full sm:w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
            >
              <option value="enquiry">Enquiry / Prospect</option>
              <option value="enrolled">Enrolled</option>
              <option value="active">Active Academic</option>
              <option value="completed">Course Completed</option>
              <option value="dropped">Discontinued</option>
            </select>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <Link
            href="/students"
            className="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createStudentMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {createStudentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Student Admission Profile
          </button>
        </div>
      </form>
    </div>
  )
}
