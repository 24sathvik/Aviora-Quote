'use client'

import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import { StatusBadge, type StatusType } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Receipt,
  FileSpreadsheet,
  Plus,
  CreditCard,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react'
import type { Invoice, Payment } from '@/types/database'

interface StudentFeeLedgerSectionProps {
  studentId: string
}

export function StudentFeeLedgerSection({ studentId }: StudentFeeLedgerSectionProps) {
  const supabase = createClient()

  // 1. Fetch all invoices with invoice_balances view for this student
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['student-fee-ledger-invoices', studentId],
    queryFn: async () => {
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select(`
          *,
          enrollments (
            courses (
              id,
              name
            )
          ),
          course_terms (
            id,
            term_label
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (invError) throw invError

      const invoiceList = (invData || []) as Invoice[]
      if (invoiceList.length === 0) return []

      const invIds = invoiceList.map((i) => i.id)
      const { data: balancesData } = await supabase
        .from('invoice_balances')
        .select('*')
        .in('invoice_id', invIds)

      const balanceMap = new Map((balancesData || []).map((b) => [b.invoice_id, b]))

      return invoiceList.map((inv) => ({
        ...inv,
        invoice_balances: balanceMap.get(inv.id) || {
          invoice_id: inv.id,
          grand_total: inv.grand_total,
          amount_paid: 0,
          balance_due: inv.grand_total,
          computed_status: inv.status || 'draft',
        },
      }))
    },
  })

  // 2. Fetch all payments made by this student
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['student-fee-ledger-payments', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoices (
            id,
            invoice_no,
            enrollments (
              courses (
                name
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as Payment[]
    },
  })

  // Calculate live running totals across the whole student history
  const activeInvoices = invoices.filter((i) => i.status !== 'cancelled')
  const totalBilled = activeInvoices.reduce(
    (sum, inv) => sum + (Number(inv.invoice_balances?.grand_total) || Number(inv.grand_total) || 0),
    0
  )
  const totalPaid = activeInvoices.reduce(
    (sum, inv) => sum + (Number(inv.invoice_balances?.amount_paid) || 0),
    0
  )
  const totalOutstanding = activeInvoices.reduce(
    (sum, inv) => sum + (Number(inv.invoice_balances?.balance_due) || 0),
    0
  )

  if (loadingInvoices || loadingPayments) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden space-y-6 p-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Student Fee Ledger & Billing History</h3>
            <span className="text-2xs text-gray-400">
              Live consolidated summary across all course terms and payment receipts
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/invoices/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Issue Invoice
          </Link>

          <Link
            href={`/payments/new`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Record Payment
          </Link>
        </div>
      </div>

      {/* Running Ledger Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
          <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
            Total Lifetime Billed
          </span>
          <div className="text-xl font-bold font-mono text-gray-900 mt-1">
            {formatCurrency(totalBilled)}
          </div>
          <span className="text-2xs text-gray-400">
            {activeInvoices.length} {activeInvoices.length === 1 ? 'Invoice' : 'Invoices'} Issued
          </span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <span className="text-2xs font-semibold uppercase tracking-wider text-emerald-800">
            Total Collections Paid
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(totalPaid)}
          </div>
          <span className="text-2xs text-emerald-600">
            {payments.length} {payments.length === 1 ? 'Receipt' : 'Receipts'} Realized
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            totalOutstanding > 0
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}
        >
          <span className="text-2xs font-semibold uppercase tracking-wider text-gray-600">
            Current Outstanding Balance
          </span>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              totalOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {formatCurrency(totalOutstanding)}
          </div>
          <span className="text-2xs text-gray-500">
            {totalOutstanding === 0 ? '✓ All invoices fully settled' : 'Unpaid balance across open terms'}
          </span>
        </div>
      </div>

      {/* Sub-Section 1: Invoices Table */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-navy-700" />
          Academic Term Invoices ({invoices.length})
        </h4>

        {invoices.length === 0 ? (
          <div className="p-6 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
            No tax invoices have been generated for this student yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Invoice Ref</th>
                  <th scope="col" className="px-4 py-2.5">Course Program</th>
                  <th scope="col" className="px-4 py-2.5">Due Date</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Grand Total</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Paid</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Balance Due</th>
                  <th scope="col" className="px-4 py-2.5 text-center">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((inv) => {
                  const course = inv.enrollments?.courses
                  const term = inv.course_terms
                  const balances = inv.invoice_balances
                  const computedStatus = balances?.computed_status || inv.status || 'draft'
                  const amountPaid = balances?.amount_paid || 0
                  const balanceDue = balances?.balance_due ?? inv.grand_total

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-navy-800">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="hover:underline hover:text-accent"
                        >
                          {inv.invoice_no}
                        </Link>
                      </td>

                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {course?.name || 'Program'} {term && `(${term.term_label})`}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {new Date(inv.due_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                        {formatCurrency(inv.grand_total)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold">
                        {formatCurrency(amountPaid)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span className={balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                          {formatCurrency(balanceDue)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={computedStatus as StatusType} />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="p-1 text-gray-400 hover:text-navy-700"
                            title="View Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            download
                            className="p-1 text-gray-400 hover:text-emerald-700"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {balanceDue > 0 && inv.status !== 'cancelled' && (
                            <Link
                              href={`/payments/new?invoice_id=${inv.id}`}
                              className="px-2 py-0.5 text-2xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors"
                            >
                              Pay
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sub-Section 2: Payment Receipts History Table */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Receipt className="w-4 h-4 text-emerald-700" />
          Receipts & Realized Collections ({payments.length})
        </h4>

        {payments.length === 0 ? (
          <div className="p-6 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
            No payments have been realized for this student yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Receipt No</th>
                  <th scope="col" className="px-4 py-2.5">Payment Date</th>
                  <th scope="col" className="px-4 py-2.5">Invoice Ref</th>
                  <th scope="col" className="px-4 py-2.5">Payment Mode</th>
                  <th scope="col" className="px-4 py-2.5">Transaction Ref</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Amount Paid</th>
                  <th scope="col" className="px-4 py-2.5 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-navy-800">{p.receipt_no}</td>

                    <td className="px-4 py-3 text-gray-600">
                      {new Date(p.payment_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-4 py-3 font-mono text-2xs text-navy-700">
                      <Link
                        href={`/invoices/${p.invoice_id}`}
                        className="hover:underline hover:text-accent font-semibold"
                      >
                        {p.invoices?.invoice_no || '—'}
                      </Link>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {p.payment_mode ? p.payment_mode.replace('_', ' ') : 'BANK'}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-2xs text-gray-500">
                      {p.reference_no || 'Direct Realization'}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/payments/${p.id}/pdf`}
                        download
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 rounded-md transition-colors"
                        title="Download Receipt PDF"
                      >
                        <Download className="w-3 h-3" />
                        Receipt
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
