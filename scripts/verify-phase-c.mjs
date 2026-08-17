/**
 * AVIORA Finance & Fee Management System
 * Phase C End-to-End Verification Script
 *
 * Verifies:
 * 1. Student -> Open Invoice -> Balance Preview query flow
 * 2. Calling record_payment RPC matching financial.ts wrapper logic
 * 3. Authoritative return values (payment_id, receipt_no, amount_paid, balance_due, computed_status)
 * 4. Idempotency key caching / replay behavior
 * 5. Exact overpayment rejection error message ("Payment of X exceeds the outstanding balance of Y")
 * 6. Student Ledger & Dashboard reflection
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

function generateIdempotencyKey() {
  return crypto.randomUUID()
}

// Mirror financial.ts recordPayment wrapper function
async function recordPaymentWrapper(params, client = supabase) {
  const { data, error } = await client.rpc('record_payment', {
    p_invoice_id: params.invoiceId,
    p_amount: params.amount,
    p_payment_date: params.paymentDate,
    p_payment_mode: params.paymentMode,
    p_reference_no: params.referenceNo ?? null,
    p_notes: params.notes ?? null,
    p_idempotency_key: params.idempotencyKey ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) {
    throw new Error('Payment recording succeeded but no record was returned.')
  }

  return {
    payment_id: result.payment_id,
    receipt_no: result.receipt_no,
    amount_paid: Number(result.amount_paid),
    balance_due: Number(result.balance_due),
    computed_status: result.computed_status,
  }
}

async function runPhaseCVerification() {
  console.log('====================================================')
  console.log('PHASE C: PAYMENTS VERIFICATION')
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

  // 2. Fetch student Aarav Sharma & open invoice from Phase B
  console.log('1. Checking Student -> Invoice data flow...')
  const { data: student, error: studErr } = await supabase
    .from('students')
    .select('id, name, admission_no')
    .eq('name', 'Aarav Sharma')
    .single()

  assert(!studErr && !!student, `Found student: ${student?.name} (${student?.id})`)

  const { data: openInvoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, invoice_no, grand_total, status')
    .eq('student_id', student.id)
    .neq('status', 'cancelled')

  assert(!invErr && openInvoices.length > 0, `Found ${openInvoices?.length} invoice(s) for student`)
  const targetInvoice = openInvoices[0]

  const { data: balData, error: balErr } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', targetInvoice.id)
    .single()

  assert(!balErr && !!balData, `Invoice ${targetInvoice.invoice_no} initial balance due: ₹${balData?.balance_due}`)

  // 3. Test recordPayment() RPC wrapper execution
  console.log('\n2. Testing recordPayment() RPC wrapper execution...')
  const idempotencyKey = generateIdempotencyKey()
  const today = new Date().toISOString().split('T')[0]
  const paymentAmount = 5000

  let paymentResult = null
  try {
    paymentResult = await recordPaymentWrapper({
      invoiceId: targetInvoice.id,
      amount: paymentAmount,
      paymentDate: today,
      paymentMode: 'bank_transfer',
      referenceNo: 'NEFT-99887766',
      notes: 'Phase C verification partial fee payment',
      idempotencyKey: idempotencyKey,
    })

    assert(!!paymentResult.payment_id, `Created payment_id: ${paymentResult.payment_id}`)
    assert(!!paymentResult.receipt_no, `Generated receipt_no: ${paymentResult.receipt_no}`)
    assert(paymentResult.amount_paid === 5000, `Returned amount_paid: ₹${paymentResult.amount_paid}`)
    assert(paymentResult.computed_status === 'partial', `Returned computed_status: ${paymentResult.computed_status}`)
    assert(paymentResult.balance_due === Number(balData.balance_due) - paymentAmount, `Returned remaining balance_due: ₹${paymentResult.balance_due}`)
  } catch (err) {
    assert(false, `recordPayment threw unexpected error: ${err.message}`)
  }

  // 4. Test Idempotency Key Replay
  console.log('\n3. Testing Idempotency Key Replay...')
  try {
    const replayedResult = await recordPaymentWrapper({
      invoiceId: targetInvoice.id,
      amount: paymentAmount,
      paymentDate: today,
      paymentMode: 'bank_transfer',
      referenceNo: 'NEFT-99887766',
      notes: 'Phase C verification partial fee payment',
      idempotencyKey: idempotencyKey, // REUSED KEY
    })

    assert(replayedResult.payment_id === paymentResult.payment_id, 'Replaying with same idempotency key returns cached payment_id')
    assert(replayedResult.receipt_no === paymentResult.receipt_no, 'Replaying with same idempotency key returns cached receipt_no')
  } catch (err) {
    assert(false, `Idempotency replay failed: ${err.message}`)
  }

  // 5. Test Overpayment Rejection Error Propagation
  console.log('\n4. Testing Overpayment Rejection Error Propagation...')
  const remainingBalance = paymentResult.balance_due
  const excessiveAmount = remainingBalance + 10000

  try {
    await recordPaymentWrapper({
      invoiceId: targetInvoice.id,
      amount: excessiveAmount,
      paymentDate: today,
      paymentMode: 'upi',
      idempotencyKey: generateIdempotencyKey(),
    })
    assert(false, 'Should have thrown overpayment rejection error')
  } catch (err) {
    assert(
      err.message.includes('exceeds the outstanding balance'),
      `Exact Postgres overpayment error preserved: "${err.message}"`
    )
  }

  // 6. Verify Receipt PDF record query
  console.log('\n5. Verifying Receipt PDF Record Query...')
  const { data: recData, error: recErr } = await supabase
    .from('payments')
    .select('id, receipt_no, amount, invoice_id')
    .eq('id', paymentResult.payment_id)
    .single()

  assert(!recErr && recData.amount === 5000, `Receipt record verified: ${recData?.receipt_no}`)

  // 7. Verify Student Ledger reflection
  console.log('\n6. Verifying Student Ledger & Dashboard reflection...')
  const { data: ledgerData, error: ledgerErr } = await supabase.rpc('get_student_ledger', {
    p_student_id: student.id,
  })

  assert(!ledgerErr, 'get_student_ledger called successfully')
  assert(ledgerData.total_paid === 5000, `Student ledger reflects total_paid: ₹${ledgerData.total_paid}`)
  assert(ledgerData.total_outstanding === remainingBalance, `Student ledger reflects remaining total_outstanding: ₹${ledgerData.total_outstanding}`)
  assert(
    ledgerData.payments.some((p) => p.id === paymentResult.payment_id),
    'Newly recorded payment appears in student ledger payments history'
  )

  console.log('\n====================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhaseCVerification()
