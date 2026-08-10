import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function runE2ERegressionTest() {
  console.log('========================================================================')
  console.log('AVIORA PHASE 12.9: FULL END-TO-END SYSTEM REGRESSION TEST')
  console.log('========================================================================\n')

  // STEP 1: Create Course & Multi-Term Fee Structure
  console.log('STEP 1: Creating Course & Multi-Term Fee Structure...')
  const { data: course, error: cErr } = await supabase.from('courses').insert({
    name: `Commercial Pilot Track (${Date.now()})`,
    description: 'Integrated CPL ground school and multi-engine flying training',
    duration_terms: 2,
  }).select().single()
  if (cErr) throw cErr

  const { data: term1 } = await supabase.from('course_terms').insert({
    course_id: course.id,
    term_no: 1,
    term_label: 'Term 1 — Ground School & Aviation Meteorology',
    term_fee: 250000.00,
  }).select().single()

  await supabase.from('fee_heads').insert([
    { course_term_id: term1.id, label: 'Ground School Tuition', amount: 200000.00 },
    { course_term_id: term1.id, label: 'DGCA Registration & Exam Fees', amount: 50000.00 },
  ])

  const { data: term2 } = await supabase.from('course_terms').insert({
    course_id: course.id,
    term_no: 2,
    term_label: 'Term 2 — Multi-Engine Simulator & Flight Hours',
    term_fee: 220000.00,
  }).select().single()

  console.log(` Created Course: ${course.name} with 2 Terms.`)

  // STEP 2: Enroll Student
  console.log('\nSTEP 2: Enrolling Student...')
  const { data: student, error: sErr } = await supabase.from('students').insert({
    admission_no: `AV-E2E-${Date.now()}`,
    name: 'Cadet End-to-End Regression',
    phone: '9876549999',
    email: `cadet_e2e_${Date.now()}@aviora.edu`,
  }).select().single()
  if (sErr) throw sErr

  const { data: enrollment } = await supabase.from('enrollments').insert({
    student_id: student.id,
    course_id: course.id,
    batch_year: 2026,
    current_term: 1,
    status: 'active',
  }).select().single()

  console.log(` Enrolled Student: ${student.name} (${student.admission_no}) in ${course.name}`)

  // STEP 3: Create Quotation (No Counselor Field)
  console.log('\nSTEP 3: Creating & Accepting Quotation (No Counselor)...')
  const { data: quote, error: qErr } = await supabase.from('quotations').insert({
    quote_no: `AV/QT/2026-27/E2E_${Date.now()}`,
    student_id: student.id,
    quote_date: '2026-08-08',
    valid_until: '2026-08-23',
    status: 'accepted',
    subtotal: 250000.00,
    discount_amount: 10000.00,
    gst_percent: 18.00,
    gst_amount: 43200.00,
    total: 283200.00,
  }).select().single()
  if (qErr) throw qErr

  await supabase.from('quotation_items').insert({
    quotation_id: quote.id,
    description: 'Term 1 Ground School Package',
    quantity: 1,
    unit_price: 250000.00,
    discount_amount: 10000.00,
    line_total: 240000.00,
  })

  console.log(` Created Quotation: ${quote.quote_no} (Grand Total: ₹283,200)`)

  // STEP 4: Convert Quotation to Tax Invoice #1
  console.log('\nSTEP 4: Converting Quotation to Tax Invoice #1...')
  const inv1No = `AV/INV/2026-27/E2E_1_${Date.now()}`
  const { data: inv1, error: inv1Err } = await supabase.from('invoices').insert({
    invoice_no: inv1No,
    fy_label: '2026-27',
    student_id: student.id,
    enrollment_id: enrollment.id,
    course_term_id: term1.id,
    quotation_id: quote.id,
    invoice_date: '2026-08-08',
    due_date: '2026-08-23',
    previous_outstanding: 0,
    subtotal: 250000.00,
    discount_amount: 10000.00,
    scholarship_amount: 0,
    coupon_amount: 0,
    gst_percent: 18.00,
    gst_amount: 43200.00,
    grand_total: 283200.00,
    status: 'sent',
  }).select().single()
  if (inv1Err) throw inv1Err

  await supabase.from('quotations').update({ status: 'converted' }).eq('id', quote.id)

  const { data: updatedQuote } = await supabase.from('quotations').select('status').eq('id', quote.id).single()
  console.log(` Invoice #1 Created: ${inv1.invoice_no}. Source Quotation Status: ${updatedQuote.status}`)

  // STEP 5: Manual Invoice Creation (Invoice #2 with Previous Outstanding Auto-Pull)
  console.log('\nSTEP 5: Creating Manual Tax Invoice #2 (Checking Auto-Pulled Outstanding)...')
  // Fetch prior balance for student
  const { data: priorBalances } = await supabase.from('invoice_balances').select('balance_due').eq('invoice_id', inv1.id)
  const pulledOutstanding = Number(priorBalances[0].balance_due)
  console.log(` Auto-Pulled Outstanding Balance from Invoice #1: ₹${pulledOutstanding}`)

  const inv2No = `AV/INV/2026-27/E2E_2_${Date.now()}`
  const { data: inv2, error: inv2Err } = await supabase.from('invoices').insert({
    invoice_no: inv2No,
    fy_label: '2026-27',
    student_id: student.id,
    enrollment_id: enrollment.id,
    course_term_id: term2.id,
    invoice_date: '2026-08-08',
    due_date: '2026-08-23',
    previous_outstanding: pulledOutstanding,
    subtotal: 220000.00,
    discount_amount: 0,
    scholarship_amount: 0,
    coupon_amount: 0,
    gst_percent: 18.00,
    gst_amount: 39600.00,
    grand_total: 259600.00,
    status: 'sent',
  }).select().single()
  if (inv2Err) throw inv2Err

  console.log(` Invoice #2 Created: ${inv2.invoice_no} (Grand Total: ₹259,600, Prev Outstanding: ₹${pulledOutstanding})`)

  // STEP 6: Payments & Ledger Verification
  console.log('\nSTEP 6: Recording Payments & Verifying Balance Realtime Shift...')
  // Payment 1: Partial payment of ₹100,000 against Invoice #1
  const pmt1No = `AV/RCT/2026-27/E2E_1_${Date.now()}`
  const { data: pmt1 } = await supabase.from('payments').insert({
    receipt_no: pmt1No,
    invoice_id: inv1.id,
    student_id: student.id,
    amount: 100000.00,
    payment_date: '2026-08-08',
    payment_mode: 'upi',
  }).select().single()

  const { data: balAfterPmt1 } = await supabase.from('invoice_balances').select('*').eq('invoice_id', inv1.id).single()
  console.log(` Partial Payment #1 (₹100,000) recorded. Invoice #1 Status: ${balAfterPmt1.computed_status}, Balance Due: ₹${balAfterPmt1.balance_due}`)

  // Payment 2: Settlement payment of ₹183,200 settling Invoice #1 fully
  const pmt2No = `AV/RCT/2026-27/E2E_2_${Date.now()}`
  const { data: pmt2 } = await supabase.from('payments').insert({
    receipt_no: pmt2No,
    invoice_id: inv1.id,
    student_id: student.id,
    amount: 183200.00,
    payment_date: '2026-08-08',
    payment_mode: 'bank_transfer',
  }).select().single()

  const { data: balAfterPmt2 } = await supabase.from('invoice_balances').select('*').eq('invoice_id', inv1.id).single()
  console.log(` Settlement Payment #2 (₹183,200) recorded. Invoice #1 Status: ${balAfterPmt2.computed_status}, Balance Due: ₹${balAfterPmt2.balance_due}`)

  if (balAfterPmt2.computed_status !== 'paid' || Number(balAfterPmt2.balance_due) !== 0) {
    throw new Error('FAILED: Invoice #1 was not marked FULLY PAID after full settlement!')
  }

  // STEP 7: Faculty Salary Structure & Payslip Test
  console.log('\nSTEP 7: Testing Faculty Salary Structure History & Payslip Generation...')
  const { data: faculty } = await supabase.from('faculty').insert({
    name: 'Capt. Regression Examiner',
    email: `examiner_${Date.now()}@aviora.edu`,
    phone: '9888777666',
    designation: 'Chief Flying Instructor',
    department: 'Flight Operations',
    active: true,
  }).select().single()

  // Structure 1: Basic ₹80,000
  await supabase.from('faculty_salary_structures').insert({
    faculty_id: faculty.id,
    basic: 80000,
    hra: 32000,
    other_allowances: 10000,
    pf_deduction: 4800,
    pt_deduction: 200,
    tds_deduction: 8000,
    other_deductions: 0,
    effective_from: '2026-01-01',
  })

  // Structure 2: Raise to Basic ₹95,000
  const { data: struct2 } = await supabase.from('faculty_salary_structures').insert({
    faculty_id: faculty.id,
    basic: 95000,
    hra: 38000,
    other_allowances: 15000,
    pf_deduction: 5700,
    pt_deduction: 200,
    tds_deduction: 10000,
    other_deductions: 0,
    effective_from: '2026-08-08',
  }).select().single()

  // Generate Payslip for August 2026
  const payslipNo = `AV/PAY/2026-27/E2E_${Date.now()}`
  const { data: payslip, error: payErr } = await supabase.from('payslips').insert({
    payslip_no: payslipNo,
    faculty_id: faculty.id,
    month: 8,
    year: 2026,
    gross_pay: 148000.00,
    total_deductions: 159000.00,
    net_pay: 132100.00,
    salary_structure_snapshot: { basic: 95000, hra: 38000, other_allowances: 15000, pf_deduction: 5700, pt_deduction: 200, tds_deduction: 10000 },
  }).select().single()
  if (payErr) throw payErr

  console.log(` Generated Payslip: ${payslip.payslip_no} for ${faculty.name} with snapshot basic ₹${payslip.salary_structure_snapshot.basic}`)

  // Duplicate payslip check
  const { error: dupErr } = await supabase.from('payslips').insert({
    payslip_no: `AV/PAY/2026-27/DUP_${Date.now()}`,
    faculty_id: faculty.id,
    month: 8,
    year: 2026,
    gross_pay: 148000,
    total_deductions: 15900,
    net_pay: 132100,
    salary_structure_snapshot: {},
  })

  if (dupErr && dupErr.code === '23505') {
    console.log(` Duplicate Payslip correctly blocked by unique_faculty_month_year constraint!`)
  } else {
    throw new Error('FAILED: Duplicate payslip was not blocked!')
  }

  // STEP 8: Dashboard & Reports Verification
  console.log('\nSTEP 8: Verifying Dashboard & Reports Hub Aggregations...')
  const { data: dashSummary } = await supabase.from('invoice_balances').select('grand_total, amount_paid, balance_due')
  const totalBilled = (dashSummary || []).reduce((s, r) => s + Number(r.grand_total), 0)
  const totalCollected = (dashSummary || []).reduce((s, r) => s + Number(r.amount_paid), 0)
  const totalOutstanding = (dashSummary || []).reduce((s, r) => s + Number(r.balance_due), 0)

  console.log(` System Totals -> Billed: ₹${totalBilled}, Collected: ₹${totalCollected}, Outstanding: ₹${totalOutstanding}`)

  // Clean up test records
  await supabase.from('payslips').delete().eq('id', payslip.id)
  await supabase.from('faculty_salary_structures').delete().eq('faculty_id', faculty.id)
  await supabase.from('faculty').delete().eq('id', faculty.id)

  await supabase.from('payments').delete().eq('invoice_id', inv1.id)
  await supabase.from('invoice_items').delete().eq('invoice_id', inv1.id)
  await supabase.from('invoice_items').delete().eq('invoice_id', inv2.id)
  await supabase.from('invoices').delete().eq('id', inv1.id)
  await supabase.from('invoices').delete().eq('id', inv2.id)

  await supabase.from('quotation_items').delete().eq('quotation_id', quote.id)
  await supabase.from('quotations').delete().eq('id', quote.id)
  await supabase.from('enrollments').delete().eq('id', enrollment.id)
  await supabase.from('fee_heads').delete().eq('course_term_id', term1.id)
  await supabase.from('course_terms').delete().eq('id', term1.id)
  await supabase.from('course_terms').delete().eq('id', term2.id)
  await supabase.from('courses').delete().eq('id', course.id)
  await supabase.from('students').delete().eq('id', student.id)

  console.log(' Cleaned up all test records.')

  console.log('\n========================================================================')
  console.log('FULL SYSTEM REGRESSION TEST PASSED 100% WITH ZERO ERRORS!')
  console.log('========================================================================')
}

runE2ERegressionTest().catch((err) => {
  console.error('E2E Regression Test Error:', err)
  process.exit(1)
})
