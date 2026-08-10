import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const connectionString = 'postgresql://postgres.yrncaebimjmwhqltroqi:NGF4pXvZ8NxnpMft@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'
const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

async function run() {
  const client = new Client({ connectionString })
  try {
    await client.connect()
    console.log('Connected to Postgres...')
    const sqlPath = path.resolve('supabase/migrations/0001_master_data.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log('Running 0001_master_data.sql...')
    await client.query(sql)
    console.log('Migration executed successfully.')
  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await client.end()
  }

  // Setup student-photos bucket
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data, error } = await supabase.storage.createBucket('student-photos', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    fileSizeLimit: 10485760, // 10MB
  })

  if (error && !error.message.includes('already exists')) {
    console.error('Storage bucket error:', error)
  } else {
    console.log('Student photos bucket ready:', data || 'already exists')
  }
}

run()
