'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { cancelInvoice } from '@/lib/rpc/financial'
import { invalidateAfterInvoiceCancelled } from '@/lib/rpc/invalidation'
import { formatCurrency } from '@/lib/utils/currency'
import { StatusBadge, type StatusType } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  FileSpreadsheet,
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Download,
  Edit2,
  XCircle,
  Loader2,
} from 'lucide-react'
import type { Invoice, InvoiceStatus } from '@/types/database'

const PAGE_SIZE = 25

export function InvoiceList() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null)

  // Debounce search query (~300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Server-side paginated and filtered query joined with invoice_balances
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: queryKeys.invoices.list({ page, search: debouncedSearch, status: statusFilter }),
    queryFn: async () => {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('invoices')
        .select(`
          *,
          students (
            id,
            name,
            admission_no,
            phone
          ),
          enrollments (
            id,
            courses (
              id,
              name
            )
          ),
          course_terms (
            id,
            term_label
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (debouncedSearch) {
        query = query.or(
          `invoice_no.ilike.%${debouncedSearch}%,students.name.ilike.%${debouncedSearch}%,students.admission_no.ilike.%${debouncedSearch}%`
        )
      }

      const { data: rawInvoices, count, error } = await query.range(from, to)
      if (error) throw error

      const invoiceIds = (rawInvoices || []).map((i) => i.id)
      const { data: rawBalances } = await supabase
        .from('invoice_balances')
        .select('*')
        .in('invoice_id', invoiceIds.length > 0 ? invoiceIds : ['none'])

      const balancesMap = new Map((rawBalances || []).map((b: any) => [b.invoice_id, b]))

      let invoices = (rawInvoices || []).map((inv: any) => ({
        ...inv,
        invoice_balances: balancesMap.get(inv.id) || {
          invoice_id: inv.id,
          grand_total: inv.grand_total,
          amount_paid: 0,
          balance_due: inv.grand_total,
          computed_status: inv.status || 'draft',
        },
      }))

      if (statusFilter !== 'all') {
        invoices = invoices.filter((inv: any) => inv.invoice_balances?.computed_status === statusFilter)
      }

      return {
        invoices: (invoices as unknown as Invoice[]),
        totalCount: count || 0,
      }
    },
    placeholderData: keepPreviousData,
  })

  // Live Summary Overview Metrics from invoice_balances view
  const { data: metrics } = useQuery({
    queryKey: queryKeys.invoices.summaryMetrics,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_balances')
        .select('computed_status, grand_total, amount_paid, balance_due')

      if (error) throw error
      const rows = data || []

      const fullyPaid = rows.filter((r) => r.computed_status === 'paid').length
      const partial = rows.filter((r) => r.computed_status === 'partial').length
      const zeroPayment = rows.filter(
        (r) => (r.computed_status === 'sent' || r.computed_status === 'draft') && Number(r.amount_paid) === 0
      ).length
      const overdue = rows.filter((r) => r.computed_status === 'overdue').length

      const totalBilled = rows.reduce((s, r) => s + (Number(r.grand_total) || 0), 0)
      const totalCollected = rows.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0)
      const totalOutstanding = rows.reduce((s, r) => s + (Number(r.balance_due) || 0), 0)

      return { fullyPaid, partial, zeroPayment, overdue, totalBilled, totalCollected, totalOutstanding }
    },
  })

  // Cancel Invoice Mutation using RPC wrapper
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await cancelInvoice({ invoiceId: id, reason: 'Cancelled from invoice list management view' })
    },
    onSuccess: (_data, id) => {
      invalidateAfterInvoiceCancelled(queryClient, { invoiceId: id })
      success('Invoice cancelled successfully')
      setCancellingInvoice(null)
    },
    onError: (err: Error) => {
      toastError('Failed to cancel invoice', err.message)
    },
  })

  const invoices = data?.invoices || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Tax Invoices & Billing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Issue, track real-time payments, previous outstandings, and balance ledgers.
          </p>
        </div>

        <Link
          href="/invoices/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-navy-900 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </Link>
      </div>

      {/* Summary Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-2xs font-semibold text-gray-500 uppercase tracking-wider">
            Zero Payment / Pending
          </span>
          <div className="text-2xl font-bold font-mono text-gray-900 mt-1">
            {metrics?.zeroPayment ?? 0}
          </div>
          <span className="text-2xs text-gray-400">Awaiting first remittance</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-2xs font-semibold text-amber-700 uppercase tracking-wider">
            Partially Paid
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {metrics?.partial ?? 0}
          </div>
          <span className="text-2xs text-gray-400">Installments received</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-2xs font-semibold text-emerald-800 uppercase tracking-wider">
            Fully Settled
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {metrics?.fullyPaid ?? 0}
          </div>
          <span className="text-2xs text-emerald-600">Zero balance remaining</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-2xs font-semibold text-rose-700 uppercase tracking-wider">
            Overdue Invoices
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
            {metrics?.overdue ?? 0}
          </div>
          <span className="text-2xs text-gray-400">Past payment due date</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice no (e.g. AV/INV/2026-27/00001) or student name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter Badges (Read directly from computed_status in invoice_balances) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 pl-1 pr-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {['all', 'draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st)
                setPage(0)
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-navy-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No Invoices Found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              {debouncedSearch || statusFilter !== 'all'
                ? 'No invoices match the active search criteria or status filter.'
                : 'No student invoices have been generated yet. Click above to bill a term.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-2xs uppercase tracking-wider text-gray-500 font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Invoice Ref</th>
                  <th scope="col" className="px-6 py-3.5">Student / Program</th>
                  <th scope="col" className="px-6 py-3.5">Due Date</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Grand Total</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Amount Paid</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Balance Due</th>
                  <th scope="col" className="px-6 py-3.5 text-center">Computed Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((inv) => {
                  const student = inv.students
                  const course = inv.enrollments?.courses
                  const term = inv.course_terms
                  const balances = inv.invoice_balances
                  const computedStatus = balances?.computed_status || inv.status || 'draft'
                  const amountPaid = balances?.amount_paid || 0
                  const balanceDue = balances?.balance_due ?? inv.grand_total

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-navy-800">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="hover:underline hover:text-accent"
                        >
                          {inv.invoice_no}
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {student?.name || 'Unknown Student'}
                        </div>
                        <div className="text-2xs text-gray-400">
                          {student?.admission_no} • {course?.name || 'Program'} (
                          {term?.term_label || 'Term'})
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-600">
                        {new Date(inv.due_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                        {formatCurrency(inv.grand_total)}
                      </td>

                      <td className="px-6 py-4 text-right font-mono text-emerald-700 font-semibold">
                        {formatCurrency(amountPaid)}
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold">
                        <span className={balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                          {formatCurrency(balanceDue)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={computedStatus as StatusType} />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="p-1 text-gray-400 hover:text-navy-700 rounded-md transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            download
                            className="p-1 text-gray-400 hover:text-emerald-700 rounded-md transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          {inv.status !== 'cancelled' && (
                            <Link
                              href={`/invoices/${inv.id}/edit`}
                              className="p-1 text-gray-400 hover:text-navy-700 rounded-md transition-colors"
                              title="Edit Invoice"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                          )}

                          {inv.status !== 'cancelled' && (
                            <button
                              onClick={() => setCancellingInvoice(inv)}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                              title="Cancel Invoice"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
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

        {/* Server-Side Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <div className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-900">{page * PAGE_SIZE + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">
                {Math.min((page + 1) * PAGE_SIZE, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-gray-900">{totalCount}</span> invoices
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page === 0 || isPlaceholderData}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="text-xs text-gray-600 px-2">
                Page {page + 1} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages - 1 || isPlaceholderData}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Cancel Tax Invoice</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel invoice{' '}
              <span className="font-mono font-bold text-navy-900">
                {cancellingInvoice.invoice_no}
              </span>
              ? Cancelling will void the balance due in all ledgers.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setCancellingInvoice(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
              >
                Keep Active
              </button>
              <button
                onClick={() => cancelMutation.mutate(cancellingInvoice.id)}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {cancelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
