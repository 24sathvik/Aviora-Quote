'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import { StatusBadge, type StatusType } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  BarChart3,
  TrendingUp,
  Receipt,
  CreditCard,
  Banknote,
  Users,
  GraduationCap,
  Calendar,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
} from 'lucide-react'
import type { Payment, Invoice } from '@/types/database'

type TimePeriod = 'this_month' | 'this_term' | 'all_time'

export function DashboardClient() {
  const supabase = createClient()
  const [period, setPeriod] = useState<TimePeriod>('all_time')

  // 1. Fee Collection Summary Metrics Query
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary', period],
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let query = supabase.from('invoices').select(`
        id,
        invoice_date,
        invoice_balances (
          grand_total,
          amount_paid,
          balance_due,
          computed_status
        )
      `)

      if (period === 'this_month') {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0]
        query = query.gte('invoice_date', startOfMonth)
      }

      const { data, error } = await query
      if (error) throw error

      const rows = data || []
      let totalBilled = 0
      let totalCollected = 0
      let totalOutstanding = 0

      rows.forEach((r: any) => {
        const bal = Array.isArray(r.invoice_balances) ? r.invoice_balances[0] : r.invoice_balances
        totalBilled += Number(bal?.grand_total) || 0
        totalCollected += Number(bal?.amount_paid) || 0
        totalOutstanding += Number(bal?.balance_due) || 0
      })

      return { totalBilled, totalCollected, totalOutstanding }
    },
  })

  // 2. Pending vs Paid Status Breakdown Query
  const { data: statusCounts, isLoading: loadingStatus } = useQuery({
    queryKey: ['dashboard-status-counts'],
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_balances')
        .select('computed_status, grand_total, amount_paid, balance_due')

      if (error) throw error
      const rows = data || []

      const paid = rows.filter((r) => r.computed_status === 'paid').length
      const partial = rows.filter((r) => r.computed_status === 'partial').length
      const pending = rows.filter(
        (r) =>
          (r.computed_status === 'sent' || r.computed_status === 'draft') &&
          Number(r.amount_paid) === 0
      ).length
      const overdue = rows.filter((r) => r.computed_status === 'overdue').length

      return { paid, partial, pending, overdue }
    },
  })

  // 3. Course-wise Fee Breakdown Query
  const { data: courseBreakdown = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['dashboard-course-breakdown'],
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          enrollments (
            courses (
              id,
              name
            )
          ),
          invoice_balances (
            grand_total,
            amount_paid,
            balance_due
          )
        `)
        .neq('status', 'cancelled')

      if (error) throw error

      const courseMap = new Map<
        string,
        { name: string; billed: number; collected: number; outstanding: number }
      >()

      ;(data || []).forEach((inv: any) => {
        const courseName = inv.enrollments?.courses?.name || 'Unassigned Track'
        const courseId = inv.enrollments?.courses?.id || 'unassigned'

        const bal = Array.isArray(inv.invoice_balances) ? inv.invoice_balances[0] : inv.invoice_balances
        const billed = Number(bal?.grand_total) || 0
        const collected = Number(bal?.amount_paid) || 0
        const outstanding = Number(bal?.balance_due) || 0

        const existing = courseMap.get(courseId) || {
          name: courseName,
          billed: 0,
          collected: 0,
          outstanding: 0,
        }

        courseMap.set(courseId, {
          name: courseName,
          billed: existing.billed + billed,
          collected: existing.collected + collected,
          outstanding: existing.outstanding + outstanding,
        })
      })

      return Array.from(courseMap.values())
    },
  })

  // 5. Faculty Payroll Summary Query
  const { data: payrollSummary, isLoading: loadingPayroll } = useQuery({
    queryKey: ['dashboard-payroll-summary'],
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      const { data, error } = await supabase
        .from('payslips')
        .select('net_pay, gross_pay, total_deductions')

      if (error) throw error

      const totalNetDisbursed = (data || []).reduce((s, p) => s + Number(p.net_pay || 0), 0)
      const countDisbursed = (data || []).length

      return { totalNetDisbursed, countDisbursed, month: currentMonth, year: currentYear }
    },
  })

  // 6. Recent Activity Feed Query (Last 10 payments & last 10 invoices)
  const { data: recentActivity, isLoading: loadingActivity } = useQuery({
    queryKey: ['dashboard-recent-activity'],
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [paymentsRes, invoicesRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, receipt_no, amount, payment_date, payment_mode, students (name)')
          .order('created_at', { ascending: false })
          .limit(10),

        supabase
          .from('invoices')
          .select('id, invoice_no, grand_total, invoice_date, status, students (name), invoice_balances(computed_status)')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      return {
        payments: (paymentsRes.data || []) as any[],
        invoices: (invoicesRes.data || []) as any[],
      }
    },
  })

  return (
    <div className="space-y-8">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Executive Financial Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time fee collections, outstanding ledgers, course performance, and payroll disbursements.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'all_time', label: 'All-Time Total' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id as TimePeriod)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                period === t.id
                  ? 'bg-navy-800 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Fee Collection Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Billed */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Invoiced Billed
            </span>
            <FileSpreadsheet className="w-5 h-5 text-navy-700" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <div className="text-2xl font-extrabold font-mono text-gray-900">
              {formatCurrency(summary?.totalBilled || 0)}
            </div>
          )}
          <span className="text-2xs text-gray-400 block">
            Aggregated gross term invoices issued
          </span>
        </div>

        {/* Total Collected */}
        <div className="bg-white p-6 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Fee Collected
            </span>
            <Receipt className="w-5 h-5 text-emerald-600" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <div className="text-2xl font-extrabold font-mono text-emerald-700">
              {formatCurrency(summary?.totalCollected || 0)}
            </div>
          )}
          <span className="text-2xs text-emerald-600 block">
            Realized bank payments & receipts
          </span>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white p-6 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Balance Outstanding
            </span>
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          {loadingSummary ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <div className="text-2xl font-extrabold font-mono text-rose-700">
              {formatCurrency(summary?.totalOutstanding || 0)}
            </div>
          )}
          <span className="text-2xs text-rose-600 block">
            Net balance due across open terms
          </span>
        </div>
      </div>

      {/* 2. Pending vs Paid Status Breakdown Strip */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-navy-700" />
          Invoice Settlement Status Breakdown
        </h3>

        {loadingStatus ? (
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-2xs font-semibold text-gray-500 uppercase block">Zero Payment</span>
              <div className="text-xl font-bold font-mono text-gray-900 mt-1">
                {statusCounts?.pending || 0}
              </div>
              <span className="text-2xs text-gray-400">Pending remittance</span>
            </div>

            <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200">
              <span className="text-2xs font-semibold text-amber-800 uppercase block">Partially Paid</span>
              <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                {statusCounts?.partial || 0}
              </div>
              <span className="text-2xs text-amber-700">Active installments</span>
            </div>

            <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="text-2xs font-semibold text-emerald-800 uppercase block">Fully Settled</span>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {statusCounts?.paid || 0}
              </div>
              <span className="text-2xs text-emerald-600">Zero balance due</span>
            </div>

            <div className="p-4 rounded-lg bg-rose-50/70 border border-rose-200">
              <span className="text-2xs font-semibold text-rose-800 uppercase block">Overdue Invoices</span>
              <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                {statusCounts?.overdue || 0}
              </div>
              <span className="text-2xs text-rose-600">Past due date</span>
            </div>
          </div>
        )}
      </div>

      {/* 3 & 4. Course Performance & Faculty Payroll Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course-wise Fee Collection */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-navy-700" />
              Course-wise Collection Breakdown
            </h3>
            <Link href="/reports" className="text-2xs font-semibold text-accent hover:underline">
              View Report →
            </Link>
          </div>

          {loadingCourses ? (
            <Skeleton className="h-48 w-full" />
          ) : courseBreakdown.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">No course data available</div>
          ) : (
            <div className="space-y-4">
              {courseBreakdown.map((c, i) => {
                const pct = c.billed > 0 ? Math.min(100, Math.round((c.collected / c.billed) * 100)) : 0

                return (
                  <div key={i} className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold text-gray-900">
                      <span>{c.name}</span>
                      <span className="font-mono text-emerald-700">{formatCurrency(c.collected)} / {formatCurrency(c.billed)}</span>
                    </div>

                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-2xs text-gray-400">
                      <span>Collection Rate: {pct}%</span>
                      <span className="text-rose-600 font-medium">Outstanding: {formatCurrency(c.outstanding)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Faculty Payroll Summary Card */}
        <div>

          {/* Faculty Payroll Summary Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-navy-700" /> Monthly Payroll Disbursed
              </span>
              {loadingPayroll ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <div className="text-xl font-bold font-mono text-navy-950">
                  {formatCurrency(payrollSummary?.totalNetDisbursed || 0)}
                </div>
              )}
              <span className="text-2xs text-gray-500 block">
                {payrollSummary?.countDisbursed || 0} Faculty Payslips Disbursed
              </span>
            </div>

            <Link
              href="/payslips"
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 rounded-lg transition-colors"
            >
              Payroll →
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Recent Activity Feed (Payments & Invoices) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Payments Feed */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Recent Payment Receipts Realized
            </h3>
            <Link href="/payments" className="text-2xs font-semibold text-emerald-700 hover:underline">
              All Receipts →
            </Link>
          </div>

          {loadingActivity ? (
            <Skeleton className="h-48 w-full" />
          ) : recentActivity?.payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">No payment receipts recorded yet</div>
          ) : (
            <div className="space-y-3">
              {recentActivity?.payments.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100/80 transition-colors text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-navy-800 block">{p.receipt_no}</span>
                    <span className="text-gray-600">{p.students?.name || 'Student'} • {p.payment_date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 block">{formatCurrency(p.amount)}</span>
                    <span className="text-2xs uppercase text-gray-400">{p.payment_mode ? p.payment_mode.replace('_', ' ') : 'BANK'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices Feed */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-navy-700" />
              Recent Tax Invoices Issued
            </h3>
            <Link href="/invoices" className="text-2xs font-semibold text-navy-700 hover:underline">
              All Invoices →
            </Link>
          </div>

          {loadingActivity ? (
            <Skeleton className="h-48 w-full" />
          ) : recentActivity?.invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">No invoices generated yet</div>
          ) : (
            <div className="space-y-3">
              {recentActivity?.invoices.map((inv: any) => {
                const compStatus = inv.invoice_balances?.computed_status || inv.status || 'draft'
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100/80 transition-colors text-xs"
                  >
                    <div>
                      <Link href={`/invoices/${inv.id}`} className="font-mono font-bold text-navy-800 hover:underline block">
                        {inv.invoice_no}
                      </Link>
                      <span className="text-gray-600">{inv.students?.name || 'Student'} • {inv.invoice_date}</span>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="font-mono font-bold text-gray-900 block">{formatCurrency(inv.grand_total)}</span>
                      <StatusBadge status={compStatus as StatusType} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
