import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testInvoiceBalances() {
  console.log('====================================================')
  console.log('AVIORA INVOICE MODULE & INVOICE_BALANCES VIEW TEST')
  console.log('====================================================\n')

  // 1. Create a dummy test invoice
  const testInvoiceNo = `TEST/INV/${Date.now()}`
  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert({
      invoice_no: testInvoiceNo,
      fy_label: '2026-27',
      invoice_date: '2026-08-01',
      due_date: '2026-08-15',
      subtotal: 100000.00,
      discount_amount: 5000.00,
      scholarship_amount: 5000.00,
      coupon_amount: 0.00,
      gst_percent: 18.00,
      gst_amount: 16200.00,
      grand_total: 106200.00,
      status: 'sent',
    })
    .select()
    .single()

  if (invErr) throw invErr
  console.log(` Created test invoice: ${inv.invoice_no} (Grand Total: ₹${inv.grand_total})`)

  // 2. Query invoice_balances view
  const { data: bal1 } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', inv.id)
    .single()

  console.log(' Initial View Calculation:', bal1)
  if (bal1.amount_paid !== 0 || bal1.balance_due !== 106200 || (bal1.computed_status !== 'sent' && bal1.computed_status !== 'overdue')) {
    throw new Error('Initial balance calculation mismatch!')
  }
  console.log(' Initial invoice_balances view state verified!\n')

  // 3. Insert a Partial Payment directly in Postgres payments table
  console.log('--- Inserting partial payment of ₹50,000 directly into payments table ---')
  const { data: pmt1, error: pmtErr } = await supabase
    .from('payments')
    .insert({
      invoice_id: inv.id,
      amount: 50000.00,
      payment_date: '2026-08-05',
      payment_mode: 'bank_transfer',
      reference_no: 'UTR99887766',
    })
    .select()
    .single()

  if (pmtErr) throw pmtErr

  // 4. Query invoice_balances again to prove view automatically updates
  const { data: bal2 } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', inv.id)
    .single()

  console.log(' Updated View Calculation after ₹50,000 payment:', bal2)
  if (bal2.amount_paid !== 50000 || bal2.balance_due !== 56200) {
    throw new Error(`Expected balance_due = 56200, got ${bal2.balance_due}`)
  }
  console.log(' Balance updated dynamically to ₹56,200!\n')

  // 5. Insert Final Settlement Payment (remaining ₹56,200)
  console.log('--- Inserting final settlement payment of ₹56,200 ---')
  await supabase
    .from('payments')
    .insert({
      invoice_id: inv.id,
      amount: 56200.00,
      payment_date: '2026-08-06',
      payment_mode: 'upi',
      reference_no: 'UPI11223344',
    })

  // 6. Query invoice_balances again
  const { data: bal3 } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', inv.id)
    .single()

  console.log(' Final View Calculation after full settlement:', bal3)
  if (bal3.amount_paid !== 106200 || bal3.balance_due !== 0 || bal3.computed_status !== 'paid') {
    throw new Error(`Expected computed_status = 'paid' and balance_due = 0, got ${bal3.computed_status}, ${bal3.balance_due}`)
  }
  console.log(' Fully paid status and 0 balance due dynamically verified!\n')

  // Cleanup test invoice
  await supabase.from('invoices').delete().eq('id', inv.id)
  console.log(' Cleaned up test invoice and associated payments.')

  console.log('====================================================')
  console.log('ALL PHASE 6 INVOICE BALANCE CALCULATIONS VERIFIED!')
  console.log('====================================================')
}

testInvoiceBalances().catch((err) => {
  console.error('Invoice Balances Test Error:', err)
  process.exit(1)
})
