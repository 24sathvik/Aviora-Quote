'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { updateCompanyInvoiceStatus, deleteCompanyInvoice } from '@/lib/company-invoices/actions'
import { formatCurrencyWithSymbol, getCurrencySymbol } from '@/lib/utils/currency'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  ArrowLeft,
  Download,
  Building2,
  Phone,
  MapPin,
  FileText,
  Hash,
  Calendar,
  CheckCircle2,
  XCircle,
  Globe2,
  Trash2,
  Loader2,
  Printer,
  DollarSign,
  Layers,
  Edit2,
  Info,
  Clock,
  Send,
} from 'lucide-react'
import type { CompanyInvoice, CompanyInvoiceStatus } from '@/types/database'

export function CompanyInvoiceDetail() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch full company invoice with line items
  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: queryKeys.companyInvoices.detail(invoiceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_invoices')
        .select(`
          *,
          company_invoice_items (
            id,
            description,
            quantity,
            unit_price,
            line_total,
            currency
          )
        `)
        .eq('id', invoiceId)
        .single()

      if (error) throw error
      return data as unknown as CompanyInvoice
    },
  })

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: async (status: CompanyInvoiceStatus) => {
      await updateCompanyInvoiceStatus(invoiceId, status, supabase)
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companyInvoices.all })
      success(`Company invoice status marked as ${newStatus}`)
    },
    onError: (err: Error) => {
      toastError('Status update failed', err.message)
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deleteCompanyInvoice(invoiceId, supabase)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companyInvoices.all })
      success('Company invoice deleted successfully')
      router.push('/invoices')
    },
    onError: (err: Error) => {
      toastError('Delete failed', err.message)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !invoice) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Company Invoice Not Found</h2>
        <p className="text-sm text-gray-500">
          The requested corporate invoice does not exist or has been removed.
        </p>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-semibold hover:bg-navy-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
      </div>
    )
  }

  const currency = invoice.currency || 'INR'
  const currencySymbol = getCurrencySymbol(currency)
  const items = invoice.company_invoice_items || []
  const isGstApplied = Number(invoice.gst_percent) > 0 && Number(invoice.gst_amount) > 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
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
                Corporate Invoices
              </span>
              <span className="text-2xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                FY {invoice.fy_label}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold uppercase tracking-wider ${
                  invoice.status === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : invoice.status === 'sent'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : invoice.status === 'draft'
                    ? 'bg-gray-50 text-gray-600 border border-gray-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
              {invoice.company_name}
            </h1>
            <p className="text-xs font-mono text-gray-500 mt-0.5">
              Invoice #{invoice.invoice_no} · Created {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {invoice.status !== 'cancelled' && (
            <Link
              href={`/invoices/company/${invoice.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Invoice
            </Link>
          )}

          <a
            href={`/api/company-invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-navy-900 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>

          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button
              type="button"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate('paid')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark as Paid
            </button>
          )}

          {invoice.status === 'draft' && (
            <button
              type="button"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate('sent')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Mark as Issued
            </button>
          )}

          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <button
              type="button"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate('cancelled')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Invoice
            </button>
          )}

          {invoice.status === 'draft' && (
            <button
              type="button"
              onClick={() => setIsDeleting(true)}
              className="p-2 text-gray-400 hover:text-rose-600 rounded-lg border border-gray-200 bg-white transition-colors"
              title="Delete draft invoice"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Billed To Company */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Building2 className="w-4 h-4 text-navy-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Billed To (Company)
            </h3>
          </div>

          <div className="space-y-2.5 text-sm">
            <div>
              <span className="text-xs text-gray-400 block">Company Name</span>
              <span className="font-bold text-gray-900 text-base">{invoice.company_name}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Mobile / Phone
                </span>
                <span className="font-semibold text-gray-900">{invoice.company_phone}</span>
              </div>

              <div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Globe2 className="w-3 h-3" /> Currency
                </span>
                <span className="font-semibold text-gray-900 font-mono">
                  {currency} ({currencySymbol})
                </span>
              </div>
            </div>

            {invoice.company_address && (
              <div className="pt-1">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Address
                </span>
                <span className="text-gray-700">{invoice.company_address}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> GST Number
                </span>
                <span className="font-mono font-semibold text-gray-900 text-xs">
                  {invoice.company_gstin || 'Not Applicable / Exempt'}
                </span>
              </div>

              <div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> CIN Number
                </span>
                <span className="font-mono font-semibold text-gray-900 text-xs">
                  {invoice.company_cin || 'Not Applicable'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Invoice Schedule */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Calendar className="w-4 h-4 text-navy-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Invoice Schedule &amp; Summary
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-400 block">Invoice Date</span>
                <span className="font-semibold text-gray-900">{invoice.invoice_date}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Due Date</span>
                <span className="font-semibold text-gray-900">{invoice.due_date}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <span className="text-xs text-gray-400 block">Invoice Type</span>
                <span className="font-semibold text-gray-900">
                  {isGstApplied ? 'Tax Invoice' : 'Commercial Invoice'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">GST Rate</span>
                <span className="font-semibold text-gray-900">
                  {isGstApplied ? `${invoice.gst_percent}% Applied` : 'Optional (0%)'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                  Grand Total ({currency})
                </span>
                <span className="text-2xl font-extrabold font-mono text-navy-900">
                  {formatCurrencyWithSymbol(invoice.grand_total, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-navy-700" />
            <h3 className="text-sm font-bold text-gray-900">
              Itemized Fee Details ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h3>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            Active Currency: {currency} ({currencySymbol})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Student Name / Description</th>
                <th className="py-3 px-4 text-center w-24">Qty</th>
                <th className="py-3 px-4 text-right w-36">Fee / Amount</th>
                <th className="py-3 px-4 text-right w-36">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4 text-xs font-mono text-gray-400">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-gray-900">
                    {item.description}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-gray-700">
                    {item.quantity}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                    {formatCurrencyWithSymbol(item.unit_price, currency)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                    {formatCurrencyWithSymbol(item.line_total, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="p-6 bg-gray-50/60 border-t border-gray-200 flex flex-col md:flex-row justify-between gap-6">
          <div className="max-w-md space-y-1.5">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Notes &amp; Remittance Guidelines
            </h4>
            <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
              {invoice.notes || 'Payment must reference this invoice number.'}
            </p>
          </div>

          <div className="w-full md:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-900 font-mono">
                {formatCurrencyWithSymbol(invoice.subtotal, currency)}
              </span>
            </div>

            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>Discount Amount:</span>
                <span className="font-semibold font-mono">
                  - {formatCurrencyWithSymbol(invoice.discount_amount, currency)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>GST {isGstApplied ? `(${invoice.gst_percent}%)` : '(Optional)'}:</span>
              <span className="font-semibold text-gray-900 font-mono">
                {isGstApplied
                  ? `+ ${formatCurrencyWithSymbol(invoice.gst_amount, currency)}`
                  : '0.00'}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline font-bold">
              <span className="text-gray-900 text-sm">Grand Total ({currency}):</span>
              <span className="text-lg font-mono text-navy-900">
                {formatCurrencyWithSymbol(invoice.grand_total, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl space-y-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">
              Delete Company Invoice?
            </h3>
            <p className="text-sm text-gray-500">
              Are you sure you want to permanently delete draft invoice{' '}
              <span className="font-semibold text-gray-900">{invoice.invoice_no}</span>?
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => setIsDeleting(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition flex items-center gap-1.5"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
