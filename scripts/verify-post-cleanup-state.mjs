import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function verifyCleanState() {
  console.log('====================================================')
  console.log('POST-CLEANUP SYSTEM STATE VERIFICATION')
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

  // 1. Authenticate as admin user
  console.log('1. Verifying Admin Authentication...')
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })
  assert(!authErr && !!auth.user, `Admin authentication active: ${auth?.user?.email}`)

  // 2. Verify all business tables are empty
  console.log('\n2. Verifying Business Table Final Counts...')
  const businessTables = [
    'payments',
    'invoice_items',
    'invoices',
    'quotation_items',
    'quotations',
    'enrollments',
    'students',
    'payslips',
    'faculty_salary_structures',
    'faculty',
    'fee_heads',
    'course_terms',
    'courses',
  ]

  for (const t of businessTables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
    assert(!error && count === 0, `Table [${t}] has 0 records (count: ${count})`)
  }

  // 3. Verify company_settings is intact
  console.log('\n3. Verifying System Configuration...')
  const { data: settings, error: settErr } = await supabase.from('company_settings').select('*')
  assert(!settErr && settings?.length === 1, `company_settings intact (1 record: ${settings?.[0]?.name})`)

  // 4. Verify RPC functions work cleanly on empty state
  console.log('\n4. Verifying RPC Functions on Clean State...')
  const { data: dashboard, error: dashErr } = await supabase.rpc('get_dashboard_summary', { p_period: 'all_time' })
  assert(!dashErr && !!dashboard, 'get_dashboard_summary RPC executed cleanly on empty state')
  assert(Number(dashboard?.billed_for_period) === 0, `Dashboard Billed: ₹${dashboard?.billed_for_period}`)
  assert(Number(dashboard?.collected_for_period) === 0, `Dashboard Collected: ₹${dashboard?.collected_for_period}`)
  assert(Number(dashboard?.outstanding_current) === 0, `Dashboard Outstanding: ₹${dashboard?.outstanding_current}`)
  assert(dashboard?.paid_count === 0, `Dashboard Paid Count: ${dashboard?.paid_count}`)

  // 5. Verify Storage Buckets are Accessible
  console.log('\n5. Verifying Storage Buckets & Policies...')
  const { data: pBucket, error: pbErr } = await supabase.storage.from('student-photos').list()
  assert(!pbErr, 'student-photos bucket accessible and policies intact')

  const { data: bBucket, error: bbErr } = await supabase.storage.from('branding').list()
  assert(!bbErr, 'branding bucket accessible and policies intact')

  console.log('\n====================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('====================================================\n')

  if (failed > 0) process.exit(1)
}

verifyCleanState()
