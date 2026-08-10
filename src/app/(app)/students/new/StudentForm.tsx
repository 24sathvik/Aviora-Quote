'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
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

function getStoragePhotoPath(fileName: string) {
  const ext = fileName.split('.').pop() || 'jpg'
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'p_' + Math.floor(Math.random() * 1000000)
  return `student-${uniqueId}.${ext}`
}

export function StudentForm() {
  const router = useRouter()
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const onSubmit = async (values: StudentFormValues) => {
    try {
      setIsSubmitting(true)
      setServerError(null)

      let photo_url: string | null = null

      // Upload photo if selected
      if (photoFile) {
        const path = getStoragePhotoPath(photoFile.name)
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(path, photoFile)

        if (uploadError) {
          throw new Error('Photo upload failed: ' + uploadError.message)
        }

        const { data: urlData } = supabase.storage
          .from('student-photos')
          .getPublicUrl(path)
        photo_url = urlData.publicUrl
      }

      // Insert student record
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
          photo_url,
        })
        .select('id, admission_no')
        .single()

      if (insertError) throw insertError

      success(
        'Student Created',
        `Student admission profile generated (${insertedStudent.admission_no})`
      )

      router.push(`/students/${insertedStudent.id}`)
      router.refresh()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save student record'
      setServerError(errorMsg)
      toastError('Error creating student', errorMsg)
      setIsSubmitting(false)
    }
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
                  Date of Birth
                </label>
                <input
                  type="date"
                  {...form.register('dob')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
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
                {form.formState.errors.admission_date && (
                  <p className="text-rose-500 text-xs mt-1">
                    {form.formState.errors.admission_date.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Admission Status & Guardian Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-navy-700" />
                Admission Status
              </h3>

              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Status in Lifecycle
                </label>
                <select
                  {...form.register('status')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                >
                  <option value="enquiry">Enquiry (Prospective student)</option>
                  <option value="enrolled">Enrolled (Confirmed admission)</option>
                  <option value="active">Active (Currently attending)</option>
                  <option value="completed">Completed (Graduated)</option>
                  <option value="dropped">Dropped (Withdrawn)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Default status is Enquiry. Can be updated anytime later.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Residential Address
                </label>
                <div className="relative mt-1">
                  <textarea
                    rows={3}
                    placeholder="Full residential street, city, pin code..."
                    {...form.register('address')}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-navy-700" />
                Parent / Guardian Details
              </h3>

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
                  Guardian Contact Number
                </label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    {...form.register('guardian_phone')}
                    className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 shadow-xs focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <Link
            href="/students"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Student & Generate ID
          </button>
        </div>
      </form>
    </div>
  )
}
