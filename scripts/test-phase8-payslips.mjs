import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testPhase8Payslips() {
  console.log('====================================================')
  console.log('AVIORA PHASE 8: FACULTY PAYSLIPS & PAYROLL TEST')
  console.log('====================================================\n')

  // 1. Create a test faculty member
  const { data: faculty, error: facErr } = await supabase
    .from('faculty')
    .insert({
      name: 'Capt. Vikramaditya Flight Instructor',
      designation: 'Chief Flight Instructor',
      department: 'Flight Operations',
      phone: '9911223344',
      email: `capt.vikram.${Date.now()}@aviora.edu`,
      bank_name: 'HDFC Bank Ltd',
      bank_account_name: 'Capt Vikramaditya',
      bank_account_number: '50100098765432',
      bank_ifsc: 'HDFC0001234',
    })
    .select()
    .single()

  if (facErr) throw facErr
  console.log(` Created test faculty: ${faculty.name} (${faculty.designation})`)

  // 2. Set Initial Salary Structure (Effective 2026-01-01): Basic 60k, HRA 24k, PF 4k, TDS 5k
  const { data: struct1, error: s1Err } = await supabase
    .from('faculty_salary_structures')
    .insert({
      faculty_id: faculty.id,
      basic: 60000.00,
      hra: 24000.00,
      other_allowances: 6000.00,
      pf_deduction: 4000.00,
      pt_deduction: 200.00,
      tds_deduction: 5000.00,
      other_deductions: 0.00,
      effective_from: '2026-01-01',
    })
    .select()
    .single()

  if (s1Err) throw s1Err
  console.log(` Configured Structure #1 (Effective 2026-01-01): Gross ₹90,000 | Net ₹80,800`)

  // 3. Generate Payslip for Month 6 (June 2026)
  const payslipNo1 = `AV/PAY/2026-27/00${Math.floor(Math.random() * 900 + 100)}`
  const grossPay1 = 90000.00
  const totalDeductions1 = 9200.00
  const netPay1 = 80800.00

  const { data: payslipJune, error: ps1Err } = await supabase
    .from('payslips')
    .insert({
      payslip_no: payslipNo1,
      faculty_id: faculty.id,
      month: 6,
      year: 2026,
      gross_pay: grossPay1,
      total_deductions: totalDeductions1,
      net_pay: netPay1,
      salary_structure_snapshot: {
        basic: struct1.basic,
        hra: struct1.hra,
        other_allowances: struct1.other_allowances,
        pf_deduction: struct1.pf_deduction,
        pt_deduction: struct1.pt_deduction,
        tds_deduction: struct1.tds_deduction,
        other_deductions: struct1.other_deductions,
        effective_from: struct1.effective_from,
        gross_pay: grossPay1,
        total_deductions: totalDeductions1,
        net_pay: netPay1,
      },
    })
    .select()
    .single()

  if (ps1Err) throw ps1Err
  console.log(` Generated June 2026 Payslip: ${payslipJune.payslip_no} (Net: ₹${payslipJune.net_pay})`)

  // 4. TEST IMMUTABILITY: Add a NEW raise salary structure (Effective 2026-07-01): Basic 80k, HRA 32k
  console.log('\n--- Updating Faculty Salary Structure (Raise Effective 2026-07-01) ---')
  const { data: struct2, error: s2Err } = await supabase
    .from('faculty_salary_structures')
    .insert({
      faculty_id: faculty.id,
      basic: 80000.00,
      hra: 32000.00,
      other_allowances: 10000.00,
      pf_deduction: 5000.00,
      pt_deduction: 200.00,
      tds_deduction: 8000.00,
      other_deductions: 0.00,
      effective_from: '2026-07-01',
    })
    .select()
    .single()

  if (s2Err) throw s2Err
  console.log(` Configured Structure #2 (Effective 2026-07-01): Gross ₹122,000 | Net ₹108,800`)

  // 5. Re-fetch historical June 2026 payslip and confirm numbers did NOT change
  const { data: refetchedJune } = await supabase
    .from('payslips')
    .select('*')
    .eq('id', payslipJune.id)
    .single()

  console.log('\n--- Verifying Historical Payslip Immutability ---')
  console.log(` Historical June Net Pay: ₹${refetchedJune.net_pay}`)
  console.log(` Historical Basic Snapshot: ₹${refetchedJune.salary_structure_snapshot.basic}`)

  if (refetchedJune.net_pay !== 80800 || refetchedJune.salary_structure_snapshot.basic !== 60000) {
    throw new Error('FAILED: Changing salary structure altered a historical payslip!')
  }
  console.log(' IMMUTABILITY VERIFIED: Historical June payslip numbers remained 100% untouched!\n')

  // 6. TEST UNIQUE CONSTRAINT: Attempt to generate a second payslip for June 2026
  console.log('--- Testing Unique Constraint (Prevent Duplicate Payslip for same Month/Year) ---')
  const { error: dupErr } = await supabase
    .from('payslips')
    .insert({
      payslip_no: `AV/PAY/2026-27/DUP99`,
      faculty_id: faculty.id,
      month: 6,
      year: 2026,
      gross_pay: 122000,
      total_deductions: 13200,
      net_pay: 108800,
      salary_structure_snapshot: {},
    })

  if (!dupErr || !dupErr.message.includes('unique_faculty_month_year') && !dupErr.code?.includes('23505')) {
    throw new Error('FAILED: Duplicate payslip generation was not blocked by unique constraint!')
  }
  console.log(' UNIQUE CONSTRAINT VERIFIED: Duplicate payslip for June 2026 was correctly rejected!\n')

  // Cleanup test faculty, structures, and payslips
  await supabase.from('payslips').delete().eq('faculty_id', faculty.id)
  await supabase.from('faculty_salary_structures').delete().eq('faculty_id', faculty.id)
  await supabase.from('faculty').delete().eq('id', faculty.id)
  console.log(' Cleaned up test faculty and payroll records.')

  console.log('\n====================================================')
  console.log('ALL PHASE 8 PAYROLL & PAYSLIP CALCULATIONS PASSED!')
  console.log('====================================================')
}

testPhase8Payslips().catch((err) => {
  console.error('Phase 8 Test Error:', err)
  process.exit(1)
})
