import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testInvoiceFormQueries() {
  console.log('====================================================')
  console.log('TESTING INVOICE FORM STUDENT RETRIEVAL & AUTO-PULL')
  console.log('====================================================\n')

  // 1. Create a test student, course, course term, fee heads, and enrollment
  const { data: student } = await supabase
    .from('students')
    .insert({
      admission_no: `AV-12.4-${Date.now()}`,
      name: 'Invoice Form Test Cadet',
      phone: '9988112233',
    })
    .select()
    .single()

  const { data: course } = await supabase
    .from('courses')
    .insert({
      name: 'Integrated CPL & Multi-Engine Track',
      description: 'DGCA CPL with Multi-Engine rating',
      duration_terms: 2,
    })
    .select()
    .single()

  const { data: term1 } = await supabase
    .from('course_terms')
    .insert({
      course_id: course.id,
      term_no: 1,
      term_label: 'Term 1 — Ground School & Pre-Flight',
      term_fee: 250000.00,
    })
    .select()
    .single()

  await supabase.from('fee_heads').insert([
    { course_term_id: term1.id, label: 'Ground School Tuition Fee', amount: 180000.00 },
    { course_term_id: term1.id, label: 'DGCA Exam & Medical Registration', amount: 70000.00 },
  ])

  const { data: enrollment } = await supabase
    .from('enrollments')
    .insert({
      student_id: student.id,
      course_id: course.id,
      batch_year: 2026,
      current_term: 1,
      status: 'active',
    })
    .select()
    .single()

  console.log(` 1. Setup Complete: Student ${student.name}, Course ${course.name}, Enrollment ID ${enrollment.id}`)

  // 2. Test Fixed Student Enrollments Query (selecting fee_heads(id, label, amount))
  console.log('\n--- Testing Fixed Student Enrollments Query ---')
  const { data: studentEnrollments, error: enrollErr } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      course_id,
      batch_year,
      current_term,
      courses (
        id,
        name,
        duration_terms,
        course_terms (
          id,
          term_no,
          term_label,
          term_fee,
          fee_heads (
            id,
            label,
            amount
          )
        )
      )
    `)
    .eq('student_id', student.id)

  if (enrollErr) {
    console.error('ENROLLMENTS QUERY FAILED:', enrollErr)
    throw enrollErr
  }
  console.log(` Student Enrollments Query returned ${studentEnrollments.length} enrollment record:`)
  console.log(JSON.stringify(studentEnrollments, null, 2))

  // 3. Test Fixed Previous Outstanding Auto-Pull Query
  console.log('\n--- Testing Fixed Previous Outstanding Query ---')
  // Insert an unpaid invoice for this student to verify auto-pull
  const { data: priorInv } = await supabase.from('invoices').insert({
    invoice_no: `AV/INV/2026-27/PRIOR_${Date.now()}`,
    fy_label: '2026-27',
    student_id: student.id,
    invoice_date: '2026-08-01',
    due_date: '2026-08-15',
    subtotal: 50000,
    discount_amount: 0,
    gst_percent: 0,
    gst_amount: 0,
    grand_total: 50000,
    status: 'sent',
  }).select().single()

  const { data: priorInvoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('student_id', student.id)
    .neq('status', 'cancelled')

  const priorIds = (priorInvoices || []).map((i) => i.id)
  const { data: priorBalances, error: balErr } = await supabase
    .from('invoice_balances')
    .select('balance_due')
    .in('invoice_id', priorIds.length > 0 ? priorIds : ['none'])

  if (balErr) throw balErr

  const autoPulledOutstanding = (priorBalances || []).reduce(
    (sum, b) => sum + Math.max(0, Number(b.balance_due) || 0),
    0
  )

  console.log(` Auto-Pulled Previous Outstanding: ₹${autoPulledOutstanding}`)
  if (autoPulledOutstanding !== 50000) {
    throw new Error(`Expected auto-pulled outstanding ₹50,000, got ₹${autoPulledOutstanding}`)
  }

  // Cleanup
  await supabase.from('invoices').delete().eq('id', priorInv.id)
  await supabase.from('enrollments').delete().eq('id', enrollment.id)
  await supabase.from('fee_heads').delete().eq('course_term_id', term1.id)
  await supabase.from('course_terms').delete().eq('id', term1.id)
  await supabase.from('courses').delete().eq('id', course.id)
  await supabase.from('students').delete().eq('id', student.id)
  console.log('\n Cleaned up test records.')

  console.log('\n====================================================')
  console.log('INVOICE FORM RETRIEVAL & AUTO-PULL QUERIES VERIFIED!')
  console.log('====================================================')
}

testInvoiceFormQueries().catch((err) => {
  console.error('Invoice Form Test Error:', err)
  process.exit(1)
})
