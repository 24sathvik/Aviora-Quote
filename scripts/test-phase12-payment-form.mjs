import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testPaymentFormQueries() {
  console.log('====================================================')
  console.log('TESTING PAYMENT FORM OPEN INVOICE RETRIEVAL')
  console.log('====================================================\n')

  // 1. Create a test student and an unpaid invoice
  const { data: student } = await supabase
    .from('students')
    .insert({
      admission_no: `AV-12.5-${Date.now()}`,
      name: 'Payment Form Test Cadet',
      phone: '9876543210',
    })
    .select()
    .single()

  const { data: invoice } = await supabase
    .from('invoices')
    .insert({
      invoice_no: `AV/INV/2026-27/PAY_${Date.now()}`,
      fy_label: '2026-27',
      student_id: student.id,
      invoice_date: '2026-08-01',
      due_date: '2026-08-15',
      subtotal: 100000,
      discount_amount: 0,
      gst_percent: 0,
      gst_amount: 0,
      grand_total: 100000,
      status: 'sent',
    })
    .select()
    .single()

  console.log(` 1. Created Student: ${student.name}, Open Invoice: ${invoice.invoice_no}`)

  // 2. Test Fixed Student Open Invoices Query
  console.log('\n--- Testing Fixed Open Invoices Query ---')
  const { data: rawInvoices, error: invErr } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_no,
      invoice_date,
      due_date,
      grand_total,
      status,
      enrollments (
        courses (
          name
        )
      ),
      course_terms (
        term_label
      )
    `)
    .eq('student_id', student.id)
    .neq('status', 'cancelled')

  if (invErr) throw invErr

  const invIds = (rawInvoices || []).map((i) => i.id)
  const { data: rawBalances, error: balErr } = await supabase
    .from('invoice_balances')
    .select('*')
    .in('invoice_id', invIds.length > 0 ? invIds : ['none'])

  if (balErr) throw balErr

  const balancesMap = new Map((rawBalances || []).map((b) => [b.invoice_id, b]))
  const studentInvoices = (rawInvoices || []).map((inv) => ({
    ...inv,
    invoice_balances: balancesMap.get(inv.id) || {
      invoice_id: inv.id,
      grand_total: inv.grand_total,
      amount_paid: 0,
      balance_due: inv.grand_total,
      computed_status: inv.status,
    },
  }))

  console.log(` Student Open Invoices returned ${studentInvoices.length} row(s):`)
  console.log(` Invoice No: ${studentInvoices[0].invoice_no}`)
  console.log(` Grand Total: ₹${studentInvoices[0].invoice_balances.grand_total}`)
  console.log(` Balance Due: ₹${studentInvoices[0].invoice_balances.balance_due}`)

  if (studentInvoices.length === 0 || studentInvoices[0].invoice_balances.balance_due !== 100000) {
    throw new Error('FAILED: Open invoice query returned zero or incorrect balances!')
  }

  // 3. Test Recording Payment of ₹40,000 (Partial Payment)
  console.log('\n--- Testing Payment Recording & Balance Update ---')
  const receiptNo = `AV/RCT/2026-27/PAY_${Date.now()}`
  const { data: pmt, error: pmtErr } = await supabase
    .from('payments')
    .insert({
      receipt_no: receiptNo,
      invoice_id: invoice.id,
      student_id: student.id,
      amount: 40000,
      payment_date: '2026-08-08',
      payment_mode: 'upi',
    })
    .select()
    .single()

  if (pmtErr) throw pmtErr

  // Fetch updated invoice balances
  const { data: updatedBal } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', invoice.id)
    .single()

  console.log(` Recorded Payment Receipt ${pmt.receipt_no} for ₹40,000`)
  console.log(` Updated Invoice State: Paid = ₹${updatedBal.amount_paid}, Balance Due = ₹${updatedBal.balance_due}, Status = ${updatedBal.computed_status}`)

  if (updatedBal.amount_paid !== 40000 || updatedBal.balance_due !== 60000 || updatedBal.computed_status !== 'partial') {
    throw new Error('FAILED: Invoice balances did not update correctly after payment!')
  }

  // Cleanup
  await supabase.from('payments').delete().eq('id', pmt.id)
  await supabase.from('invoices').delete().eq('id', invoice.id)
  await supabase.from('students').delete().eq('id', student.id)
  console.log('\n Cleaned up test records.')

  console.log('\n====================================================')
  console.log('PAYMENT FORM QUERIES & BALANCE UPDATE VERIFIED 100%!')
  console.log('====================================================')
}

testPaymentFormQueries().catch((err) => {
  console.error('Payment Form Test Error:', err)
  process.exit(1)
})
