'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { formatCurrency } from '@/lib/utils/currency'
import { Skeleton } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import {
  Receipt,
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  CreditCard,
  Building2,
  QrCode,
  Banknote,
} from 'lucide-react'
import type { Payment, PaymentMode } from '@/types/database'

const PAGE_SIZE = 25

export function PaymentList() {
  const supabase = createClient()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [modeFilter, setModeFilter] = useState<string>('all')

  // Debounce search query (~300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Server-side paginated and filtered payments query
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.payments.list({ page, pageSize, search: debouncedSearch, mode: modeFilter }),
    queryFn: async () => {
      const from = page * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('payments')
        .select(`
          *,
          students (
            id,
            name,
            admission_no,
            phone
          ),
          invoices (
            id,
            invoice_no,
            grand_total,
            enrollments (
              courses (
                name
              )
            )
          )
        `, { count: 'exact' })
        .order('payment_date', { ascending: false })

      if (modeFilter !== 'all') {
        query = query.eq('payment_mode', modeFilter)
      }

      if (debouncedSearch) {
        query = query.or(
          `receipt_no.ilike.%${debouncedSearch}%,reference_no.ilike.%${debouncedSearch}%,student_name_snapshot.ilike.%${debouncedSearch}%,students.name.ilike.%${debouncedSearch}%,students.admission_no.ilike.%${debouncedSearch}%`
        )
      }

      const { data, count, error } = await query.range(from, to)
      if (error) throw error

      return {
        payments: ((data || []) as unknown as Payment[]),
        totalCount: count || 0,
      }
    },
    placeholderData: keepPreviousData,
  })

  const payments = data?.payments || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Payment Receipts & Collections
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Immutable fee payment records, bank transactions, and generated receipts.
          </p>
        </div>

        <Link
          href="/payments/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-emerald-800 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </Link>
      </div>

      {/* Search & Mode Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by receipt no (e.g. AV/RCT/2026-27/00001), UTR, or student name..."
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

        {/* Mode Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 pl-1 pr-1">
            <Filter className="w-3 h-3" /> Mode:
          </span>
          {[
            { id: 'all', label: 'All Modes' },
            { id: 'bank_transfer', label: 'Bank Transfer' },
            { id: 'upi', label: 'UPI' },
            { id: 'cheque', label: 'Cheque' },
            { id: 'cash', label: 'Cash' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setModeFilter(mode.id)
                setPage(0)
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                modeFilter === mode.id
                  ? 'bg-navy-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No Payment Records Found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              {debouncedSearch || modeFilter !== 'all'
                ? 'No payments match the search criteria or mode filter.'
                : 'No student payments have been recorded yet. Click above to record a fee receipt.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-2xs uppercase tracking-wider text-gray-500 font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Receipt No</th>
                  <th scope="col" className="px-6 py-3.5">Student</th>
                  <th scope="col" className="px-6 py-3.5">Invoice Applied</th>
                  <th scope="col" className="px-6 py-3.5">Payment Date</th>
                  <th scope="col" className="px-6 py-3.5">Payment Mode</th>
                  <th scope="col" className="px-6 py-3.5">Transaction Ref</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Amount Paid</th>
                  <th scope="col" className="px-6 py-3.5 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((p) => {
                  const student = p.students
                  const invoice = p.invoices

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-navy-800">
                        {p.receipt_no}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {student?.name || p.student_name_snapshot || 'Enrolled Student'}
                          {!student && p.student_name_snapshot && (
                            <span className="text-2xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-normal border border-gray-200">
                              Deleted
                            </span>
                          )}
                        </div>
                        <div className="text-2xs text-gray-400">
                          {student?.admission_no ? `${student.admission_no} • ` : ''}
                          {student?.phone || 'N/A'}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-navy-700">
                        <Link
                          href={`/invoices/${invoice?.id}`}
                          className="hover:underline hover:text-accent font-semibold"
                        >
                          {invoice?.invoice_no || '—'}
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-600">
                        {new Date(p.payment_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {p.payment_mode ? p.payment_mode.replace('_', ' ') : 'BANK TRANSFER'}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono text-2xs text-gray-500">
                        {p.reference_no || 'Direct'}
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(p.amount)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <a
                          href={`/api/payments/${p.id}/pdf`}
                          download
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 rounded-md transition-colors"
                          title="Download Receipt PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Receipt
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination */}
        <Pagination
          totalCount={totalCount}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="Payment Receipts"
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
