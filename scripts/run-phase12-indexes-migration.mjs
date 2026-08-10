import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

import pg from 'pg'
const { Client } = pg

const connectionString = 'postgresql://postgres.yrncaebimjmwhqltroqi:NGF4pXvZ8NxnpMft@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

async function runPerformanceIndexesMigration() {
  console.log('====================================================')
  console.log('EXECUTING PERFORMANCE INDEXES MIGRATION (0010)')
  console.log('====================================================\n')

  const client = new Client({ connectionString })
  await client.connect()

  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '0010_phase12_performance_indexes.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  await client.query(sql)
  await client.end()

  console.log(' Performance indexes created/verified in Supabase Postgres!')
  console.log('====================================================')
}

runPerformanceIndexesMigration().catch(console.error)
