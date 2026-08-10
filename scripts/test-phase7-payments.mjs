import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testPhase7Payments() {
  console.log('====================================================')
  console.log('AVIORA PHASE 7: PAYMENTS, RECEIPTS & LEDGER TEST')
  console.log('====================================================\n')

  // 1. Create a test student
  const testStudentAdmissionNo = `AV-P7-${Date.now()}`
  const { data: student, error: stuErr } = await supabase
    .from('students')
    .insert({
      admission_no: testStudentAdmissionNo,
      name: 'Pilot Cadet Phase7',
      phone: '9888877777',
      email: 'cadet.phase7@aviora.edu',
      status: 'active',
    })
    .select()
    .single()

  if (stuErr) throw stuErr
  console.log(` Created test student: ${student.name} (${student.admission_no})`)

  // 2. Create a test invoice
  const testInvoiceNo = `TEST/P7/INV/${Date.now()}`
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      invoice_no: testInvoiceNo,
      fy_label: '2026-27',
      student_id: student.id,
      invoice_date: '2026-08-01',
      due_date: '2026-08-25',
      subtotal: 100000.00,
      discount_amount: 0.00,
      scholarship_amount: 0.00,
      coupon_amount: 0.00,
      gst_percent: 0.00,
      gst_amount: 0.00,
      grand_total: 100000.00,
      status: 'sent',
    })
    .select()
    .single()

  if (invErr) throw invErr
  console.log(` Created test invoice: ${invoice.invoice_no} (Grand Total: ₹${invoice.grand_total})`)

  // 3. Verify initial balance in invoice_balances view
  const { data: balInit } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', invoice.id)
    .single()

  console.log(' Step 1 Initial Balance View:', balInit)
  if (balInit.amount_paid !== 0 || balInit.balance_due !== 100000 || balInit.computed_status !== 'sent') {
    throw new Error('Initial balance state mismatch!')
  }

  // 4. Record First Partial Payment (₹35,000 via Bank Transfer)
  console.log('\n--- Recording First Partial Payment: ₹35,000 (NEFT) ---')
  const { data: pmt1, error: pmt1Err } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoice.id,
      student_id: student.id,
      receipt_no: `AV/RCT/2026-27/00091`,
      amount: 35000.00,
      payment_date: '2026-08-02',
      payment_mode: 'bank_transfer',
      reference_no: 'NEFT-88990011',
      payment_type: 'payment',
      notes: 'First installment realized',
    })
    .select()
    .single()

  if (pmt1Err) throw pmt1Err
  console.log(` Generated Receipt: ${pmt1.receipt_no} for ₹${pmt1.amount}`)

  // 5. Query invoice_balances after 1st payment
  const { data: balAfter1 } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', invoice.id)
    .single()

  console.log(' Step 2 Balance View after ₹35,000 payment:', balAfter1)
  if (balAfter1.amount_paid !== 35000 || balAfter1.balance_due !== 65000 || balAfter1.computed_status !== 'partial') {
    throw new Error(`Expected amount_paid=35000, balance_due=65000, computed_status='partial', got ${JSON.stringify(balAfter1)}`)
  }

  // 6. Record Second Partial Payment (₹65,000 via UPI)
  console.log('\n--- Recording Second Settlement Payment: ₹65,000 (UPI) ---')
  const { data: pmt2, error: pmt2Err } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoice.id,
      student_id: student.id,
      receipt_no: `AV/RCT/2026-27/00092`,
      amount: 65000.00,
      payment_date: '2026-08-05',
      payment_mode: 'upi',
      reference_no: 'UPI-77441122',
      payment_type: 'payment',
      notes: 'Final settlement realized via UPI QR',
    })
    .select()
    .single()

  if (pmt2Err) throw pmt2Err
  console.log(` Generated Receipt: ${pmt2.receipt_no} for ₹${pmt2.amount}`)

  // 7. Query invoice_balances after full settlement
  const { data: balFinal } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', invoice.id)
    .single()

  console.log(' Step 3 Final Balance View after full settlement:', balFinal)
  if (balFinal.amount_paid !== 100000 || balFinal.balance_due !== 0 || balFinal.computed_status !== 'paid') {
    throw new Error(`Expected amount_paid=100000, balance_due=0, computed_status='paid', got ${JSON.stringify(balFinal)}`)
  }

  // 8. Test Student Fee Ledger aggregation across the student
  const { data: studentInvoices } = await supabase
    .from('invoices')
    .select('id, grand_total')
    .eq('student_id', student.id)

  const invIds = (studentInvoices || []).map((i) => i.id)
  const { data: studentBalances } = await supabase
    .from('invoice_balances')
    .select('*')
    .in('invoice_id', invIds)

  const totalBilled = (studentBalances || []).reduce((s, i) => s + Number(i.grand_total), 0)
  const totalPaid = (studentBalances || []).reduce((s, i) => s + Number(i.amount_paid), 0)
  const totalOutstanding = (studentBalances || []).reduce((s, i) => s + Number(i.balance_due), 0)

  console.log('\n--- Student Fee Ledger Live Aggregations ---')
  console.log(` Total Billed: ₹${totalBilled}`)
  console.log(` Total Paid: ₹${totalPaid}`)
  console.log(` Net Outstanding: ₹${totalOutstanding}`)

  if (totalBilled !== 100000 || totalPaid !== 100000 || totalOutstanding !== 0) {
    throw new Error('Student fee ledger calculation mismatch!')
  }

  // Cleanup test artifacts
  await supabase.from('payments').delete().eq('student_id', student.id)
  await supabase.from('invoices').delete().eq('id', invoice.id)
  await supabase.from('students').delete().eq('id', student.id)
  console.log('\n Cleaned up test student, invoices, and payments.')

  console.log('\n====================================================')
  console.log('ALL PHASE 7 PAYMENT & LEDGER CALCULATIONS PASSED!')
  console.log('====================================================')
}

testPhase7Payments().catch((err) => {
  console.error('Phase 7 Test Error:', err)
  process.exit(1)
})
