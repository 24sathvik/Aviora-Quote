import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function createDemoUser() {
  const email = 'admin@aviora.edu'
  const password = 'AvioraAdmin2026!'

  console.log(`Checking/Creating demo login account for ${email}...`)

  // Check if user exists
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) console.log('List users warning:', listErr.message)

  const existing = users?.users?.find((u) => u.email === email)

  if (existing) {
    // Update password to ensure it works
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    if (updateErr) throw updateErr
    console.log(` Existing user found. Password updated to: ${password}`)
  } else {
    // Create user
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Aviora Admin' },
    })
    if (createErr) throw createErr
    console.log(` New user created successfully: ${newUser.user.email}`)
  }

  console.log('\n====================================================')
  console.log('DEMO LOGIN CREDENTIALS:')
  console.log(`Email:    ${email}`)
  console.log(`Password: ${password}`)
  console.log('====================================================')
}

createDemoUser().catch((err) => {
  console.error('Create Demo User Error:', err)
  process.exit(1)
})
