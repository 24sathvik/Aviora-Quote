import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function deepAudit() {
  console.log('=== AUTHENTICATING AS ADMIN ===')
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })
  if (authErr) {
    console.error('Auth error:', authErr)
    return
  }

  console.log('Logged in as:', auth.user.email)

  // 1. Check Idempotency Keys
  console.log('\n=== IDEMPOTENCY KEYS TABLE ===')
  const { data: idempKeys, error: idempErr } = await supabase
    .from('idempotency_keys')
    .select('*')

  if (idempErr) {
    console.log('Error fetching idempotency_keys:', idempErr.message)
  } else {
    console.log(`Found ${idempKeys?.length || 0} idempotency key records:`)
    console.table(idempKeys)
  }

  // 2. Storage Objects Check (Recursively inspect student-photos and branding)
  console.log('\n=== STORAGE AUDIT ===')
  const { data: photoRoot, error: prErr } = await supabase.storage.from('student-photos').list('', { limit: 100 })
  console.log('student-photos (root):', photoRoot)

  const { data: photoStudents, error: psErr } = await supabase.storage.from('student-photos').list('students', { limit: 100 })
  console.log('student-photos (students/):', photoStudents)

  // If there are subdirectories under students/, check them
  if (photoStudents && photoStudents.length > 0) {
    for (const item of photoStudents) {
      const { data: subFiles } = await supabase.storage.from('student-photos').list(`students/${item.name}`, { limit: 100 })
      console.log(`student-photos (students/${item.name}):`, subFiles)
    }
  }

  const { data: brandRoot, error: brErr } = await supabase.storage.from('branding').list('', { limit: 100 })
  console.log('branding (root):', brandRoot)

  const { data: brandBranding, error: bbErr } = await supabase.storage.from('branding').list('branding', { limit: 100 })
  console.log('branding (branding/):', brandBranding)

  // 3. Complete Table-by-Table Inventory with All Columns
  console.log('\n=== COMPLETE TABLE INVENTORY ===')
  const tables = [
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

  for (const table of tables) {
    const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' })
    console.log(`\n--- TABLE: ${table} (${count} records) ---`)
    if (data && data.length > 0) {
      console.log(JSON.stringify(data, null, 2))
    } else {
      console.log('  [EMPTY]')
    }
  }
}

deepAudit()
