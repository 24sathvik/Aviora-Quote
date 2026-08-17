import { Client } from 'pg'

const connectionString = 'postgresql://postgres.yrncaebimjmwhqltroqi:NGF4pXvZ8NxnpMft@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

async function cleanRemainingFinancialData() {
  const client = new Client({ connectionString })

  try {
    await client.connect()
    console.log('Connected to database via admin client.')

    // 1. Delete payments (exact IDs)
    const paymentIds = [
      'c49848bd-4594-49cd-bc02-c8891c1ff477',
      'ee2836c0-bec8-43e2-81aa-620f30d31cfa',
    ]
    const resPay = await client.query('DELETE FROM public.payments WHERE id = ANY($1::uuid[]) RETURNING id, receipt_no', [paymentIds])
    console.log(`Deleted ${resPay.rowCount} payments:`, resPay.rows)

    // 2. Delete invoice_items (exact IDs)
    const invoiceItemIds = [
      'a72ca557-f674-416c-91ce-a209f32be1dc',
      '6e532220-6a8f-431c-a67b-606d8e77dba2',
      'e9cf3222-c8b0-4bba-bc33-a459dfca3822',
    ]
    const resInvItems = await client.query('DELETE FROM public.invoice_items WHERE id = ANY($1::uuid[]) RETURNING id', [invoiceItemIds])
    console.log(`Deleted ${resInvItems.rowCount} invoice_items:`, resInvItems.rows)

    // 3. Delete invoices (exact IDs)
    const invoiceIds = [
      'f29abd35-e24c-462a-94b7-2ff4bb241195',
      'a0965e6d-0d9e-4885-b375-ebaeba2364dd',
      'be9538d5-94c5-4e9b-ae20-084e6f656498',
    ]
    const resInvoices = await client.query('DELETE FROM public.invoices WHERE id = ANY($1::uuid[]) RETURNING id, invoice_no', [invoiceIds])
    console.log(`Deleted ${resInvoices.rowCount} invoices:`, resInvoices.rows)

    console.log('\n--- VERIFYING TABLE ROW COUNTS ---')
    const tables = [
      'payments',
      'invoice_items',
      'invoices',
      'quotation_items',
      'quotations',
      'enrollments',
      'students',
      'payslips',
      'faculty_salary_structures',
      'faculty',
      'fee_heads',
      'course_terms',
      'courses',
      'company_settings',
    ]

    for (const t of tables) {
      const countRes = await client.query(`SELECT count(*)::int as cnt FROM public.${t}`)
      console.log(`Table [${t}]: ${countRes.rows[0].cnt} records remaining`)
    }

  } catch (err) {
    console.error('Error during financial data cleanup:', err)
  } finally {
    await client.end()
  }
}

cleanRemainingFinancialData()
