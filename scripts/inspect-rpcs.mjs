import { Client } from 'pg'

const connectionString = 'postgresql://postgres.yrncaebimjmwhqltroqi:NGF4pXvZ8NxnpMft@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

async function inspectRPCs() {
  const client = new Client({
    connectionString,
  })

  try {
    await client.connect()
    console.log('Connected to the database.\n')

    const rpcNames = [
      'create_invoice',
      'record_payment',
      'convert_quotation_to_invoice',
      'generate_payslip',
      'cancel_invoice',
      'get_dashboard_summary',
      'get_student_ledger'
    ]

    for (const rpcName of rpcNames) {
      console.log('====================================================')
      console.log(`RPC: ${rpcName}`)
      console.log('====================================================')

      // Query parameter info
      const paramsRes = await client.query(`
        SELECT 
          p.proname as function_name,
          pg_get_function_identity_arguments(p.oid) as identity_args,
          pg_get_function_arguments(p.oid) as all_args,
          pg_get_function_result(p.oid) as return_type,
          p.proretset as returns_set,
          p.prorettype::regtype as result_type_reg
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = $1
      `, [rpcName])

      console.log('Function overview:', paramsRes.rows)

      // Query routine parameters in detail
      const detailRes = await client.query(`
        SELECT 
          parameter_name, 
          data_type, 
          parameter_mode, 
          ordinal_position,
          parameter_default
        FROM information_schema.parameters
        WHERE specific_schema = 'public' 
          AND specific_name LIKE $1 || '%'
        ORDER BY ordinal_position
      `, [rpcName])

      console.log('Detailed parameters:', detailRes.rows)

      // Query function source code definition to verify table returns / JSON keys / behaviors
      const srcRes = await client.query(`
        SELECT pg_get_functiondef(p.oid) as func_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = $1
      `, [rpcName])

      if (srcRes.rows.length > 0) {
        console.log('\nFunction Definition:\n')
        console.log(srcRes.rows[0].func_def)
      } else {
        console.log(`Function ${rpcName} not found!`)
      }
      console.log('\n\n')
    }

  } catch (err) {
    console.error('Error inspecting RPCs:', err)
  } finally {
    await client.end()
  }
}

inspectRPCs()
