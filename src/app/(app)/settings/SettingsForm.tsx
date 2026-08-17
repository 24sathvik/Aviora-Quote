'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { Skeleton } from '@/components/ui/Skeleton'
import { Loader2 } from 'lucide-react'

const settingsSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  gstin: z.string().optional(),
  bank_account_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_ifsc: z.string().optional(),
  bank_name: z.string().optional(),
  terms_and_conditions_text: z.string().optional(),
  logo_url: z.string().optional().nullable(),
  signature_url: z.string().optional().nullable(),
})

type SettingsValues = z.infer<typeof settingsSchema>

export function SettingsForm() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.companySettings,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      
      if (error) throw error
      return data || null
    },
  })

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      gstin: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_ifsc: '',
      bank_name: '',
      terms_and_conditions_text: '',
    },
  })

  useEffect(() => {
    if (settings) {
      form.reset(settings)
    }
  }, [settings, form])

  const mutation = useMutation({
    mutationFn: async (values: SettingsValues) => {
      let logo_url = values.logo_url
      let signature_url = values.signature_url

      // Deterministic upload paths for branding assets
      if (logoFile) {
        const logoPath = 'branding/academy-logo.webp'

        // 1. Upload new logo with upsert: true (safe: if upload fails, previous logo is preserved)
        const { error } = await supabase.storage
          .from('branding')
          .upload(logoPath, logoFile, { upsert: true, contentType: 'image/webp' })
        if (error) throw new Error('Logo upload failed: ' + error.message)

        const { data } = supabase.storage.from('branding').getPublicUrl(logoPath)
        logo_url = data.publicUrl

        // 2. Clean up legacy logo path if previously different
        if (settings?.logo_url) {
          const oldPath = settings.logo_url.split('/branding/').pop()
          if (oldPath && decodeURIComponent(oldPath) !== logoPath) {
            await supabase.storage.from('branding').remove([decodeURIComponent(oldPath)])
          }
        }
      }

      if (signatureFile) {
        const signaturePath = 'branding/signature.webp'

        // 1. Upload new signature with upsert: true (safe: if upload fails, previous signature is preserved)
        const { error } = await supabase.storage
          .from('branding')
          .upload(signaturePath, signatureFile, { upsert: true, contentType: 'image/webp' })
        if (error) throw new Error('Signature upload failed: ' + error.message)

        const { data } = supabase.storage.from('branding').getPublicUrl(signaturePath)
        signature_url = data.publicUrl

        // 2. Clean up legacy signature path if previously different
        if (settings?.signature_url) {
          const oldPath = settings.signature_url.split('/branding/').pop()
          if (oldPath && decodeURIComponent(oldPath) !== signaturePath) {
            await supabase.storage.from('branding').remove([decodeURIComponent(oldPath)])
          }
        }
      }

      const payload = {
        ...(settings?.id || values.id ? { id: settings?.id || values.id } : {}),
        ...values,
        logo_url,
        signature_url,
      }
      
      const { error } = await supabase
        .from('company_settings')
        .upsert(payload)
      if (error) throw error
    },
    onMutate: async (newSettings: SettingsValues) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.companySettings })
      const previousSettings = queryClient.getQueryData<SettingsValues | null>(queryKeys.companySettings)
      queryClient.setQueryData<SettingsValues | null>(queryKeys.companySettings, (old) => ({
        ...(old || {}),
        ...newSettings,
      }))
      return { previousSettings }
    },
    onError: (err: Error, _newSettings, context) => {
      queryClient.setQueryData(queryKeys.companySettings, context?.previousSettings)
      setSaveError(err.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companySettings })
      setLogoFile(null)
      setSignatureFile(null)
      setSaveError(null)
    },
  })

  const onSubmit = (data: SettingsValues) => {
    mutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-full max-w-md" />
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Company Details</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
            <input
              type="text"
              {...form.register('name')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm"
            />
            {form.formState.errors.name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              {...form.register('address')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm"
            />
            {form.formState.errors.address && <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              {...form.register('phone')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm"
            />
            {form.formState.errors.phone && <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">GSTIN</label>
            <input
              type="text"
              {...form.register('gstin')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Bank Details</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Bank Name</label>
            <input
              type="text"
              {...form.register('bank_name')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Name</label>
            <input
              type="text"
              {...form.register('bank_account_name')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Number</label>
            <input
              type="text"
              {...form.register('bank_account_number')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
            <input
              type="text"
              {...form.register('bank_ifsc')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium">Branding & Other</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo</label>
            {settings?.logo_url && !logoFile && (
              <img src={settings.logo_url} alt="Logo" className="mt-2 h-16 object-contain" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Signature</label>
            {settings?.signature_url && !signatureFile && (
              <img src={settings.signature_url} alt="Signature" className="mt-2 h-16 object-contain" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
          <textarea
            {...form.register('terms_and_conditions_text')}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm"
          />
        </div>
      </div>

      {saveError && (
        <div className="p-3 rounded bg-red-50 text-red-600 text-sm">
          Failed to save settings: {saveError}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex justify-center items-center rounded-md border border-transparent bg-navy-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50"
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </button>
      </div>
    </form>
  )
}
