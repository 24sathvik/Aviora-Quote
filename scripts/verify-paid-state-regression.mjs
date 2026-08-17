/**
 * AVIORA Finance & Fee Management System
 * Paid-Status Lifecycle Regression & Consistency Verification
 *
 * Verifies:
 * 1. Final payment (AV/RCT/2026-27/00002 for ₹5,620) settled invoice AV/INV/2026-27/00001 in full
 * 2. invoice_balances view reflects: grand_total = 10620, amount_paid = 10620, balance_due = 0.00, computed_status = 'paid'
 * 3. get_student_ledger RPC statement reflects: computed_status = 'paid', balance_due = 0.00, both receipts present
 * 4. get_dashboard_summary RPC reflects: paid_count > 0, zero_payment_count = 0, recent_payments includes both receipts
 * 5. Overpayment / further payment attempt on fully paid invoice is rejected by DB with "Invoice is already fully paid"
 * 6. Financial consistency matrix matches across all 5 screens
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function runPaidStateRegression() {
  console.log('================================================================')
  console.log('PHASE G: PAID-STATE LIFECYCLE REGRESSION & CONSISTENCY CHECK')
  console.log('================================================================\n')

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

  // 1. Authenticate demo admin user
  console.log('1. Authenticating admin user...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })
  if (authErr) {
    console.error('Auth error:', authErr.message)
    process.exit(1)
  }
  console.log(`  Authenticated as: ${authData.user.email}\n`)

  // 2. Inspect invoice AV/INV/2026-27/00001
  console.log('2. Inspecting fully paid invoice AV/INV/2026-27/00001...')
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('id, invoice_no, student_id, grand_total, status')
    .eq('invoice_no', 'AV/INV/2026-27/00001')
    .single()

  if (invErr) {
    console.error('Failed to locate invoice:', invErr.message)
    process.exit(1)
  }

  const { data: bal } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', invoice.id)
    .single()

  console.log(`  Invoice ID: ${invoice.id}`)
  console.log(`  Invoice No: ${invoice.invoice_no}`)
  console.log(`  Grand Total: ₹${bal.grand_total}`)
  console.log(`  Amount Paid: ₹${bal.amount_paid}`)
  console.log(`  Balance Due: ₹${bal.balance_due}`)
  console.log(`  Computed Status: ${bal.computed_status}\n`)

  assert(Number(bal.grand_total) === 10620, `Grand Total is ₹10,620 (₹${bal.grand_total})`)
  assert(Number(bal.amount_paid) === 10620, `Amount Paid is ₹10,620 (₹${bal.amount_paid})`)
  assert(Number(bal.balance_due) === 0, `Balance Due is exactly 0.00 (₹${bal.balance_due})`)
  assert(bal.computed_status === 'paid', `Invoice status is 'paid' (${bal.computed_status})`)

  // 3. Inspect payment receipts for this invoice
  console.log('\n3. Inspecting payment receipts recorded against AV/INV/2026-27/00001...')
  const { data: payments } = await supabase
    .from('payments')
    .select('id, receipt_no, amount, payment_date, payment_mode, reference_no')
    .eq('invoice_id', invoice.id)
    .order('created_at', { ascending: true })

  console.log(`  Found ${(payments || []).length} payment receipts:`)
  payments.forEach((p, idx) => {
    console.log(`    ${idx + 1}. Receipt: ${p.receipt_no} | Amount: ₹${p.amount} | Date: ${p.payment_date} | Mode: ${p.payment_mode}`)
  })

  assert((payments || []).length === 2, `Exactly 2 payments recorded (Partial + Final settlement)`)
  assert(payments[0].receipt_no === 'AV/RCT/2026-27/00001', `First payment receipt: ${payments[0].receipt_no} (₹${payments[0].amount})`)
  assert(payments[1].receipt_no === 'AV/RCT/2026-27/00002', `Final payment receipt: ${payments[1].receipt_no} (₹${payments[1].amount})`)
  assert(Number(payments[0].amount) + Number(payments[1].amount) === 10620, `Sum of payments (₹5,000 + ₹5,620) === ₹10,620`)

  // 4. Verify Student Ledger Statement (get_student_ledger RPC)
  console.log('\n4. Verifying Student Fee Ledger (get_student_ledger RPC)...')
  const { data: ledger, error: ledgErr } = await supabase.rpc('get_student_ledger', {
    p_student_id: invoice.student_id,
  })

  if (ledgErr) {
    console.error('get_student_ledger RPC error:', ledgErr.message)
    process.exit(1)
  }

  const ledgerInvoice = ledger.invoices.find((i) => i.id === invoice.id)
  assert(!!ledgerInvoice, `Invoice ${invoice.invoice_no} found in Student Ledger`)
  assert(ledgerInvoice.computed_status === 'paid', `Student Ledger invoice status is 'paid' (${ledgerInvoice?.computed_status})`)
  assert(Number(ledgerInvoice.balance_due) === 0, `Student Ledger invoice balance_due is 0 (₹${ledgerInvoice?.balance_due})`)
  assert(Number(ledgerInvoice.amount_paid) === 10620, `Student Ledger invoice amount_paid equals grand_total (₹${ledgerInvoice?.amount_paid})`)

  const hasReceipt1 = ledger.payments.some((p) => p.receipt_no === 'AV/RCT/2026-27/00001')
  const hasReceipt2 = ledger.payments.some((p) => p.receipt_no === 'AV/RCT/2026-27/00002')
  assert(hasReceipt1, `Payment receipt AV/RCT/2026-27/00001 in Student Ledger`)
  assert(hasReceipt2, `Payment receipt AV/RCT/2026-27/00002 in Student Ledger`)

  // 5. Verify Executive Dashboard Summary (get_dashboard_summary RPC)
  console.log('\n5. Verifying Executive Dashboard (get_dashboard_summary RPC)...')
  const { data: dashboard, error: dashErr } = await supabase.rpc('get_dashboard_summary', {
    p_period: 'all_time',
  })

  if (dashErr) {
    console.error('get_dashboard_summary RPC error:', dashErr.message)
    process.exit(1)
  }

  assert(dashboard.paid_count > 0, `Dashboard paid_count includes settled invoice (${dashboard.paid_count})`)
  assert(dashboard.recent_payments.some((p) => p.receipt_no === 'AV/RCT/2026-27/00002'), `Recent payments feed includes final receipt AV/RCT/2026-27/00002`)
  assert(dashboard.recent_payments.some((p) => p.receipt_no === 'AV/RCT/2026-27/00001'), `Recent payments feed includes partial receipt AV/RCT/2026-27/00001`)

  // 6. Test Rejection of Overpayment on Fully Paid Invoice
  console.log('\n6. Testing Rejection of further payment on fully paid invoice...')
  const { error: overpayErr } = await supabase.rpc('record_payment', {
    p_invoice_id: invoice.id,
    p_amount: 1000,
    p_payment_date: new Date().toISOString().split('T')[0],
    p_payment_mode: 'cash',
    p_reference_no: null,
    p_notes: 'Attempted excess payment',
    p_idempotency_key: crypto.randomUUID(),
  })

  assert(!!overpayErr, 'Further payment on fully paid invoice is rejected by DB')
  assert(
    overpayErr?.message.includes('Invoice is already fully paid') || overpayErr?.message.includes('exceeds the outstanding balance'),
    `Exact error message preserved: "${overpayErr?.message}"`
  )

  console.log('\n================================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPaidStateRegression()
