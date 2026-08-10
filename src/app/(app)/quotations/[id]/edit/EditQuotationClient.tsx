'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { QuotationForm } from '@/app/(app)/quotations/new/QuotationForm'
import { Skeleton } from '@/components/ui/Skeleton'
import { AlertCircle } from 'lucide-react'
import type { Quotation } from '@/types/database'

export function EditQuotationClient() {
  const params = useParams()
  const quoteId = params.id as string
  const supabase = createClient()

  const { data: quotation, isLoading, isError } = useQuery({
    queryKey: ['quotation-edit', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          quotation_items (*)
        `)
        .eq('id', quoteId)
        .single()

      if (error) throw error
      return data as unknown as Quotation
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (isError || !quotation) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Quotation not found</h3>
        <p className="text-sm text-gray-500">
          The requested quotation could not be found or has been removed.
        </p>
      </div>
    )
  }

  return <QuotationForm initialQuotation={quotation} />
}
