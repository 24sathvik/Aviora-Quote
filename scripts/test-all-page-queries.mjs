import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function testAllPages() {
  console.log('=== LOGGING IN AS ADMIN ===')
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })
  if (authErr) {
    console.error('Auth error:', authErr.message)
    return
  }

  console.log('1. /students query:')
  const { data: students, count: stCount, error: stErr } = await supabase
    .from('students')
    .select('*', { count: 'exact' })
    .range(0, 14)
  console.log('  Students count:', stCount, 'Data:', students)

  console.log('\n2. /courses query:')
  const { data: courses, count: cCount, error: cErr } = await supabase
    .from('courses')
    .select('id, name, description, duration_terms, created_at, course_terms(id, term_no, term_label, term_fee)')
    .order('created_at', { ascending: false })
  console.log('  Courses count:', courses?.length, 'Data:', courses)

  console.log('\n3. /quotations query:')
  const { data: quotes, count: qCount } = await supabase
    .from('quotations')
    .select('*, students(id, name, admission_no, phone)', { count: 'exact' })
    .range(0, 14)
  console.log('  Quotations count:', qCount, 'Data:', quotes)

  console.log('\n4. /invoices query:')
  const { data: invoices, count: invCount } = await supabase
    .from('invoices')
    .select('*, students(id, name, admission_no, phone)', { count: 'exact' })
    .range(0, 14)
  console.log('  Invoices count:', invCount, 'Data:', invoices)

  console.log('\n5. /payments query:')
  const { data: payments, count: pCount } = await supabase
    .from('payments')
    .select('*, invoices(id, invoice_no, student_id, grand_total, students(id, name, admission_no))', { count: 'exact' })
    .range(0, 14)
  console.log('  Payments count:', pCount, 'Data:', payments)

  console.log('\n6. /faculty query:')
  const { data: faculty, count: fCount } = await supabase
    .from('faculty')
    .select('*')
    .order('created_at', { ascending: false })
  console.log('  Faculty count:', faculty?.length, 'Data:', faculty)

  console.log('\n7. /payslips query:')
  const { data: payslips, count: payCount } = await supabase
    .from('payslips')
    .select('*, faculty(id, name, designation, department)', { count: 'exact' })
    .range(0, 14)
  console.log('  Payslips count:', payCount, 'Data:', payslips)
}

testAllPages()
