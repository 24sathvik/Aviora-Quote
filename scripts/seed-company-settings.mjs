import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function seedCompanySettings() {
  console.log('Seeding official AVIORA Aviation Academy company settings...')

  const settingsData = {
    name: 'Aviora Aviation Academy & Finance Management',
    address: 'Aviora Aviation Hangar 4, International Airport Road, Aerocity, New Delhi, India 110037',
    phone: '+91 11 4567 8900 / +91 98765 43210',
    gstin: '07AAAAA0000A1Z5',
    bank_name: 'HDFC Bank Ltd',
    bank_account_name: 'Aviora Aviation Academy Pvt Ltd',
    bank_account_number: '50200012345678',
    bank_ifsc: 'HDFC0000123',
    terms_and_conditions_text: '1. All fee payments are subject to DGCA & Aviora Aviation Academy terms.\n2. Official receipts must be produced for all balance adjustments or refund queries.\n3. Delayed term payments are subject to a 1.5% monthly interest penalty.',
  }

  // Check if settings record exists
  const { data: existing } = await supabase.from('company_settings').select('id').limit(1).maybeSingle()

  if (existing) {
    const { error } = await supabase.from('company_settings').update(settingsData).eq('id', existing.id)
    if (error) throw error
    console.log(' Updated existing company settings record.')
  } else {
    const { error } = await supabase.from('company_settings').insert(settingsData)
    if (error) throw error
    console.log(' Inserted new company settings record.')
  }

  console.log(' Official AVIORA company branding successfully configured!')
}

seedCompanySettings().catch((err) => {
  console.error('Seed Settings Error:', err)
  process.exit(1)
})
