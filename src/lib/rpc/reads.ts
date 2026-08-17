/**
 * AVIORA Finance & Fee Management System
 * Optimized Read RPC Client Layer
 *
 * Provides typed wrappers for server-side aggregated read RPCs:
 * - get_dashboard_summary: single-trip aggregated dashboard metrics
 * - get_student_ledger: single-trip full financial statement for a student
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// 1. GET DASHBOARD SUMMARY
// ============================================================================

export type DashboardPeriod = 'all_time' | 'this_month'

export interface DashboardCourseBreakdown {
  course_name: string
  billed_for_period: number
  collected_for_period: number
  outstanding_current: number
}

export interface DashboardRecentPayment {
  id: string
  receipt_no: string
  amount: number
  payment_date: string
  student_name: string | null
}

export interface DashboardRecentInvoice {
  id: string
  invoice_no: string
  grand_total: number
  invoice_date: string
  student_name: string | null
}

export interface DashboardSummaryResult {
  billed_for_period: number
  collected_for_period: number
  outstanding_current: number
  zero_payment_count: number
  partial_count: number
  paid_count: number
  overdue_count: number
  course_breakdown: DashboardCourseBreakdown[]
  current_month_payroll: number
  recent_payments: DashboardRecentPayment[]
  recent_invoices: DashboardRecentInvoice[]
}

/**
 * Calls the `get_dashboard_summary` database RPC.
 */
export async function getDashboardSummary(
  period: DashboardPeriod = 'all_time',
  client?: SupabaseClient
): Promise<DashboardSummaryResult> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase.rpc('get_dashboard_summary', {
    p_period: period,
  })

  if (error) {
    throw new Error(error.message)
  }

  const raw = data as Record<string, any>

  return {
    billed_for_period: Number(raw?.billed_for_period ?? 0),
    collected_for_period: Number(raw?.collected_for_period ?? 0),
    outstanding_current: Number(raw?.outstanding_current ?? 0),
    zero_payment_count: Number(raw?.zero_payment_count ?? 0),
    partial_count: Number(raw?.partial_count ?? 0),
    paid_count: Number(raw?.paid_count ?? 0),
    overdue_count: Number(raw?.overdue_count ?? 0),
    course_breakdown: (raw?.course_breakdown ?? []).map((item: any) => ({
      course_name: String(item.course_name ?? 'Unassigned'),
      billed_for_period: Number(item.billed_for_period ?? 0),
      collected_for_period: Number(item.collected_for_period ?? 0),
      outstanding_current: Number(item.outstanding_current ?? 0),
    })),
    current_month_payroll: Number(raw?.current_month_payroll ?? 0),
    recent_payments: (raw?.recent_payments ?? []).map((p: any) => ({
      id: String(p.id),
      receipt_no: String(p.receipt_no),
      amount: Number(p.amount ?? 0),
      payment_date: String(p.payment_date),
      student_name: p.student_name ? String(p.student_name) : null,
    })),
    recent_invoices: (raw?.recent_invoices ?? []).map((i: any) => ({
      id: String(i.id),
      invoice_no: String(i.invoice_no),
      grand_total: Number(i.grand_total ?? 0),
      invoice_date: String(i.invoice_date),
      student_name: i.student_name ? String(i.student_name) : null,
    })),
  }
}

// ============================================================================
// 2. GET STUDENT LEDGER
// ============================================================================

export interface StudentLedgerInvoice {
  id: string
  invoice_no: string
  invoice_date: string
  grand_total: number
  amount_paid: number
  balance_due: number
  computed_status: string
}

export interface StudentLedgerDraftInvoice {
  id: string
  invoice_no: string
  invoice_date: string
  grand_total: number
}

export interface StudentLedgerPayment {
  id: string
  receipt_no: string
  amount: number
  payment_date: string
  payment_mode: string
  invoice_no: string
}

export interface StudentLedgerResult {
  total_billed: number
  total_paid: number
  total_outstanding: number
  invoices: StudentLedgerInvoice[]
  draft_invoices: StudentLedgerDraftInvoice[]
  payments: StudentLedgerPayment[]
}

/**
 * Calls the `get_student_ledger` database RPC.
 */
export async function getStudentLedger(
  studentId: string,
  client?: SupabaseClient
): Promise<StudentLedgerResult> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase.rpc('get_student_ledger', {
    p_student_id: studentId,
  })

  if (error) {
    throw new Error(error.message)
  }

  const raw = data as Record<string, any>

  return {
    total_billed: Number(raw?.total_billed ?? 0),
    total_paid: Number(raw?.total_paid ?? 0),
    total_outstanding: Number(raw?.total_outstanding ?? 0),
    invoices: (raw?.invoices ?? []).map((inv: any) => ({
      id: String(inv.id),
      invoice_no: String(inv.invoice_no),
      invoice_date: String(inv.invoice_date),
      grand_total: Number(inv.grand_total ?? 0),
      amount_paid: Number(inv.amount_paid ?? 0),
      balance_due: Number(inv.balance_due ?? 0),
      computed_status: String(inv.computed_status ?? 'sent'),
    })),
    draft_invoices: (raw?.draft_invoices ?? []).map((d: any) => ({
      id: String(d.id),
      invoice_no: String(d.invoice_no),
      invoice_date: String(d.invoice_date),
      grand_total: Number(d.grand_total ?? 0),
    })),
    payments: (raw?.payments ?? []).map((p: any) => ({
      id: String(p.id),
      receipt_no: String(p.receipt_no),
      amount: Number(p.amount ?? 0),
      payment_date: String(p.payment_date),
      payment_mode: String(p.payment_mode ?? 'cash'),
      invoice_no: String(p.invoice_no ?? ''),
    })),
  }
}
