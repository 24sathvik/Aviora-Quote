'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { formatCurrency } from '@/lib/utils/currency'
import { StatusBadge, type StatusType } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  FileText,
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Download,
  Edit2,
  Loader2,
} from 'lucide-react'
import type { Quotation } from '@/types/database'

const PAGE_SIZE = 25

export function QuotationList() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deletingQuote, setDeletingQuote] = useState<Quotation | null>(null)

  // Debounce search query (~300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Server-side paginated and filtered query
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: queryKeys.quotations.list({ page, search: debouncedSearch, status: statusFilter }),
    queryFn: async () => {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('quotations')
        .select(`
          *,
          students (
            id,
            name,
            admission_no,
            phone
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (debouncedSearch) {
        query = query.or(
          `quote_no.ilike.%${debouncedSearch}%,lead_name.ilike.%${debouncedSearch}%,lead_phone.ilike.%${debouncedSearch}%`
        )
      }

      const { data: quotes, count, error } = await query.range(from, to)
      if (error) throw error

      return {
        quotations: (quotes || []) as Quotation[],
        totalCount: count || 0,
      }
    },
    placeholderData: keepPreviousData,
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotations').delete().eq('id', id)
      if (error) throw error
    },
    onError: (err: Error) => {
      toastError('Failed to delete quotation', err.message)
    },
    onSuccess: () => {
      success('Quotation removed')
      setDeletingQuote(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all, refetchType: 'all' })
    },
  })

  const quotations = data?.quotations || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Fee Quotations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate, track, and convert itemized program quotations for students and prospects.
          </p>
        </div>

        <Link
          href="/quotations/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-navy-900 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Quotation
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by quote number (e.g. AV/QT/00001) or prospect name..."
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

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 pl-1 pr-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {['all', 'draft', 'sent', 'accepted', 'expired', 'converted'].map((st) => (
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

      {/* Quotations Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No Quotations Found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              {debouncedSearch || statusFilter !== 'all'
                ? 'No quotations match the active search query or status filter.'
                : 'No fee quotations have been generated yet. Click above to create one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-2xs uppercase tracking-wider text-gray-500 font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Quote Ref</th>
                  <th scope="col" className="px-6 py-3.5">Recipient</th>
                  <th scope="col" className="px-6 py-3.5">Date Issued</th>
                  <th scope="col" className="px-6 py-3.5">Valid Until</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Total Amount</th>
                  <th scope="col" className="px-6 py-3.5 text-center">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotations.map((q) => {
                  const recipientName = q.students?.name || q.lead_name || 'Unnamed Prospect'
                  const recipientPhone = q.students?.phone || q.lead_phone

                  return (
                    <tr key={q.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-navy-800">
                        <Link
                          href={`/quotations/${q.id}`}
                          className="hover:underline hover:text-accent"
                        >
                          {q.quote_no}
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{recipientName}</div>
                        <div className="text-2xs text-gray-400">
                          {q.students ? (
                            <span>Student Ref: {q.students.admission_no}</span>
                          ) : (
                            <span>Prospect: {recipientPhone || 'No phone'}</span>
                          )}
                        </div>
                      </td>



                      <td className="px-6 py-4 text-xs text-gray-600">
                        {new Date(q.quote_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-600">
                        {q.valid_until ? (
                          new Date(q.valid_until).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-gray-400">15 Days</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                        {formatCurrency(q.total)}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={q.status as StatusType} />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/quotations/${q.id}`}
                            className="p-1 text-gray-400 hover:text-navy-700 rounded-md transition-colors"
                            title="View Quotation"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <a
                            href={`/api/quotations/${q.id}/pdf`}
                            download
                            className="p-1 text-gray-400 hover:text-emerald-700 rounded-md transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <Link
                            href={`/quotations/${q.id}/edit`}
                            className="p-1 text-gray-400 hover:text-navy-700 rounded-md transition-colors"
                            title="Edit Quotation"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => setDeletingQuote(q)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                            title="Delete Quotation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <div className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-900">{page * PAGE_SIZE + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">
                {Math.min((page + 1) * PAGE_SIZE, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-gray-900">{totalCount}</span> quotations
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

      {/* Delete Confirmation Modal */}
      {deletingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete Fee Quotation</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete quotation{' '}
              <span className="font-mono font-bold text-navy-900">{deletingQuote.quote_no}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setDeletingQuote(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingQuote.id)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
