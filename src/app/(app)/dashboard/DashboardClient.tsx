'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary, type DashboardPeriod } from '@/lib/rpc/reads'
import { queryKeys } from '@/lib/query-keys'
import { formatCurrency } from '@/lib/utils/currency'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  BarChart3,
  Receipt,
  CreditCard,
  Banknote,
  GraduationCap,
  Calendar,
  ArrowRight,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'

export function DashboardClient() {
  const [period, setPeriod] = useState<DashboardPeriod>('all_time')

  // Authoritative Single Read RPC Query for Executive Dashboard
  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.dashboard(period),
    queryFn: () => getDashboardSummary(period),
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !summary) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Failed to load financial dashboard</h3>
        <p className="text-xs text-gray-500">
          {(error as Error)?.message || 'An unexpected error occurred while calling get_dashboard_summary.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Executive Financial Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Authoritative real-time financial summary powered by database read engine
          </p>
        </div>

        {/* Period Selector Toggle */}
        <div className="inline-flex p-1 bg-gray-100/80 rounded-xl border border-gray-200 shadow-2xs self-start sm:self-auto">
          <button
            onClick={() => setPeriod('this_month')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              period === 'this_month'
                ? 'bg-white text-navy-900 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setPeriod('all_time')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              period === 'all_time'
                ? 'bg-white text-navy-900 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Financial Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Billed for Period (Invoice-date based) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-gray-500">
              Total Invoiced Billed
            </span>
            <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-navy-950 font-mono">
            {formatCurrency(summary.billed_for_period)}
          </div>
          <p className="text-2xs text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gray-400" />
            Invoice-date based ({period === 'this_month' ? 'current month' : 'cumulative all time'})
          </p>
        </div>

        {/* Card 2: Collected for Period (Payment-date based) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800">
              Total Fee Collected
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono">
            {formatCurrency(summary.collected_for_period)}
          </div>
          <p className="text-2xs text-emerald-700 flex items-center gap-1 font-medium">
            <Receipt className="w-3 h-3 text-emerald-600" />
            Realized payments realized in {period === 'this_month' ? 'current month' : 'all time'}
          </p>
        </div>

        {/* Card 3: Outstanding Current (Always Live / Current) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-2xs font-bold uppercase tracking-wider text-rose-800">
                Total Balance Outstanding
              </span>
              <div
                className="group relative cursor-help"
                title="Always live across all active invoices in system. Independent of period filter."
              >
                <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700 font-mono">
            {formatCurrency(summary.outstanding_current)}
          </div>
          <p className="text-2xs text-gray-500 font-medium">
            Always live/current across all active tax invoices
          </p>
        </div>
      </div>

      {/* Invoice Status Distribution Strip (Always Live / Current) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-navy-700" />
            Live Invoice Status Counts
          </h3>
          <span className="text-2xs text-gray-400 font-mono">Real-time DB Counts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
            <span className="text-2xs font-semibold text-amber-800 block">Unpaid (Zero Payment)</span>
            <span className="text-lg font-mono font-bold text-amber-900">{summary.zero_payment_count}</span>
          </div>

          <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-200">
            <span className="text-2xs font-semibold text-sky-800 block">Partial Payment</span>
            <span className="text-lg font-mono font-bold text-sky-900">{summary.partial_count}</span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
            <span className="text-2xs font-semibold text-emerald-800 block">Fully Paid</span>
            <span className="text-lg font-mono font-bold text-emerald-900">{summary.paid_count}</span>
          </div>

          <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200">
            <span className="text-2xs font-semibold text-rose-800 block">Overdue</span>
            <span className="text-lg font-mono font-bold text-rose-900">{summary.overdue_count}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Course Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Course Breakdown & Payroll */}
        <div className="lg:col-span-2 space-y-8">
          {/* Course Program Fee Revenue Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-navy-700" />
                Course Program Fee Breakdown
              </h3>
              <span className="text-2xs text-gray-400">Authoritative RPC Data</span>
            </div>

            {summary.course_breakdown.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">
                No course breakdown data recorded for this period.
              </p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase tracking-wider text-2xs">
                    <tr>
                      <th className="px-4 py-2.5">Academic Program Track</th>
                      <th className="px-4 py-2.5 text-right">Total Billed</th>
                      <th className="px-4 py-2.5 text-right">Collected</th>
                      <th className="px-4 py-2.5 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summary.course_breakdown.map((cb, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{cb.course_name}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                          {formatCurrency(cb.billed_for_period)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                          {formatCurrency(cb.collected_for_period)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                          {formatCurrency(cb.outstanding_current)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Current Month Faculty Payroll Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-navy-700" />
                Faculty Payroll Disbursements
              </h3>
              <span className="text-2xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                Current Month Total
              </span>
            </div>

            <div className="p-4 rounded-xl bg-navy-900 text-white space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-sky-400 block">
                Total Net Salary Disbursed (Current Month)
              </span>
              <div className="text-2xl font-extrabold font-mono text-white">
                {formatCurrency(summary.current_month_payroll)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Recent Invoices & Recent Payments */}
        <div className="space-y-8">
          {/* Recent Tax Invoices Feed */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-navy-700" />
                Recent Tax Invoices
              </h3>
              <Link href="/invoices" className="text-2xs font-semibold text-accent hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {summary.recent_invoices.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">No recent invoices found.</p>
            ) : (
              <div className="space-y-3">
                {summary.recent_invoices.map((inv) => (
                  <div key={inv.id} className="p-3 rounded-lg bg-gray-50/70 border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <Link href={`/invoices/${inv.id}`} className="font-mono font-bold text-navy-900 hover:underline">
                        {inv.invoice_no}
                      </Link>
                      <span className="text-2xs text-gray-500 block">{inv.student_name || 'Enrolled Student'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-gray-900 block">{formatCurrency(inv.grand_total)}</span>
                      <span className="text-2xs text-gray-400">{inv.invoice_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payment Receipts Feed */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-700" />
                Recent Payment Receipts
              </h3>
              <Link href="/payments" className="text-2xs font-semibold text-emerald-700 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {summary.recent_payments.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">No recent payment receipts found.</p>
            ) : (
              <div className="space-y-3">
                {summary.recent_payments.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-emerald-900 block">{p.receipt_no}</span>
                      <span className="text-2xs text-gray-500">{p.student_name || 'Enrolled Student'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-700 block">{formatCurrency(p.amount)}</span>
                      <span className="text-2xs text-gray-400 font-mono">{p.payment_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
