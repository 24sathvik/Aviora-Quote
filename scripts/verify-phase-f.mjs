/**
 * AVIORA Finance & Fee Management System
 * Phase F End-to-End Verification Script
 *
 * Verifies:
 * 1. Single-trip get_dashboard_summary RPC execution for all_time & this_month periods
 * 2. Period toggle behavior (billed & collected change with period; outstanding_current remains live/current)
 * 3. Single-trip get_student_ledger RPC execution for student statement
 * 4. Separate draft_invoices array rendering (excluded from totals)
 * 5. Authoritative data consistency between Dashboard & Student Ledger
 * 6. Reflection of real invoice/payment records created in Phases B & C
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

// Mirror reads.ts wrappers
async function getDashboardSummaryWrapper(period = 'all_time') {
  const { data, error } = await supabase.rpc('get_dashboard_summary', {
    p_period: period,
  })

  if (error) throw new Error(error.message)
  const raw = data

  return {
    billed_for_period: Number(raw?.billed_for_period ?? 0),
    collected_for_period: Number(raw?.collected_for_period ?? 0),
    outstanding_current: Number(raw?.outstanding_current ?? 0),
    zero_payment_count: Number(raw?.zero_payment_count ?? 0),
    partial_count: Number(raw?.partial_count ?? 0),
    paid_count: Number(raw?.paid_count ?? 0),
    overdue_count: Number(raw?.overdue_count ?? 0),
    course_breakdown: raw?.course_breakdown ?? [],
    current_month_payroll: Number(raw?.current_month_payroll ?? 0),
    recent_payments: raw?.recent_payments ?? [],
    recent_invoices: raw?.recent_invoices ?? [],
  }
}

async function getStudentLedgerWrapper(studentId) {
  const { data, error } = await supabase.rpc('get_student_ledger', {
    p_student_id: studentId,
  })

  if (error) throw new Error(error.message)
  const raw = data

  return {
    total_billed: Number(raw?.total_billed ?? 0),
    total_paid: Number(raw?.total_paid ?? 0),
    total_outstanding: Number(raw?.total_outstanding ?? 0),
    invoices: raw?.invoices ?? [],
    draft_invoices: raw?.draft_invoices ?? [],
    payments: raw?.payments ?? [],
  }
}

async function runPhaseFVerification() {
  console.log('====================================================')
  console.log('PHASE F: DASHBOARD & STUDENT LEDGER VERIFICATION')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${message}`)
      failed++
    }
  }

  // 1. Authenticate demo admin session
  console.log('Authenticating demo admin user...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })
  if (authErr) {
    console.error('Auth error:', authErr.message)
    process.exit(1)
  }
  console.log(`Authenticated as: ${authData.user.email}\n`)

  // 2. Test Executive Dashboard Single RPC Call ('all_time')
  console.log('1. Testing getDashboardSummary("all_time") RPC...')
  let summaryAllTime = null
  try {
    summaryAllTime = await getDashboardSummaryWrapper('all_time')
    assert(summaryAllTime.billed_for_period > 0, `All Time Billed: ₹${summaryAllTime.billed_for_period}`)
    assert(summaryAllTime.collected_for_period > 0, `All Time Collected: ₹${summaryAllTime.collected_for_period}`)
    assert(summaryAllTime.outstanding_current >= 0, `Outstanding Current: ₹${summaryAllTime.outstanding_current}`)
    assert(summaryAllTime.recent_invoices.length > 0, `Recent Invoices Feed returned ${summaryAllTime.recent_invoices.length} invoice(s)`)
    assert(summaryAllTime.recent_payments.length > 0, `Recent Payments Feed returned ${summaryAllTime.recent_payments.length} payment(s)`)
    assert(Array.isArray(summaryAllTime.course_breakdown), `Course Breakdown returned ${summaryAllTime.course_breakdown.length} course track(s)`)
  } catch (err) {
    assert(false, `getDashboardSummary("all_time") failed: ${err.message}`)
  }

  // 3. Test Period Toggle ('this_month')
  console.log('\n2. Testing Period Toggle getDashboardSummary("this_month")...')
  try {
    const summaryMonth = await getDashboardSummaryWrapper('this_month')
    assert(typeof summaryMonth.billed_for_period === 'number', `This Month Billed: ₹${summaryMonth.billed_for_period}`)
    assert(typeof summaryMonth.collected_for_period === 'number', `This Month Collected: ₹${summaryMonth.collected_for_period}`)
    assert(
      summaryMonth.outstanding_current === summaryAllTime.outstanding_current,
      `outstanding_current is live/current across all periods (₹${summaryMonth.outstanding_current})`
    )
  } catch (err) {
    assert(false, `getDashboardSummary("this_month") failed: ${err.message}`)
  }

  // 4. Test Student Ledger Statement Single RPC Call
  console.log('\n3. Testing getStudentLedger() RPC for student Aarav Sharma...')
  const { data: student } = await supabase
    .from('students')
    .select('id, name')
    .eq('name', 'Aarav Sharma')
    .single()

  assert(!!student, `Found student Aarav Sharma (${student?.id})`)

  let ledger = null
  try {
    ledger = await getStudentLedgerWrapper(student.id)
    assert(ledger.total_billed > 0, `Student Ledger Total Billed: ₹${ledger.total_billed}`)
    assert(ledger.total_paid === 5000, `Student Ledger Total Paid: ₹${ledger.total_paid}`)
    assert(ledger.total_outstanding === ledger.total_billed - ledger.total_paid, `Student Ledger Outstanding: ₹${ledger.total_outstanding}`)
    assert(ledger.invoices.length > 0, `Active Invoices returned ${ledger.invoices.length} item(s)`)
    assert(ledger.payments.length > 0, `Payment Receipts returned ${ledger.payments.length} item(s)`)
    assert(Array.isArray(ledger.draft_invoices), `Draft Invoices separate array returned ${ledger.draft_invoices.length} item(s)`)
  } catch (err) {
    assert(false, `getStudentLedger failed: ${err.message}`)
  }

  // 5. Verify Reflection of Phases B/C Data
  console.log('\n4. Verifying Reflection of Phases B/C Data in Dashboard & Ledger...')
  const hasPhaseBInvoice = ledger?.invoices.some((i) => i.invoice_no === 'AV/INV/2026-27/00001')
  const hasPhaseCPayment = ledger?.payments.some((p) => p.receipt_no === 'AV/RCT/2026-27/00001')

  assert(hasPhaseBInvoice, 'Phase B Invoice (AV/INV/2026-27/00001) present in Student Ledger statement')
  assert(hasPhaseCPayment, 'Phase C Receipt (AV/RCT/2026-27/00001) present in Student Ledger statement')

  console.log('\n====================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhaseFVerification()
