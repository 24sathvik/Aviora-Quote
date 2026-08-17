import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

async function runTest() {
  console.log('=== TEST 1: Direct REST call with ANON KEY only (No auth token) ===')
  const resAnon = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  })
  const jsonAnon = await resAnon.json()
  console.log('Status:', resAnon.status, 'Anon query result:', jsonAnon)

  console.log('\n=== TEST 2: REST call with ADMIN JWT token ===')
  const supabase = createClient(SUPABASE_URL, ANON_KEY)
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })
  const token = auth.session.access_token

  const resAdmin = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`
    }
  })
  const jsonAdmin = await resAdmin.json()
  console.log('Status:', resAdmin.status, 'Admin query result:', jsonAdmin)

  console.log('\n=== TEST 3: REST call for /courses, /quotations, /invoices with ADMIN JWT token ===')
  for (const endpoint of ['courses', 'quotations', 'invoices', 'payments', 'faculty', 'payslips']) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}?select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    })
    const json = await res.json()
    console.log(`Endpoint [${endpoint}]: status ${res.status}, items count: ${json?.length}`, json)
  }
}

runTest()
