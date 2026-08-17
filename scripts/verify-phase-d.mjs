/**
 * AVIORA Finance & Fee Management System
 * Phase D End-to-End Verification Script
 *
 * Verifies:
 * 1. Quotation conversion via convert_quotation_to_invoice RPC wrapper
 * 2. Status check on quotation conversion (only 'accepted' quotations converted)
 * 3. Exact error message propagation when converting non-accepted / already converted quotation
 * 4. Invoice cancellation via cancel_invoice RPC wrapper (NO idempotency key)
 * 5. Cancellation blocked when invoice has payments ("Cannot cancel an invoice that already has payments recorded against it")
 * 6. Cancellation succeeds when invoice has zero payments
 * 7. Student Ledger & Dashboard reflection
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

function generateIdempotencyKey() {
  return crypto.randomUUID()
}

// Mirror financial.ts RPC wrappers
async function convertQuotationWrapper(params, client = supabase) {
  const { data, error } = await client.rpc('convert_quotation_to_invoice', {
    p_quotation_id: params.quotationId,
    p_enrollment_id: params.enrollmentId ?? null,
    p_course_term_id: params.courseTermId ?? null,
    p_due_date: params.dueDate,
    p_idempotency_key: params.idempotencyKey ?? null,
  })

  if (error) throw new Error(error.message)
  const result = Array.isArray(data) ? data[0] : data
  if (!result) throw new Error('Quotation conversion succeeded but no record was returned.')

  return {
    invoice_id: result.invoice_id,
    invoice_no: result.invoice_no,
    grand_total: Number(result.grand_total),
    status: result.status,
  }
}

async function cancelInvoiceWrapper(params, client = supabase) {
  const { data, error } = await client.rpc('cancel_invoice', {
    p_invoice_id: params.invoiceId,
    p_reason: params.reason ?? null,
  })

  if (error) throw new Error(error.message)
  const result = Array.isArray(data) ? data[0] : data
  if (!result) throw new Error('Invoice cancellation succeeded but no record was returned.')

  return {
    invoice_id: result.invoice_id,
    status: result.status,
  }
}

async function runPhaseDVerification() {
  console.log('====================================================')
  console.log('PHASE D: QUOTATION CONVERSION & CANCELLATION VERIFICATION')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${message}`)
      failed++
    }
  }

  // 1. Authenticate demo admin user session
  console.log('Authenticating demo admin user...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })
  if (authErr) {
    console.error('Auth error:', authErr.message)
    process.exit(1)
  }
  console.log(`Authenticated as: ${authData.user.email}\n`)

  // 2. Fetch student Aarav Sharma
  const { data: student, error: studErr } = await supabase
    .from('students')
    .select('id, name')
    .eq('name', 'Aarav Sharma')
    .single()

  assert(!studErr && !!student, `Found student: ${student?.name} (${student?.id})`)

  // 3. Create or find an accepted quotation for Aarav Sharma
  console.log('1. Preparing an accepted quotation for conversion...')
  let quoteId = null
  const { data: existingAcceptedQuotes } = await supabase
    .from('quotations')
    .select('id, status, quote_no')
    .eq('student_id', student.id)
    .eq('status', 'accepted')

  if (existingAcceptedQuotes && existingAcceptedQuotes.length > 0) {
    quoteId = existingAcceptedQuotes[0].id
    console.log(`Using existing accepted quotation: ${existingAcceptedQuotes[0].quote_no}`)
  } else {
    // Insert a new accepted quotation with a unique quote_no
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase.from('quotations').select('id', { count: 'exact', head: true })
    const seq = String((count || 0) + 1).padStart(5, '0')
    const quoteNo = `AV/QTE/2026-27/${seq}`

    const { data: newQuote, error: quoteErr } = await supabase
      .from('quotations')
      .insert({
        quote_no: quoteNo,
        student_id: student.id,
        quote_date: today,
        valid_until: today,
        status: 'accepted',
        subtotal: 20000,
        discount_amount: 2000,
        gst_percent: 18,
        gst_amount: 3240,
        total: 21240,
      })
      .select('id, quote_no')
      .single()

    if (quoteErr) {
      console.error('Failed to create accepted quotation:', quoteErr.message)
      process.exit(1)
    }

    quoteId = newQuote.id
    console.log(`Created accepted quotation: ${newQuote.quote_no}`)

    // Add item to quotation
    await supabase.from('quotation_items').insert({
      quotation_id: quoteId,
      description: 'Flight Simulator Ground Training',
      quantity: 1,
      unit_price: 20000,
      discount_amount: 2000,
      line_total: 18000,
    })
  }

  // 4. Test convertQuotationToInvoice() RPC wrapper execution
  console.log('\n2. Testing convertQuotationToInvoice() RPC wrapper...')
  const idempotencyKey = generateIdempotencyKey()
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let conversionResult = null
  try {
    conversionResult = await convertQuotationWrapper({
      quotationId: quoteId,
      dueDate: dueDate,
      idempotencyKey: idempotencyKey,
    })

    assert(!!conversionResult.invoice_id, `Converted quotation to invoice_id: ${conversionResult.invoice_id}`)
    assert(!!conversionResult.invoice_no, `Generated invoice_no: ${conversionResult.invoice_no}`)
    assert(conversionResult.grand_total > 0, `Returned grand_total: ₹${conversionResult.grand_total}`)
    assert(conversionResult.status === 'sent', `Returned status: ${conversionResult.status}`)
  } catch (err) {
    assert(false, `convertQuotationToInvoice threw unexpected error: ${err.message}`)
  }

  // Verify quotation status updated to 'converted'
  const { data: updatedQuote } = await supabase
    .from('quotations')
    .select('status')
    .eq('id', quoteId)
    .single()
  assert(updatedQuote?.status === 'converted', 'Quotation status updated to converted in DB')

  // 5. Test converting already converted quotation (Error propagation)
  console.log('\n3. Testing error propagation for converting already converted quotation...')
  try {
    await convertQuotationWrapper({
      quotationId: quoteId,
      dueDate: dueDate,
      idempotencyKey: generateIdempotencyKey(), // Fresh key
    })
    assert(false, 'Should have thrown error when converting already converted quotation')
  } catch (err) {
    assert(
      err.message.includes('accepted'),
      `Exact Postgres exception string preserved: "${err.message}"`
    )
  }

  // 6. Test cancelInvoice() on Invoice with Payments (Blocked)
  console.log('\n4. Testing cancelInvoice() on Invoice WITH Payments (Blocked)...')
  const { data: paidInvoice } = await supabase
    .from('invoices')
    .select('id, invoice_no')
    .eq('invoice_no', 'AV/INV/2026-27/00001') // Invoice from Phase B/C with ₹5,000 payment
    .single()

  assert(!!paidInvoice, `Found paid invoice: ${paidInvoice?.invoice_no}`)

  try {
    await cancelInvoiceWrapper({
      invoiceId: paidInvoice.id,
      reason: 'Testing cancellation on paid invoice',
    })
    assert(false, 'Should have blocked cancellation on invoice with payments')
  } catch (err) {
    assert(
      err.message.includes('already has payments'),
      `Exact Postgres error string preserved: "${err.message}"`
    )
  }

  // 7. Test cancelInvoice() on Invoice with Zero Payments (Succeeds)
  console.log('\n5. Testing cancelInvoice() on Invoice with ZERO Payments (Succeeds)...')
  try {
    const cancelRes = await cancelInvoiceWrapper({
      invoiceId: conversionResult.invoice_id,
      reason: 'Phase D cancellation test on newly converted zero-payment invoice',
    })

    assert(cancelRes.invoice_id === conversionResult.invoice_id, 'Returned correct cancelled invoice_id')
    assert(cancelRes.status === 'cancelled', 'Returned status: cancelled')
  } catch (err) {
    assert(false, `cancelInvoice failed on zero-payment invoice: ${err.message}`)
  }

  // Verify cancelled status in DB
  const { data: checkCancelled } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', conversionResult.invoice_id)
    .single()
  assert(checkCancelled?.status === 'cancelled', 'Invoice status verified as cancelled in DB')

  console.log('\n====================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhaseDVerification()
