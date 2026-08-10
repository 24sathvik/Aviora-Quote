import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

const connectionString = 'postgresql://postgres.yrncaebimjmwhqltroqi:NGF4pXvZ8NxnpMft@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

async function run() {
  const client = new Client({ connectionString })
  try {
    await client.connect()
    console.log('Connected to Postgres...')
    const sqlPath = path.resolve('supabase/migrations/0003_numbering_engine.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log('Running 0003_numbering_engine.sql...')
    await client.query(sql)
    console.log('Phase 4 migration executed successfully.')
  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await client.end()
  }
}

run()
