import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testQuotationConversion() {
  console.log('====================================================')
  console.log('TESTING QUOTATION TO INVOICE CONVERSION FLOW')
  console.log('====================================================\n')

  // 1. Create a test student
  const { data: student, error: stuErr } = await supabase
    .from('students')
    .insert({
      admission_no: `AV-CONV-${Date.now()}`,
      name: 'Conversion Test Cadet',
      phone: '9876500112',
    })
    .select()
    .single()

  if (stuErr) throw stuErr
  console.log(` Created test student: ${student.name} (${student.admission_no})`)

  // 2. Create a test Accepted Quotation
  const quoteNo = `AV/QT/TEST/${Date.now()}`
  const { data: quotation, error: qErr } = await supabase
    .from('quotations')
    .insert({
      quote_no: quoteNo,
      student_id: student.id,
      quote_date: '2026-08-08',
      valid_until: '2026-08-22',
      status: 'accepted',
      subtotal: 120000.00,
      discount_amount: 5000.00,
      gst_percent: 18.00,
      gst_amount: 20700.00,
      total: 135700.00,
    })
    .select()
    .single()

  if (qErr) throw qErr

  // Create quotation items
  await supabase.from('quotation_items').insert({
    quotation_id: quotation.id,
    description: 'Ground School Module 1 Tuition',
    quantity: 1,
    unit_price: 120000.00,
    discount_amount: 5000.00,
    line_total: 115000.00,
  })

  console.log(` Created Accepted Quotation: ${quotation.quote_no} (Status: ${quotation.status})`)

  // 3. Simulate conversion logic (as executed in QuotationDetail.tsx)
  console.log('\n--- Executing Conversion Mutation ---')
  const invNo = `AV/INV/2026-27/CONV_${Date.now()}`
  const { data: newInvoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      invoice_no: invNo,
      fy_label: '2026-27',
      student_id: quotation.student_id,
      quotation_id: quotation.id,
      invoice_date: '2026-08-08',
      due_date: '2026-08-23',
      previous_outstanding: 0,
      subtotal: 120000.00,
      discount_amount: 5000.00,
      scholarship_amount: 0,
      coupon_amount: 0,
      gst_percent: 18.00,
      gst_amount: 20700.00,
      grand_total: 135700.00,
      status: 'draft',
    })
    .select('id, invoice_no')
    .single()

  if (invErr) {
    console.error('INVOICE INSERT FAILED:', invErr)
    throw invErr
  }
  console.log(` Created Tax Invoice: ${newInvoice.invoice_no} (ID: ${newInvoice.id})`)

  // Insert invoice line items
  const { error: itemsErr } = await supabase.from('invoice_items').insert({
    invoice_id: newInvoice.id,
    description: 'Ground School Module 1 Tuition',
    quantity: 1,
    unit_price: 120000.00,
    line_total: 115000.00,
  })

  if (itemsErr) console.error('INVOICE ITEMS INSERT ERROR:', itemsErr)

  // Update Quotation Status to 'converted'
  const { error: qUpdateErr } = await supabase
    .from('quotations')
    .update({ status: 'converted' })
    .eq('id', quotation.id)

  if (qUpdateErr) throw qUpdateErr
  console.log(` Updated Quotation status to 'converted'.`)

  // 4. Test Invoices List Query (as executed in InvoiceList.tsx)
  console.log('\n--- Testing Invoices List Query Retrieval ---')
  const { data: invoicesList, error: listErr } = await supabase
    .from('invoices')
    .select(`
      *,
      students (
        id,
        name,
        admission_no,
        phone
      ),
      enrollments (
        id,
        courses (
          id,
          name
        )
      ),
      course_terms (
        id,
        term_label
      )
    `)
    .eq('id', newInvoice.id)

  if (listErr) {
    console.error('INVOICES LIST QUERY ERROR:', listErr)
    throw listErr
  }

  // Fetch balances map
  const { data: balancesMap } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', newInvoice.id)

  console.log(` Invoices List Query result:`, invoicesList)
  console.log(` Invoice Balances result:`, balancesMap)

  // 5. Verify source quotation status
  const { data: updatedQuote } = await supabase
    .from('quotations')
    .select('status')
    .eq('id', quotation.id)
    .single()

  console.log(` Verified Source Quotation Status: ${updatedQuote.status}`)

  if (invoicesList.length === 0) {
    throw new Error('FAILED: New converted invoice did not appear in the invoices list query!')
  }
  if (updatedQuote.status !== 'converted') {
    throw new Error('FAILED: Source quotation status was not updated to converted!')
  }

  // Cleanup
  await supabase.from('invoice_items').delete().eq('invoice_id', newInvoice.id)
  await supabase.from('invoices').delete().eq('id', newInvoice.id)
  await supabase.from('quotation_items').delete().eq('quotation_id', quotation.id)
  await supabase.from('quotations').delete().eq('id', quotation.id)
  await supabase.from('students').delete().eq('id', student.id)
  console.log('\n Cleaned up test data.')

  console.log('\n====================================================')
  console.log('QUOTATION CONVERSION & INVOICE REFLECTION VERIFIED!')
  console.log('====================================================')
}

testQuotationConversion().catch((err) => {
  console.error('Conversion Test Error:', err)
  process.exit(1)
})
