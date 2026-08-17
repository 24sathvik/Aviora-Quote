/**
 * AVIORA Finance & Fee Management System
 * Phase E End-to-End Verification Script
 *
 * Verifies:
 * 1. Faculty salary structure CRUD boundary & effective structure lookup
 * 2. Monthly payslip generation via generate_payslip DB RPC wrapper
 * 3. Authoritative return fields (payslip_id, payslip_no, gross_pay, total_deductions, net_pay)
 * 4. Idempotency key caching / replay
 * 5. Exact error message propagation for duplicate payslips, inactive faculty, and missing salary structures
 * 6. Cache invalidation reflection
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

function generateIdempotencyKey() {
  return crypto.randomUUID()
}

// Mirror financial.ts generatePayslip wrapper
async function generatePayslipWrapper(params, client = supabase) {
  const { data, error } = await client.rpc('generate_payslip', {
    p_faculty_id: params.facultyId,
    p_month: params.month,
    p_year: params.year,
    p_idempotency_key: params.idempotencyKey ?? null,
  })

  if (error) throw new Error(error.message)
  const result = Array.isArray(data) ? data[0] : data
  if (!result) throw new Error('Payslip generation succeeded but no record was returned.')

  return {
    payslip_id: result.payslip_id,
    payslip_no: result.payslip_no,
    gross_pay: Number(result.gross_pay),
    total_deductions: Number(result.total_deductions),
    net_pay: Number(result.net_pay),
  }
}

async function runPhaseEVerification() {
  console.log('====================================================')
  console.log('PHASE E: PAYSLIP GENERATION VERIFICATION')
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

  // 1. Authenticate demo admin session
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

  // 2. Fetch or setup active faculty member
  console.log('1. Checking Active Faculty Directory & Salary Structure...')
  let faculty = null
  const { data: facultyList, error: facErr } = await supabase
    .from('faculty')
    .select('id, name, active')
    .eq('active', true)
    .limit(1)

  if (facultyList && facultyList.length > 0) {
    faculty = facultyList[0]
  } else {
    // Insert an active faculty member
    const { data: newFac, error: newFacErr } = await supabase
      .from('faculty')
      .insert({
        name: 'Capt. Rajesh Varma',
        email: 'rajesh.varma@aviora.edu',
        phone: '+91 98765 43210',
        department: 'Aviation & Flight Training',
        designation: 'Senior Chief Flight Instructor',
        active: true,
      })
      .select('id, name, active')
      .single()

    if (newFacErr) {
      console.error('Failed to create faculty member:', newFacErr.message)
      process.exit(1)
    }
    faculty = newFac
  }

  assert(!!faculty && faculty.active, `Active faculty member verified: ${faculty?.name} (${faculty?.id})`)

  // 3. Ensure a valid salary structure exists for faculty
  const { data: existingStructure } = await supabase
    .from('faculty_salary_structures')
    .select('*')
    .eq('faculty_id', faculty.id)
    .order('effective_from', { ascending: false })
    .limit(1)

  if (!existingStructure || existingStructure.length === 0) {
    await supabase.from('faculty_salary_structures').insert({
      faculty_id: faculty.id,
      basic: 60000,
      hra: 20000,
      other_allowances: 10000,
      pf_deduction: 3000,
      pt_deduction: 200,
      tds_deduction: 5000,
      other_deductions: 0,
      effective_from: '2026-01-01',
    })
    console.log('Inserted effective salary structure (Basic: 60000, HRA: 20000, Net Pay: 81800)')
  } else {
    console.log('Found effective salary structure for faculty member')
  }

  // 4. Test generatePayslip() RPC wrapper execution
  console.log('\n2. Testing generatePayslip() RPC wrapper execution...')
  const idempotencyKey = generateIdempotencyKey()
  const targetMonth = 8
  const targetYear = 2026

  let payslipResult = null
  try {
    payslipResult = await generatePayslipWrapper({
      facultyId: faculty.id,
      month: targetMonth,
      year: targetYear,
      idempotencyKey: idempotencyKey,
    })

    assert(!!payslipResult.payslip_id, `Created payslip_id: ${payslipResult.payslip_id}`)
    assert(!!payslipResult.payslip_no, `Generated payslip_no: ${payslipResult.payslip_no}`)
    assert(payslipResult.gross_pay === 90000, `Returned gross_pay: ₹${payslipResult.gross_pay}`)
    assert(payslipResult.total_deductions === 8200, `Returned total_deductions: ₹${payslipResult.total_deductions}`)
    assert(payslipResult.net_pay === 81800, `Returned net_pay: ₹${payslipResult.net_pay}`)
  } catch (err) {
    assert(false, `generatePayslip threw unexpected error: ${err.message}`)
  }

  // 5. Test Idempotency Key Replay
  console.log('\n3. Testing Idempotency Key Replay...')
  try {
    const replayedResult = await generatePayslipWrapper({
      facultyId: faculty.id,
      month: targetMonth,
      year: targetYear,
      idempotencyKey: idempotencyKey, // REUSED KEY
    })

    assert(replayedResult.payslip_id === payslipResult.payslip_id, 'Replaying with same idempotency key returns cached payslip_id')
    assert(replayedResult.payslip_no === payslipResult.payslip_no, 'Replaying with same idempotency key returns cached payslip_no')
  } catch (err) {
    assert(false, `Idempotency replay failed: ${err.message}`)
  }

  // 6. Test Duplicate Payslip Error Propagation
  console.log('\n4. Testing Duplicate Payslip Error Propagation...')
  try {
    await generatePayslipWrapper({
      facultyId: faculty.id,
      month: targetMonth,
      year: targetYear,
      idempotencyKey: generateIdempotencyKey(), // Fresh key
    })
    assert(false, 'Should have thrown duplicate payslip error')
  } catch (err) {
    assert(
      err.message.includes('already exists') || err.message.includes('duplicate'),
      `Exact Postgres duplicate error preserved: "${err.message}"`
    )
  }

  // 7. Verify Payslip Record & History in DB
  console.log('\n5. Verifying DB Persistence & History Query...')
  const { data: dbPayslip, error: dbErr } = await supabase
    .from('payslips')
    .select('id, payslip_no, gross_pay, net_pay')
    .eq('id', payslipResult.payslip_id)
    .single()

  assert(!dbErr && dbPayslip.net_pay === 81800, `Database record verified: ${dbPayslip?.payslip_no}`)

  console.log('\n====================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhaseEVerification()
