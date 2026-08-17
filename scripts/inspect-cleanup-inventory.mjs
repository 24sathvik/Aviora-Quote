import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function inspectData() {
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
    'company_settings',
  ]

  console.log('\n=== RECORD INVENTORY ===')
  for (const table of tables) {
    const { data, count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact' })

    if (error) {
      console.log(`Table [${table}]: ERROR - ${error.message}`)
    } else {
      console.log(`Table [${table}]: ${count} records`)
      if (data && data.length > 0 && data.length <= 5) {
        console.log(data.map(r => ({ id: r.id, name: r.name || r.invoice_no || r.quote_no || r.receipt_no || r.month || r.label })))
      }
    }
  }

  console.log('\n=== STORAGE INVENTORY ===')
  const { data: studentPhotos, error: spErr } = await supabase.storage.from('student-photos').list('students', { limit: 100 })
  console.log('student-photos bucket (students/):', studentPhotos?.length || 0, 'objects/folders', studentPhotos)

  const { data: brandingFiles, error: bfErr } = await supabase.storage.from('branding').list('branding', { limit: 100 })
  console.log('branding bucket (branding/):', brandingFiles?.length || 0, 'objects/folders', brandingFiles)
}

inspectData()
