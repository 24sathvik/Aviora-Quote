import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function setup() {
  const { data, error } = await supabase.storage.createBucket('branding', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
    fileSizeLimit: 10485760, // 10MB
  })

  if (error) {
    console.error('Error creating bucket:', error)
  } else {
    console.log('Bucket created successfully:', data)
  }
}

setup()
