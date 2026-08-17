/**
 * AVIORA Finance & Fee Management System
 * Phase B End-to-End Verification Script
 *
 * Verifies:
 * 1. Student -> Enrollment -> Course Term -> Fee Head query flow
 * 2. Calling create_invoice RPC matching financial.ts wrapper logic
 * 3. Authoritative return values (invoice_id, invoice_no, grand_total, status)
 * 4. Idempotency key caching / replay behavior
 * 5. Exact error message propagation for invalid parameters
 * 6. Student Ledger & Dashboard reflection
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

function generateIdempotencyKey() {
  return crypto.randomUUID()
}

// Mirror financial.ts wrapper function
async function createInvoiceWrapper(params, client = supabase) {
  const { data, error } = await client.rpc('create_invoice', {
    p_student_id: params.studentId,
    p_enrollment_id: params.enrollmentId ?? null,
    p_course_term_id: params.courseTermId ?? null,
    p_quotation_id: params.quotationId ?? null,
    p_invoice_date: params.invoiceDate,
    p_due_date: params.dueDate,
    p_items: params.items,
    p_discount_amount: params.discountAmount ?? 0,
    p_scholarship_amount: params.scholarshipAmount ?? 0,
    p_coupon_amount: params.couponAmount ?? 0,
    p_gst_percent: params.gstPercent ?? 18,
    p_notes: params.notes ?? null,
    p_save_as_draft: params.saveAsDraft ?? false,
    p_idempotency_key: params.idempotencyKey ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) {
    throw new Error('Invoice creation succeeded but no record was returned.')
  }

  return {
    invoice_id: result.invoice_id,
    invoice_no: result.invoice_no,
    subtotal: Number(result.subtotal),
    previous_outstanding: Number(result.previous_outstanding),
    gst_amount: Number(result.gst_amount),
    grand_total: Number(result.grand_total),
    status: result.status,
  }
}

async function runPhaseBVerification() {
  console.log('====================================================')
  console.log('PHASE B: INVOICE CREATION VERIFICATION')
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

  // 2. Fetch an existing student and enrollment
  console.log('1. Checking Student -> Enrollment data flow...')
  const { data: students, error: studErr } = await supabase
    .from('students')
    .select(`
      id,
      name,
      admission_no,
      enrollments (
        id,
        course_id,
        current_term,
        courses (
          id,
          name,
          course_terms (
            id,
            term_no,
            term_label,
            term_fee
          )
        )
      )
    `)
    .limit(10)

  assert(!studErr, 'Fetched students list cleanly from DB')
  assert(students && students.length > 0, `Found ${students?.length} existing student(s) in system`)

  const enrolledStudent = students?.find((s) => s.enrollments && s.enrollments.length > 0)
  assert(!!enrolledStudent, `Selected enrolled student: ${enrolledStudent?.name} (${enrolledStudent?.admission_no})`)

  if (!enrolledStudent) {
    console.error('No enrolled student found in database to test Phase B.')
    process.exit(1)
  }

  const enrollment = enrolledStudent.enrollments[0]
  const courseTerm = enrollment.courses?.course_terms?.[0]

  assert(!!enrollment, `Found active enrollment ID: ${enrollment?.id}`)
  assert(!!courseTerm, `Found billing term: ${courseTerm?.term_label} (${courseTerm?.id})`)

  // 3. Test createInvoice() RPC wrapper with genuine invoice creation
  console.log('\n2. Testing createInvoice() RPC wrapper execution...')
  const idempotencyKey = generateIdempotencyKey()
  const today = new Date().toISOString().split('T')[0]
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let createdInvoiceResult = null
  try {
    createdInvoiceResult = await createInvoiceWrapper({
      studentId: enrolledStudent.id,
      enrollmentId: enrollment.id,
      courseTermId: courseTerm.id,
      invoiceDate: today,
      dueDate: dueDate,
      items: [
        {
          description: `${enrollment.courses.name} - ${courseTerm.term_label} Tuition Fee`,
          quantity: 1,
          unit_price: Number(courseTerm.term_fee) || 15000,
        },
      ],
      discountAmount: 1000,
      gstPercent: 18,
      notes: 'Test invoice generated via Phase B RPC wrapper verification.',
      saveAsDraft: false,
      idempotencyKey: idempotencyKey,
    })

    assert(!!createdInvoiceResult.invoice_id, `Created invoice_id: ${createdInvoiceResult.invoice_id}`)
    assert(!!createdInvoiceResult.invoice_no, `Generated invoice_no: ${createdInvoiceResult.invoice_no}`)
    assert(createdInvoiceResult.status === 'sent', `Returned status: ${createdInvoiceResult.status}`)
    assert(createdInvoiceResult.grand_total > 0, `Returned grand_total: ${createdInvoiceResult.grand_total}`)
  } catch (err) {
    assert(false, `createInvoice threw unexpected error: ${err.message}`)
  }

  // 4. Test Idempotency Key Replay
  console.log('\n3. Testing Idempotency Key Replay...')
  try {
    const replayedResult = await createInvoiceWrapper({
      studentId: enrolledStudent.id,
      enrollmentId: enrollment.id,
      courseTermId: courseTerm.id,
      invoiceDate: today,
      dueDate: dueDate,
      items: [
        {
          description: `${enrollment.courses.name} - ${courseTerm.term_label} Tuition Fee`,
          quantity: 1,
          unit_price: Number(courseTerm.term_fee) || 15000,
        },
      ],
      discountAmount: 1000,
      gstPercent: 18,
      notes: 'Test invoice generated via Phase B RPC wrapper verification.',
      saveAsDraft: false,
      idempotencyKey: idempotencyKey, // REUSED KEY
    })

    assert(replayedResult.invoice_id === createdInvoiceResult.invoice_id, 'Replaying with same idempotency key returns cached invoice_id')
    assert(replayedResult.invoice_no === createdInvoiceResult.invoice_no, 'Replaying with same idempotency key returns cached invoice_no')
  } catch (err) {
    assert(false, `Idempotency replay failed: ${err.message}`)
  }

  // 5. Test RPC Error Propagation
  console.log('\n4. Testing RPC Error Propagation for invalid inputs...')
  try {
    await createInvoiceWrapper({
      studentId: enrolledStudent.id,
      invoiceDate: today,
      dueDate: dueDate,
      items: [
        {
          description: 'Invalid Item',
          quantity: 1,
          unit_price: 1000,
        },
      ],
      discountAmount: 5000, // Total deductions (5000) > subtotal (1000)
      idempotencyKey: generateIdempotencyKey(),
    })
    assert(false, 'Should have thrown error when deductions exceed subtotal')
  } catch (err) {
    assert(
      err.message.includes('exceed'),
      `Exact Postgres exception string preserved: "${err.message}"`
    )
  }

  // 6. Verify Dashboard and Student Ledger Reflection
  console.log('\n5. Verifying Dashboard Summary & Student Ledger reflection...')
  const { data: ledgerData, error: ledgerErr } = await supabase.rpc('get_student_ledger', {
    p_student_id: enrolledStudent.id,
  })

  assert(!ledgerErr, 'get_student_ledger called successfully')
  assert(ledgerData.total_billed > 0, `Student ledger reflects total_billed: ${ledgerData.total_billed}`)
  assert(
    ledgerData.invoices.some((i) => i.id === createdInvoiceResult.invoice_id),
    'Newly created invoice appears in student ledger invoices list'
  )

  console.log('\n====================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhaseBVerification()
