'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { formatCurrency } from '@/lib/utils/currency'
import { Skeleton } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import {
  Banknote,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  User,
  Search,
} from 'lucide-react'
import type { Payslip, Faculty } from '@/types/database'

const PAGE_SIZE = 25
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function PayslipList() {
  const supabase = createClient()

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')

  // Fetch faculty list for filter dropdown
  const { data: facultyList } = useQuery({
    queryKey: queryKeys.faculty.filterList,
    queryFn: async () => {
      const { data } = await supabase.from('faculty').select('id, name').order('name')
      return (data || []) as Faculty[]
    },
  })

  // Paginated and filtered payslips query
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.payslips.list({ page, pageSize, facultyId: selectedFaculty, year: selectedYear }),
    queryFn: async () => {
      const from = page * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('payslips')
        .select(`
          *,
          faculty (
            id,
            name,
            designation,
            department
          )
        `, { count: 'exact' })
        .order('generated_at', { ascending: false })

      if (selectedFaculty !== 'all') {
        query = query.eq('faculty_id', selectedFaculty)
      }

      if (selectedYear !== 'all') {
        query = query.eq('year', parseInt(selectedYear))
      }

      const { data, count, error } = await query.range(from, to)
      if (error) throw error

      return {
        payslips: ((data || []) as unknown as Payslip[]),
        totalCount: count || 0,
      }
    },
    placeholderData: keepPreviousData,
  })

  const payslips = data?.payslips || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Faculty Payroll & Payslips
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate, track, and export monthly faculty salary payslips with frozen structure snapshots.
          </p>
        </div>

        <Link
          href="/payslips/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-navy-900 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Generate Payslip
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="flex flex-1 items-center gap-4">
          <div className="flex-1">
            <label className="block text-2xs font-medium text-gray-500 mb-1">
              Filter by Faculty
            </label>
            <select
              value={selectedFaculty}
              onChange={(e) => {
                setSelectedFaculty(e.target.value)
                setPage(0)
              }}
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-1.5 shadow-xs focus:ring-accent focus:border-accent"
            >
              <option value="all">All Faculty Members</option>
              {facultyList?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className="block text-2xs font-medium text-gray-500 mb-1">
              Filter by Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value)
                setPage(0)
              }}
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-1.5 shadow-xs focus:ring-accent focus:border-accent"
            >
              <option value="all">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : payslips.length === 0 ? (
          <div className="py-16 text-center">
            <Banknote className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No Payslips Generated</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              {selectedFaculty !== 'all' || selectedYear !== 'all'
                ? 'No payslips match the active faculty or year filter.'
                : 'No monthly payslips have been generated yet. Click above to generate a payslip.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-2xs uppercase tracking-wider text-gray-500 font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Payslip Ref</th>
                  <th scope="col" className="px-6 py-3.5">Faculty Member</th>
                  <th scope="col" className="px-6 py-3.5">Payroll Month</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Gross Pay</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Total Deductions</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Net Payable</th>
                  <th scope="col" className="px-6 py-3.5 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payslips.map((p) => {
                  const faculty = p.faculty
                  const monthName = MONTH_NAMES[(p.month || 1) - 1]

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-navy-800">
                        {p.payslip_no}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/faculty/${faculty?.id}`}
                          className="font-semibold text-gray-900 hover:text-accent hover:underline"
                        >
                          {faculty?.name || 'Faculty Member'}
                        </Link>
                        <div className="text-2xs text-gray-400">
                          {faculty?.designation} • {faculty?.department}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-gray-700">
                        {monthName} {p.year}
                      </td>

                      <td className="px-6 py-4 text-right font-mono text-gray-900 font-semibold">
                        {formatCurrency(p.gross_pay)}
                      </td>

                      <td className="px-6 py-4 text-right font-mono text-rose-700">
                        - {formatCurrency(p.total_deductions)}
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-navy-950">
                        {formatCurrency(p.net_pay)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <a
                          href={`/api/payslips/${p.id}/pdf`}
                          download
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 rounded-md transition-colors"
                          title="Download Payslip PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Payslip
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
          itemLabel="Payslips"
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
