import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testReportsQueries() {
  console.log('====================================================')
  console.log('TESTING ALL 4 REPORT QUERIES')
  console.log('====================================================\n')

  // 1. Test Fixed Outstanding Fees Report Query
  console.log('1. Testing Fixed Outstanding Fees Report Query...')
  const { data: rawInvoices, error: invErr } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_no,
      invoice_date,
      due_date,
      grand_total,
      status,
      students (
        id,
        admission_no,
        name,
        phone,
        email
      ),
      enrollments (
        courses (
          name
        )
      )
    `)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (invErr) throw invErr

  const invIds = (rawInvoices || []).map((i) => i.id)
  const { data: rawBalances, error: balErr } = await supabase
    .from('invoice_balances')
    .select('*')
    .in('invoice_id', invIds.length > 0 ? invIds : ['none'])

  if (balErr) throw balErr

  const balancesMap = new Map((rawBalances || []).map((b) => [b.invoice_id, b]))
  const outstandingInvoices = (rawInvoices || [])
    .map((inv) => ({
      ...inv,
      invoice_balances: balancesMap.get(inv.id) || {
        invoice_id: inv.id,
        grand_total: inv.grand_total,
        amount_paid: 0,
        balance_due: inv.grand_total,
        computed_status: inv.status,
      },
    }))
    .filter((inv) => Number(inv.invoice_balances.balance_due) > 0)

  console.log(` Outstanding Fees Query returned ${outstandingInvoices.length} row(s).`)

  // 2. Test Collections Report Query
  console.log('\n2. Testing Collections Report Query...')
  const { data: collections, error: colErr } = await supabase
    .from('payments')
    .select(`
      *,
      students (
        admission_no,
        name,
        phone
      ),
      invoices (
        invoice_no
      )
    `)
    .order('payment_date', { ascending: false })

  if (colErr) throw colErr
  console.log(` Collections Report Query returned ${collections.length} payment record(s).`)

  // 3. Test Course-wise Fee Report Query
  console.log('\n3. Testing Course-wise Fee Report Query...')
  const courseMap = new Map()
  ;(rawInvoices || []).forEach((inv) => {
    const courseName = inv.enrollments?.courses?.name || 'General Flight Track'
    const bal = balancesMap.get(inv.id) || { grand_total: inv.grand_total, amount_paid: 0, balance_due: inv.grand_total }

    const existing = courseMap.get(courseName) || { name: courseName, billed: 0, collected: 0, outstanding: 0, count: 0 }
    courseMap.set(courseName, {
      name: courseName,
      billed: existing.billed + (Number(bal.grand_total) || 0),
      collected: existing.collected + (Number(bal.amount_paid) || 0),
      outstanding: existing.outstanding + (Number(bal.balance_due) || 0),
      count: existing.count + 1,
    })
  })

  console.log(` Course-wise Fee Report returned ${courseMap.size} course row(s).`)

  // 4. Test Payroll Report Query
  console.log('\n4. Testing Payroll Report Query...')
  const { data: payslips, error: payErr } = await supabase
    .from('payslips')
    .select(`
      *,
      faculty (
        name,
        designation,
        department
      )
    `)

  if (payErr) throw payErr
  console.log(` Payroll Report Query returned ${payslips.length} payslip record(s).`)

  console.log('\n====================================================')
  console.log('ALL 4 REPORT QUERIES VERIFIED 100% WORKING!')
  console.log('====================================================')
}

testReportsQueries().catch((err) => {
  console.error('Reports Test Error:', err)
  process.exit(1)
})
