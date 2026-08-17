import { Client } from 'pg'

const connectionString = 'postgresql://postgres.yrncaebimjmwhqltroqi:NGF4pXvZ8NxnpMft@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

async function getCancelInvoiceDefinition() {
  const client = new Client({ connectionString })

  try {
    await client.connect()

    const res = await client.query(`
      SELECT pg_get_functiondef(p.oid) as func_def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'cancel_invoice'
    `)

    if (res.rows.length > 0) {
      console.log('=== EXACT CURRENT LIVE DEFINITION OF public.cancel_invoice ===\n')
      console.log(res.rows[0].func_def)
      console.log('\n============================================================')
    } else {
      console.error('Function public.cancel_invoice not found!')
    }
  } catch (err) {
    console.error('Error fetching function definition:', err.message)
  } finally {
    await client.end()
  }
}

getCancelInvoiceDefinition()
