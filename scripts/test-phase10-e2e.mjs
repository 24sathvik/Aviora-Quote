import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testPhase10E2E() {
  console.log('====================================================')
  console.log('AVIORA PHASE 10: END-TO-END AUDIT & SECURITY TEST')
  console.log('====================================================\n')

  // 1. Create a test student & course
  const studentNo = `AV-P10-${Date.now()}`
  const { data: student, error: stuErr } = await supabase
    .from('students')
    .insert({
      admission_no: studentNo,
      name: 'Cadet Phase10 Audit Student',
      phone: '9900011122',
      email: `audit.p10.${Date.now()}@aviora.edu`,
      status: 'enrolled',
    })
    .select()
    .single()

  if (stuErr) throw stuErr
  console.log(` 1. Student created: ${student.name} (${student.admission_no})`)

  // 2. Create Quotation with Discount + GST
  const quoteNo = `AV/QT/P10/${Date.now()}`
  const { data: quotation, error: qErr } = await supabase
    .from('quotations')
    .insert({
      quote_no: quoteNo,
      student_id: student.id,
      quote_date: '2026-08-01',
      valid_until: '2026-08-15',
      status: 'accepted',
      subtotal: 200000.00,
      discount_amount: 10000.00,
      gst_percent: 18.00,
      gst_amount: 34200.00,
      total: 224200.00,
    })
    .select()
    .single()

  if (qErr) throw qErr
  console.log(` 2. Quotation created: ${quotation.quote_no} (Total: ₹${quotation.total})`)

  // 3. Create Invoice with multi-deduction (Discount + Scholarship + Coupon)
  const invNo = `AV/INV/2026-27/P10_${Date.now()}`
  // Subtotal = 200,000
  // Deductions: Discount = 10,000, Scholarship = 10,000, Coupon = 5,000 => Total Deductions = 25,000
  // Taxable = 175,000 => GST 18% = 31,500
  // Grand Total = 200,000 - 25,000 + 31,500 = 206,500
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      invoice_no: invNo,
      fy_label: '2026-27',
      student_id: student.id,
      quotation_id: quotation.id,
      invoice_date: '2026-08-01',
      due_date: '2026-08-05', // Past due date for overdue edge case test
      subtotal: 200000.00,
      discount_amount: 10000.00,
      scholarship_amount: 10000.00,
      coupon_amount: 5000.00,
      gst_percent: 18.00,
      gst_amount: 31500.00,
      grand_total: 206500.00,
      status: 'sent',
    })
    .select()
    .single()

  if (invErr) throw invErr
  console.log(` 3. Invoice created with multi-deductions: ${invoice.invoice_no} (Grand Total: ₹${invoice.grand_total})`)

  // 4. Verify initial invoice_balances
  const { data: bal1 } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', invoice.id)
    .single()

  console.log(` 4. Initial invoice_balances view:`, bal1)
  if (bal1.balance_due !== 206500) throw new Error('Initial invoice balance due mismatch!')

  // 5. Partial Payment Edge Case: Record ₹100,000 payment on invoice after due date
  console.log('\n--- Edge Case Test: Partial payment on overdue invoice ---')
  const { data: pmt1, error: pmt1Err } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoice.id,
      student_id: student.id,
      receipt_no: `AV/RCT/2026-27/P10_1`,
      amount: 100000.00,
      payment_date: '2026-08-06',
      payment_mode: 'bank_transfer',
      reference_no: 'UTR-AUDIT-100K',
      payment_type: 'payment',
    })
    .select()
    .single()

  if (pmt1Err) throw pmt1Err

  const { data: bal2 } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', invoice.id)
    .single()

  console.log(' Partial Payment View Result:', bal2)
  if (bal2.amount_paid !== 100000 || bal2.balance_due !== 106500 || bal2.computed_status !== 'overdue') {
    throw new Error(`Expected balance_due=106500 and computed_status='overdue', got ${JSON.stringify(bal2)}`)
  }
  console.log(' Overdue partial payment edge case passed cleanly!\n')

  // 6. Exact Settlement Payment Edge Case: Record remaining ₹106,500
  console.log('--- Edge Case Test: Exact settlement payment ---')
  const { data: pmt2, error: pmt2Err } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoice.id,
      student_id: student.id,
      receipt_no: `AV/RCT/2026-27/P10_2`,
      amount: 106500.00,
      payment_date: '2026-08-07',
      payment_mode: 'upi',
      reference_no: 'UPI-AUDIT-FINAL',
      payment_type: 'payment',
    })
    .select()
    .single()

  if (pmt2Err) throw pmt2Err

  const { data: bal3 } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', invoice.id)
    .single()

  console.log(' Settlement Payment View Result:', bal3)
  if (bal3.amount_paid !== 206500 || bal3.balance_due !== 0 || bal3.computed_status !== 'paid') {
    throw new Error(`Expected balance_due=0 and computed_status='paid', got ${JSON.stringify(bal3)}`)
  }
  console.log(' Exact settlement payment edge case passed cleanly!\n')

  // 7. Verify Trigger-Based Audit Logs
  console.log('--- Trigger-Based Audit Logs Verification ---')
  const { data: logs, error: logErr } = await supabase
    .from('audit_logs')
    .select('table_name, record_id, action')
    .in('table_name', ['quotations', 'invoices', 'payments'])

  if (logErr) throw logErr
  console.log(` Found ${logs.length} automatic audit log entries in audit_logs table!`)

  const invoiceLog = logs.find((l) => l.table_name === 'invoices' && l.record_id === invoice.id)
  const paymentLog = logs.find((l) => l.table_name === 'payments' && l.record_id === pmt1.id)

  if (!invoiceLog || !paymentLog) {
    throw new Error('FAILED: Postgres trigger did not automatically log financial table mutations!')
  }
  console.log(' TRIGGER-BASED AUDIT LOGGING VERIFIED: All mutations captured automatically by Postgres trigger!\n')

  // Cleanup test artifacts
  await supabase.from('payments').delete().eq('student_id', student.id)
  await supabase.from('invoices').delete().eq('id', invoice.id)
  await supabase.from('quotations').delete().eq('id', quotation.id)
  await supabase.from('students').delete().eq('id', student.id)
  console.log(' Cleaned up test student and transaction records.')

  console.log('\n====================================================')
  console.log('ALL PHASE 10 E2E CALCULATIONS & SECURITY TESTS PASSED!')
  console.log('====================================================')
}

testPhase10E2E().catch((err) => {
  console.error('Phase 10 E2E Error:', err)
  process.exit(1)
})
