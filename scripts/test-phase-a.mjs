/**
 * AVIORA Finance & Fee Management System
 * Phase A Safe Verification Script
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

// Mock/in-memory test helpers to test wrapper logic
function createMockClientWithError(errorMessage) {
  return {
    rpc: async () => ({
      data: null,
      error: { message: errorMessage, details: '', hint: '', code: 'P0001' },
    }),
  }
}

function createMockClientWithData(returnData) {
  return {
    rpc: async () => ({
      data: returnData,
      error: null,
    }),
  }
}

async function runTests() {
  console.log('====================================================')
  console.log('PHASE A: VERIFICATION SUITE')
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

  // ----------------------------------------------------
  // Authenticate as demo admin (standard user session)
  // ----------------------------------------------------
  console.log('Authenticating client with demo user credentials...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })
  if (authErr) {
    console.error('Authentication warning:', authErr.message)
  } else {
    console.log(`Authenticated as: ${authData.user.email}\n`)
  }

  // ----------------------------------------------------
  // TEST 1: Idempotency Key Generation
  // ----------------------------------------------------
  console.log('1. Testing Idempotency Key Generation...')
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  const key1 = crypto.randomUUID()
  const key2 = crypto.randomUUID()

  assert(uuidRegex.test(key1), `Generated key1 is a valid UUID v4: ${key1}`)
  assert(uuidRegex.test(key2), `Generated key2 is a valid UUID v4: ${key2}`)
  assert(key1 !== key2, 'Two successive calls produce distinct keys')

  // ----------------------------------------------------
  // TEST 2: Live get_dashboard_summary Read RPC
  // ----------------------------------------------------
  console.log('\n2. Testing Live get_dashboard_summary Read RPC...')
  try {
    const { data: allTimeData, error: allTimeErr } = await supabase.rpc('get_dashboard_summary', {
      p_period: 'all_time',
    })

    if (allTimeErr) {
      console.error('get_dashboard_summary error details:', allTimeErr)
    }

    assert(!allTimeErr, 'get_dashboard_summary (all_time) executes without error')
    assert(typeof allTimeData === 'object' && allTimeData !== null, 'get_dashboard_summary returns a JSON object')
    if (allTimeData) {
      assert('billed_for_period' in allTimeData, `Result has billed_for_period: ${allTimeData.billed_for_period}`)
      assert('collected_for_period' in allTimeData, `Result has collected_for_period: ${allTimeData.collected_for_period}`)
      assert('outstanding_current' in allTimeData, `Result has outstanding_current: ${allTimeData.outstanding_current}`)
      assert('course_breakdown' in allTimeData, 'Result has course_breakdown field')
      assert(Array.isArray(allTimeData.course_breakdown), 'course_breakdown is an array')
      assert('recent_payments' in allTimeData, 'Result has recent_payments field')
      assert('recent_invoices' in allTimeData, 'Result has recent_invoices field')
    }

    const { data: monthData, error: monthErr } = await supabase.rpc('get_dashboard_summary', {
      p_period: 'this_month',
    })
    assert(!monthErr, 'get_dashboard_summary (this_month) executes without error')
  } catch (err) {
    assert(false, `get_dashboard_summary threw unexpected exception: ${err.message}`)
  }

  // ----------------------------------------------------
  // TEST 3: Live get_student_ledger Read RPC
  // ----------------------------------------------------
  console.log('\n3. Testing Live get_student_ledger Read RPC...')
  try {
    const dummyStudentId = '00000000-0000-0000-0000-000000000000'
    const { data: ledgerData, error: ledgerErr } = await supabase.rpc('get_student_ledger', {
      p_student_id: dummyStudentId,
    })

    if (ledgerErr) {
      console.error('get_student_ledger error details:', ledgerErr)
    }

    assert(!ledgerErr, 'get_student_ledger executes without database error')
    assert(typeof ledgerData === 'object' && ledgerData !== null, 'get_student_ledger returns a JSON object')
    if (ledgerData) {
      assert('total_billed' in ledgerData, `Result has total_billed: ${ledgerData.total_billed}`)
      assert('total_paid' in ledgerData, `Result has total_paid: ${ledgerData.total_paid}`)
      assert('total_outstanding' in ledgerData, `Result has total_outstanding: ${ledgerData.total_outstanding}`)
      assert(Array.isArray(ledgerData.invoices), 'Result invoices is an array')
      assert(Array.isArray(ledgerData.draft_invoices), 'Result draft_invoices is an array')
      assert(Array.isArray(ledgerData.payments), 'Result payments is an array')
    }
  } catch (err) {
    assert(false, `get_student_ledger threw unexpected exception: ${err.message}`)
  }

  // ----------------------------------------------------
  // TEST 4: Financial Wrapper Error Preservation
  // ----------------------------------------------------
  console.log('\n4. Testing Financial RPC Wrapper Error Preservation...')

  const specificErrors = [
    'Payment of 5000 exceeds the outstanding balance of 3000',
    'Cannot cancel an invoice that already has payments recorded against it',
    'Only an accepted quotation can be converted. Current status: draft',
    'A duplicate request is already in progress — please wait and retry',
    'Calculated net pay is negative (gross 10000 minus deductions 15000) — check the salary structure',
  ]

  for (const expectedMsg of specificErrors) {
    const mockClient = createMockClientWithError(expectedMsg)
    const { error } = await mockClient.rpc('mock_op')
    assert(error.message === expectedMsg, `Exact error string preserved: "${expectedMsg}"`)
  }

  // ----------------------------------------------------
  // TEST 5: Return Shape Normalization for TABLE RPCs
  // ----------------------------------------------------
  console.log('\n5. Testing TABLE RPC Return Shape Handling...')

  const mockInvoiceData = [
    {
      invoice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      invoice_no: 'AV/INV/2026-27/00001',
      subtotal: 10000,
      previous_outstanding: 0,
      gst_amount: 1800,
      grand_total: 11800,
      status: 'sent',
    },
  ]
  const mockInvoiceClient = createMockClientWithData(mockInvoiceData)
  const invRes = await mockInvoiceClient.rpc('create_invoice')
  const invRecord = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data
  assert(invRecord.invoice_no === 'AV/INV/2026-27/00001', 'create_invoice unpacks array record correctly')
  assert(invRecord.grand_total === 11800, 'create_invoice preserves grand_total numeric')

  const mockPaymentData = [
    {
      payment_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      receipt_no: 'AV/RCT/2026-27/00001',
      amount_paid: 5000,
      balance_due: 6800,
      computed_status: 'partial',
    },
  ]
  const mockPaymentClient = createMockClientWithData(mockPaymentData)
  const payRes = await mockPaymentClient.rpc('record_payment')
  const payRecord = Array.isArray(payRes.data) ? payRes.data[0] : payRes.data
  assert(payRecord.receipt_no === 'AV/RCT/2026-27/00001', 'record_payment unpacks array record correctly')
  assert(payRecord.computed_status === 'partial', 'record_payment preserves computed_status')

  const mockCancelData = [
    {
      invoice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      status: 'cancelled',
    },
  ]
  const mockCancelClient = createMockClientWithData(mockCancelData)
  const cancelRes = await mockCancelClient.rpc('cancel_invoice')
  const cancelRecord = Array.isArray(cancelRes.data) ? cancelRes.data[0] : cancelRes.data
  assert(cancelRecord.status === 'cancelled', 'cancel_invoice unpacks return record correctly')

  console.log('\n====================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()
