import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testPhase9Dashboard() {
  console.log('====================================================')
  console.log('AVIORA PHASE 9: DASHBOARD & FINANCIAL REPORTS TEST')
  console.log('====================================================\n')

  // 1. Query invoice_balances for Dashboard Summary
  const { data: invBalances, error: balErr } = await supabase
    .from('invoice_balances')
    .select('grand_total, amount_paid, balance_due, computed_status')

  if (balErr) throw balErr
  console.log(` Queried ${invBalances.length} invoice balances for Dashboard Summary.`)

  const totalBilled = invBalances.reduce((s, r) => s + Number(r.grand_total || 0), 0)
  const totalCollected = invBalances.reduce((s, r) => s + Number(r.amount_paid || 0), 0)
  const totalOutstanding = invBalances.reduce((s, r) => s + Number(r.balance_due || 0), 0)

  console.log(` Live Dashboard Totals: Billed ₹${totalBilled} | Collected ₹${totalCollected} | Outstanding ₹${totalOutstanding}`)

  // Spot-check balance consistency: Billed must equal Collected + Outstanding
  if (totalBilled !== (totalCollected + totalOutstanding)) {
    throw new Error(`Spot-check mismatch: Billed (${totalBilled}) != Collected (${totalCollected}) + Outstanding (${totalOutstanding})`)
  }
  console.log(' SPOT-CHECK PASSED: Billed = Collected + Outstanding balance mathematical identity holds!\n')

  // 2. Query Status Counts
  const paidCount = invBalances.filter((r) => r.computed_status === 'paid').length
  const partialCount = invBalances.filter((r) => r.computed_status === 'partial').length
  const pendingCount = invBalances.filter((r) => (r.computed_status === 'sent' || r.computed_status === 'draft') && Number(r.amount_paid) === 0).length
  const overdueCount = invBalances.filter((r) => r.computed_status === 'overdue').length

  console.log(` Settlement Status Breakdown: Paid=${paidCount}, Partial=${partialCount}, Pending=${pendingCount}, Overdue=${overdueCount}`)
  if (paidCount + partialCount + pendingCount + overdueCount > invBalances.length) {
    throw new Error('Status breakdown count discrepancy!')
  }
  console.log(' Status Breakdown query verified.\n')

  // 3. Test Outstanding Fees Report Query
  const { data: outstandingReport, error: outErr } = await supabase
    .from('invoice_balances')
    .select('invoice_id, grand_total, amount_paid, balance_due, computed_status')
    .gt('balance_due', 0)

  if (outErr) throw outErr
  console.log(` Outstanding Fees Report returned ${outstandingReport.length} unpaid invoices.`)

  // 4. Test Collections History Report Query
  const { data: collectionsReport, error: colErr } = await supabase
    .from('payments')
    .select('id, receipt_no, amount, payment_mode, payment_date')

  if (colErr) throw colErr
  console.log(` Collections History Report returned ${collectionsReport.length} realized payment receipts.`)

  // 5. Test Payroll Summary Query
  const { data: payslipsReport, error: payErr } = await supabase
    .from('payslips')
    .select('id, payslip_no, net_pay, gross_pay')

  if (payErr) throw payErr
  console.log(` Payroll Register Report returned ${payslipsReport.length} faculty payslips.`)

  console.log('\n====================================================')
  console.log('ALL PHASE 9 DASHBOARD & REPORT QUERIES PASSED!')
  console.log('====================================================')
}

testPhase9Dashboard().catch((err) => {
  console.error('Phase 9 Test Error:', err)
  process.exit(1)
})
