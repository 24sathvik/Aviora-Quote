import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

const connectionString = 'postgresql://postgres.yrncaebimjmwhqltroqi:NGF4pXvZ8NxnpMft@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

async function run() {
  const client = new Client({ connectionString })
  try {
    await client.connect()
    console.log('Connected to Postgres...')
    const sqlPath = path.resolve('supabase/migrations/0002_phase3_enrollments_faculty.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log('Running 0002_phase3_enrollments_faculty.sql...')
    await client.query(sql)
    console.log('Phase 3 migration executed successfully.')
  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await client.end()
  }
}

run()
