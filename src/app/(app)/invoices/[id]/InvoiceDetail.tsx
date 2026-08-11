'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import { StatusBadge, type StatusType } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  ArrowLeft,
  Download,
  Edit2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Send,
  Receipt,
  User,
  GraduationCap,
  Calendar,
  CreditCard,
  Layers,
  Loader2,
} from 'lucide-react'
import type { Invoice, InvoiceStatus, CompanySettings } from '@/types/database'

export function InvoiceDetail() {
  const params = useParams()
  const invoiceId = params.id as string
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)

  // Fetch full invoice record with relations, line items, and invoice_balances view
  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const { data: rawInvoice, error } = await supabase
        .from('invoices')
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
          enrollments (
            id,
            batch_year,
            current_term,
            courses (
              id,
              name,
              duration_terms
            )
          ),
          course_terms (
            id,
            term_no,
            term_label,
            term_fee
          ),
          invoice_items (
            id,
            description,
            quantity,
            unit_price,
            line_total
          ),
          payments (
            id,
            receipt_no,
            amount,
            payment_date,
            payment_mode,
            reference_no,
            notes,
            paid_at
          )
        `)
        .eq('id', invoiceId)
        .single()

      if (error) throw error
      if (!rawInvoice) return null

      const { data: balanceData } = await supabase
        .from('invoice_balances')
        .select('*')
        .eq('invoice_id', invoiceId)
        .maybeSingle()

      return {
        ...rawInvoice,
        invoice_balances: balanceData || {
          invoice_id: rawInvoice.id,
          grand_total: rawInvoice.grand_total,
          amount_paid: 0,
          balance_due: rawInvoice.grand_total,
          computed_status: rawInvoice.status || 'draft',
        },
      } as unknown as Invoice
    },
  })

  // Fetch company branding
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle()
      return (data || null) as unknown as CompanySettings
    },
  })

  // Cancel Invoice Mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' as InvoiceStatus })
        .eq('id', invoiceId)
      if (error) throw error
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['invoice', invoiceId] })
      const prev = queryClient.getQueryData<Invoice>(['invoice', invoiceId])
      if (prev) {
        queryClient.setQueryData<Invoice>(['invoice', invoiceId], {
          ...prev,
          status: 'cancelled',
        })
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      queryClient.setQueryData(['invoice', invoiceId], context?.prev)
      toastError('Failed to cancel invoice', err.message)
    },
    onSuccess: () => {
      success('Invoice marked as Cancelled')
      setIsCancelModalOpen(false)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  // Mark as Sent Mutation (if in draft)
  const markAsSentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent' as InvoiceStatus })
        .eq('id', invoiceId)
      if (error) throw error
    },
    onSuccess: () => {
      success('Invoice marked as Issued/Sent')
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
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

  if (isError || !invoice) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Tax Invoice not found</h3>
        <p className="text-sm text-gray-500">
          The requested invoice could not be found or has been removed.
        </p>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices List
        </Link>
      </div>
    )
  }

  const student = invoice.students
  const course = invoice.enrollments?.courses
  const term = invoice.course_terms
  const items = invoice.invoice_items || []
  const payments = invoice.payments || []
  const balances = invoice.invoice_balances
  const computedStatus = balances?.computed_status || invoice.status || 'draft'
  const amountPaid = balances?.amount_paid || 0
  const balanceDue = balances?.balance_due ?? invoice.grand_total

  return (
    <div className="space-y-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 text-gray-400 hover:text-navy-700 hover:bg-white rounded-lg border border-gray-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Tax Invoice
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-mono font-bold text-navy-800">
                {invoice.invoice_no}
              </span>
              <span className="text-2xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                FY {invoice.fy_label}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
              {student?.name || 'Enrolled Student'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {balanceDue > 0 && invoice.status !== 'cancelled' && (
            <Link
              href={`/payments/new?invoice_id=${invoice.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Record Payment
            </Link>
          )}

          {invoice.status === 'draft' && (
            <button
              onClick={() => markAsSentMutation.mutate()}
              disabled={markAsSentMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Mark as Issued
            </button>
          )}

          {invoice.status !== 'cancelled' && (
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Link>
          )}

          {invoice.status !== 'cancelled' && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Invoice
            </button>
          )}

          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            download
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>
        </div>
      </div>

      {/* Invoice Overview Document Sheet */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Banner Bar */}
        <div className="bg-navy-900 text-white px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-2xs uppercase tracking-widest text-accent font-bold">
              Official Tax Invoice & Fee Schedule
            </span>
            <div className="text-2xl font-mono font-bold mt-0.5">{invoice.invoice_no}</div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-2xs text-gray-400 block">Computed Status</span>
              <div className="mt-0.5">
                <StatusBadge status={computedStatus as StatusType} />
              </div>
            </div>

            <div className="text-right pl-6 border-l border-navy-800">
              <span className="text-2xs text-gray-400 block">Balance Due</span>
              <div className="text-xl font-mono font-bold text-amber-300 mt-0.5">
                {formatCurrency(balanceDue)}
              </div>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-8 space-y-8">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-200">
            {/* Student & Course Details */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Billed To (Student)
              </span>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="text-base font-bold text-gray-900">
                  {student?.name || 'Enrolled Student'}
                </div>
                <div className="font-mono text-navy-800 font-semibold">
                  Admission No: {student?.admission_no}
                </div>
                {student?.phone && <div>Phone: {student.phone}</div>}
                {student?.email && <div>Email: {student.email}</div>}
                {student?.address && (
                  <div className="text-gray-500 pt-1">{student.address}</div>
                )}
                <div className="pt-2 text-gray-900 font-medium">
                  Program: {course?.name || 'Aviation Pilot Training'}
                  {term && <span className="text-navy-700"> • {term.term_label}</span>}
                </div>
              </div>
            </div>

            {/* Invoice Dates & Ledger Details */}
            <div className="space-y-3 md:text-right">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Invoice Details
              </span>
              <div className="space-y-1 text-xs text-gray-600">
                <div>
                  Invoice Date:{' '}
                  <strong className="text-gray-900">
                    {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </div>
                <div>
                  Payment Due Date:{' '}
                  <strong className="text-rose-700 font-bold">
                    {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </div>
                <div>
                  Financial Year:{' '}
                  <strong className="text-gray-900">FY {invoice.fy_label}</strong>
                </div>
                <div>
                  Payment State:{' '}
                  <strong className="text-gray-900 uppercase font-mono">{computedStatus}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Itemized Fee Heads & Services Breakdown
            </h3>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-4 py-3">Fee Component / Service</th>
                    <th scope="col" className="px-4 py-3 text-center">Qty</th>
                    <th scope="col" className="px-4 py-3 text-right">Unit Rate</th>
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
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Notes Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Notes & Terms */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Payment Guidelines & Notes
              </h4>
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                {invoice.notes ||
                  '1. Payment must reference the tax invoice number.\n2. Invoices overdue beyond 15 days may incur late fee adjustments.\n3. Digital payment receipts are issued upon bank realization.'}
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-3 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Gross Term Subtotal:</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>

              {invoice.previous_outstanding > 0 && (
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>Previous Ledger Outstanding:</span>
                  <span className="font-mono">+ {formatCurrency(invoice.previous_outstanding)}</span>
                </div>
              )}

              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Early Bird / Special Discount:</span>
                  <span className="font-mono font-semibold">
                    - {formatCurrency(invoice.discount_amount)}
                  </span>
                </div>
              )}

              {invoice.scholarship_amount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Merit Scholarship Deduction:</span>
                  <span className="font-mono font-semibold">
                    - {formatCurrency(invoice.scholarship_amount)}
                  </span>
                </div>
              )}

              {invoice.coupon_amount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Promotional Coupon Code:</span>
                  <span className="font-mono font-semibold">
                    - {formatCurrency(invoice.coupon_amount)}
                  </span>
                </div>
              )}

              {invoice.gst_percent > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Applicable GST ({invoice.gst_percent}%):</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    + {formatCurrency(invoice.gst_amount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-extrabold text-navy-950 pt-3 border-t border-gray-200">
                <span>Grand Total:</span>
                <span className="font-mono">{formatCurrency(invoice.grand_total)}</span>
              </div>

              <div className="flex justify-between text-emerald-800 font-medium pt-1">
                <span>Amount Paid to Date:</span>
                <span className="font-mono font-bold">{formatCurrency(amountPaid)}</span>
              </div>

              <div className="flex justify-between text-base font-extrabold pt-2 border-t border-gray-300">
                <span className={balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                  Net Balance Due:
                </span>
                <span className={balanceDue > 0 ? 'text-rose-700 font-mono' : 'text-emerald-700 font-mono'}>
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Section (Phase 7 Integration Target) */}
          <div className="pt-6 border-t border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-navy-700" />
                Payment Transaction History
              </h3>
              <span className="text-2xs text-gray-400">
                {payments.length} {payments.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-6 text-center bg-gray-50/70 rounded-lg border border-dashed border-gray-200 text-xs text-gray-500">
                No payment transactions recorded for this invoice yet. Payments recorded in Phase 7 will reflect here automatically.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Receipt Ref</th>
                      <th scope="col" className="px-4 py-2.5">Date</th>
                      <th scope="col" className="px-4 py-2.5">Payment Mode</th>
                      <th scope="col" className="px-4 py-2.5">Transaction Ref</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-mono font-semibold text-navy-800">
                          {p.receipt_no || 'AV/RCT/00001'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(p.payment_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-700">
                          {p.payment_mode || 'Bank Transfer'}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500">
                          {p.reference_no || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              Ref: {invoice.invoice_no} ({invoice.fy_label})
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Cancel Tax Invoice</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel invoice{' '}
              <span className="font-mono font-bold text-navy-900">{invoice.invoice_no}</span>? This
              will set the status to Cancelled and eliminate the balance due from the student ledger.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
              >
                Keep Active
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {cancelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
