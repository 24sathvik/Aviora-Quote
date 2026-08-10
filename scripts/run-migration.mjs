import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

const connectionString = 'postgresql://postgres.yrncaebimjmwhqltroqi:NGF4pXvZ8NxnpMft@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

async function runMigration() {
  const client = new Client({
    connectionString,
  })

  try {
    await client.connect()
    console.log('Connected to the database.')

    const sqlPath = path.resolve('supabase/migrations/0000_initial.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('Executing migration...')
    await client.query(sql)
    console.log('Migration executed successfully.')
  } catch (err) {
    console.error('Error executing migration:', err)
  } finally {
    await client.end()
  }
}

runMigration()
