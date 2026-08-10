'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { generateInvoiceNumber } from '@/lib/numbering/generate-number'
import { getFinancialYearLabel } from '@/lib/numbering/financial-year'
import { calculateInvoiceTotals } from '@/lib/invoices/calculations'
import { formatCurrency } from '@/lib/utils/currency'
import { StatusBadge, type StatusType } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  ArrowLeft,
  Download,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type { Quotation, QuotationStatus, CompanySettings } from '@/types/database'

export function QuotationDetail() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id as string
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  // Fetch quotation details
  const { data: quotation, isLoading, isError } = useQuery({
    queryKey: ['quotation', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          students (
            id,
            admission_no,
            name,
            phone,
            email,
            address,
            guardian_name
          ),
          quotation_items (
            id,
            description,
            quantity,
            unit_price,
            discount_amount,
            line_total
          )
        `)
        .eq('id', quoteId)
        .single()

      if (error) throw error
      return data as unknown as Quotation
    },
  })

  // Convert to Invoice Mutation (Phase 6)
  const convertToInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!quotation) throw new Error('Quotation not loaded')

      // Auto-pull previous outstanding balance for student if linked
      let previousOutstanding = 0
      if (quotation.student_id) {
        const { data: priorInvoices } = await supabase
          .from('invoices')
          .select('id')
          .eq('student_id', quotation.student_id)
          .neq('status', 'cancelled')

        if (priorInvoices && priorInvoices.length > 0) {
          const priorIds = priorInvoices.map((i) => i.id)
          const { data: priorBalances } = await supabase
            .from('invoice_balances')
            .select('balance_due')
            .in('invoice_id', priorIds)

          previousOutstanding = (priorBalances || []).reduce(
            (s, b) => s + (Number(b.balance_due) || 0),
            0
          )
        }
      }

      const quoteDate = new Date()
      const fyLabel = getFinancialYearLabel(quoteDate)
      const invoiceNo = await generateInvoiceNumber(quoteDate, supabase)
      const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const items = quotation.quotation_items || []
      const calculated = calculateInvoiceTotals(
        items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
        previousOutstanding,
        quotation.discount_amount,
        0,
        0,
        quotation.gst_percent
      )

      // 1. Create Invoice in Draft status
      const { data: newInvoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          invoice_no: invoiceNo,
          fy_label: fyLabel,
          student_id: quotation.student_id || null,
          quotation_id: quotation.id,
          invoice_date: quoteDate.toISOString().split('T')[0],
          due_date: dueDate,
          previous_outstanding: previousOutstanding,
          subtotal: calculated.subtotal,
          discount_amount: calculated.discountAmount,
          scholarship_amount: 0,
          coupon_amount: 0,
          gst_percent: calculated.gstPercent,
          gst_amount: calculated.gstAmount,
          grand_total: calculated.grandTotal,
          status: 'draft',
          notes: quotation.terms_text || null,
        })
        .select('id, invoice_no')
        .single()

      if (invError) throw invError

      // 2. Insert line items
      const lineItems = calculated.recalculatedItems.map((it) => ({
        invoice_id: newInvoice.id,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.line_total,
      }))

      if (lineItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(lineItems)

        if (itemsError) throw itemsError
      }

      // 3. Mark Quotation as converted
      const { error: quoteUpdateError } = await supabase
        .from('quotations')
        .update({ status: 'converted' })
        .eq('id', quotation.id)

      if (quoteUpdateError) throw quoteUpdateError

      return newInvoice
    },
    onError: (err: Error) => {
      toastError('Failed to convert quotation to invoice', err.message)
    },
    onSuccess: (newInvoice) => {
      success(`Converted to Tax Invoice ${newInvoice.invoice_no}`)
      queryClient.invalidateQueries({ queryKey: ['quotation', quoteId] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-summary-strip-metrics'] })
      router.push(`/invoices/${newInvoice.id}`)
    },
  })

  // Fetch company branding for display
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle()
      return (data || null) as unknown as CompanySettings
    },
  })

  // Status Change Mutation (Optimistic)
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: QuotationStatus) => {
      const { error } = await supabase
        .from('quotations')
        .update({ status: newStatus })
        .eq('id', quoteId)
      if (error) throw error
    },
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ['quotation', quoteId] })
      const prev = queryClient.getQueryData<Quotation>(['quotation', quoteId])
      if (prev) {
        queryClient.setQueryData<Quotation>(['quotation', quoteId], {
          ...prev,
          status: newStatus,
        })
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(['quotation', quoteId], context?.prev)
      toastError('Failed to update quotation status', err.message)
    },
    onSuccess: (_, newStatus) => {
      success(`Quotation marked as ${newStatus.toUpperCase()}`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', quoteId] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
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
        <Link
          href="/quotations"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quotations List
        </Link>
      </div>
    )
  }

  const recipientName = quotation.students?.name || quotation.lead_name || 'Prospective Student'
  const recipientPhone = quotation.students?.phone || quotation.lead_phone
  const recipientEmail = quotation.students?.email || quotation.lead_email
  const items = quotation.quotation_items || []

  return (
    <div className="space-y-8">
      {/* Top Breadcrumbs & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/quotations"
            className="p-2 text-gray-400 hover:text-navy-700 hover:bg-white rounded-lg border border-gray-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Fee Quotation
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-mono font-bold text-navy-800">
                {quotation.quote_no}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
              {recipientName}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Transitions */}
          {quotation.status === 'draft' && (
            <button
              onClick={() => updateStatusMutation.mutate('sent')}
              disabled={updateStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Mark as Sent
            </button>
          )}

          {quotation.status === 'sent' && (
            <>
              <button
                onClick={() => updateStatusMutation.mutate('accepted')}
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark as Accepted
              </button>

              <button
                onClick={() => updateStatusMutation.mutate('expired')}
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                Mark as Expired
              </button>
            </>
          )}

          {/* Convert to Invoice Button */}
          <button
            onClick={() => convertToInvoiceMutation.mutate()}
            disabled={quotation.status !== 'accepted' || convertToInvoiceMutation.isPending}
            title={
              quotation.status === 'accepted'
                ? 'Convert this accepted quotation into an active Tax Invoice'
                : 'Only accepted quotations can be converted to invoices'
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              quotation.status === 'accepted'
                ? 'bg-accent text-navy-950 border-amber-300 hover:bg-amber-400 cursor-pointer shadow-xs'
                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
            }`}
          >
            {convertToInvoiceMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            Convert to Invoice
          </button>

          {/* Edit Quotation */}
          <Link
            href={`/quotations/${quotation.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Link>

          {/* Download Official PDF */}
          <a
            href={`/api/quotations/${quotation.id}/pdf`}
            download
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>
        </div>
      </div>

      {/* Official Quotation Document Sheet View */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Document Header Bar */}
        <div className="bg-navy-900 text-white px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-2xs uppercase tracking-widest text-accent font-bold">
              Official Fee Quotation & Proposal
            </span>
            <div className="text-2xl font-mono font-bold mt-0.5">{quotation.quote_no}</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-2xs text-gray-400 block">Status</span>
              <div className="mt-0.5">
                <StatusBadge status={quotation.status as StatusType} />
              </div>
            </div>
          </div>
        </div>

        {/* Document Body */}
        <div className="p-8 space-y-8">
          {/* Company & Recipient Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-200">
            {/* Recipient Details */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Quotation Issued To
              </span>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="text-base font-bold text-gray-900">{recipientName}</div>
                {quotation.students?.admission_no && (
                  <div className="font-mono text-navy-800 font-semibold">
                    Student ID: {quotation.students.admission_no}
                  </div>
                )}
                {recipientPhone && <div>Phone: {recipientPhone}</div>}
                {recipientEmail && <div>Email: {recipientEmail}</div>}
                {quotation.students?.address && (
                  <div className="text-gray-500 pt-1">{quotation.students.address}</div>
                )}
              </div>
            </div>

            {/* Quotation Metadata */}
            <div className="space-y-3 md:text-right">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Quotation Details
              </span>
              <div className="space-y-1 text-xs text-gray-600">
                <div>
                  Date Issued:{' '}
                  <strong className="text-gray-900">
                    {new Date(quotation.quote_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </div>
                <div>
                  Valid Until:{' '}
                  <strong className="text-gray-900">
                    {quotation.valid_until
                      ? new Date(quotation.valid_until).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '15 Days from issue'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Itemized Fee & Program Breakdown
            </h3>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-4 py-3">Description</th>
                    <th scope="col" className="px-4 py-3 text-center">Qty</th>
                    <th scope="col" className="px-4 py-3 text-right">Unit Price</th>
                    <th scope="col" className="px-4 py-3 text-right">Discount</th>
                    <th scope="col" className="px-4 py-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3.5 font-medium text-gray-900">{item.description}</td>
                      <td className="px-4 py-3.5 text-center text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-right text-gray-600 font-mono">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-gray-500">
                        {item.discount_amount > 0 ? (
                          <span className="text-rose-600">- {formatCurrency(item.discount_amount)}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Terms Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Terms & Conditions */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Terms & Conditions
              </h4>
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                {quotation.terms_text ||
                  '1. Fees quoted are subject to seat availability at enrollment.\n2. Applicable taxes (GST) are levied per Government of India guidelines.\n3. Installment schedules will be governed by admission agreements.'}
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-3">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Gross Line Subtotal:</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {formatCurrency(quotation.subtotal)}
                </span>
              </div>

              {quotation.discount_amount > 0 && (
                <div className="flex justify-between text-xs text-rose-700">
                  <span>Special Discount / Scholarship:</span>
                  <span className="font-semibold font-mono">
                    - {formatCurrency(quotation.discount_amount)}
                  </span>
                </div>
              )}

              {quotation.gst_percent > 0 && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Applicable GST ({quotation.gst_percent}%):</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    {formatCurrency(quotation.gst_amount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-extrabold text-navy-950 pt-3 border-t border-gray-200">
                <span>Total Quotation Value:</span>
                <span className="font-mono">{formatCurrency(quotation.total)}</span>
              </div>
            </div>
          </div>

          {/* Banking & Remittance Footer */}
          <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-gray-500">
            <div>
              <strong className="text-gray-900 block">
                {companySettings?.company_name || 'Aviora Aviation Academy Pvt Ltd'}
              </strong>
              <span>
                Bank: {companySettings?.bank_name || 'HDFC Bank Ltd'} | A/C:{' '}
                {companySettings?.bank_account_number || '50200084920192'} | IFSC:{' '}
                {companySettings?.bank_ifsc || 'HDFC0001234'}
              </span>
            </div>

            <div className="text-right font-mono text-2xs text-gray-400">
              Ref: {quotation.quote_no}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
