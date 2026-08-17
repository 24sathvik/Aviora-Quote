import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function inspect() {
  console.log('=== AUTHENTICATING ===')
  await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })

  console.log('\n=== ALL INVOICES IN DB ===')
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, invoice_no, student_id, grand_total, status, created_at')
    .order('created_at', { ascending: true })

  if (invErr) console.error('invErr:', invErr)
  console.table(invoices)

  console.log('\n=== ALL INVOICE BALANCES VIEW ===')
  const { data: balances, error: balErr } = await supabase
    .from('invoice_balances')
    .select('*')
  if (balErr) console.error('balErr:', balErr)
  console.table(balances)

  console.log('\n=== STUDENTS ===')
  const { data: students } = await supabase.from('students').select('id, name, admission_no')
  console.table(students)

  if (students && students.length > 0) {
    for (const s of students) {
      console.log(`\n=== STUDENT LEDGER FOR ${s.name} (${s.id}) ===`)
      const { data: ledger, error: ledgErr } = await supabase.rpc('get_student_ledger', { p_student_id: s.id })
      if (ledgErr) console.error('ledgErr:', ledgErr)
      else {
        console.log('Ledger Totals:', {
          total_billed: ledger.total_billed,
          total_paid: ledger.total_paid,
          total_outstanding: ledger.total_outstanding,
        })
        console.log('Ledger Invoices:')
        console.table(ledger.invoices)
        console.log('Ledger Payments:')
        console.table(ledger.payments)
      }
    }
  }

  console.log('\n=== DASHBOARD SUMMARY ===')
  const { data: dashboard, error: dashErr } = await supabase.rpc('get_dashboard_summary', { p_period: 'all_time' })
  if (dashErr) console.error('dashErr:', dashErr)
  else {
    console.log('Dashboard summary:', {
      billed_for_period: dashboard.billed_for_period,
      collected_for_period: dashboard.collected_for_period,
      outstanding_current: dashboard.outstanding_current,
      paid_count: dashboard.paid_count,
      partial_count: dashboard.partial_count,
      unpaid_count: dashboard.unpaid_count,
      draft_count: dashboard.draft_count,
    })
    console.log('Recent Invoices:')
    console.table(dashboard.recent_invoices)
  }
}

inspect()
