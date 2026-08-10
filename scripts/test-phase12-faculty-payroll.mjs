import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testFacultyPayrollFlow() {
  console.log('====================================================')
  console.log('TESTING FACULTY SALARY STRUCTURE & PAYSLIP FLOW')
  console.log('====================================================\n')

  // 1. Create a test faculty member
  const { data: faculty, error: facErr } = await supabase
    .from('faculty')
    .insert({
      name: 'Capt. Payroll Test',
      email: `payroll_${Date.now()}@aviora.edu`,
      phone: '9900112233',
      designation: 'Senior Flight Instructor',
      department: 'Flight Operations',
      active: true,
    })
    .select()
    .single()

  if (facErr) throw facErr
  console.log(` 1. Created Faculty: ${faculty.name} (${faculty.employee_id})`)

  // 2. Insert initial Salary Structure #1 (Effective 2026-01-01)
  console.log('\n--- Inserting Initial Salary Structure #1 ---')
  const { data: struct1, error: s1Err } = await supabase
    .from('faculty_salary_structures')
    .insert({
      faculty_id: faculty.id,
      basic: 60000,
      hra: 24000,
      other_allowances: 10000,
      pf_deduction: 3600,
      pt_deduction: 200,
      tds_deduction: 6000,
      other_deductions: 0,
      effective_from: '2026-01-01',
    })
    .select()
    .single()

  if (s1Err) throw s1Err
  console.log(` Structure #1 Saved: Basic = ₹${struct1.basic}, Effective = ${struct1.effective_from}`)

  // 3. Insert updated Salary Structure #2 (Effective 2026-08-08) — raise
  console.log('\n--- Inserting Updated Salary Structure #2 (Raise) ---')
  const { data: struct2, error: s2Err } = await supabase
    .from('faculty_salary_structures')
    .insert({
      faculty_id: faculty.id,
      basic: 75000,
      hra: 30000,
      other_allowances: 15000,
      pf_deduction: 4500,
      pt_deduction: 200,
      tds_deduction: 8000,
      other_deductions: 0,
      effective_from: '2026-08-08',
    })
    .select()
    .single()

  if (s2Err) throw s2Err
  console.log(` Structure #2 Saved: Basic = ₹${struct2.basic}, Effective = ${struct2.effective_from}`)

  // Verify total structure rows preserved for faculty
  const { data: allStructs } = await supabase
    .from('faculty_salary_structures')
    .select('id, basic, effective_from')
    .eq('faculty_id', faculty.id)
    .order('effective_from', { ascending: false })

  console.log(` Total Salary Structure History Rows Preserved: ${allStructs.length}`)
  if (allStructs.length !== 2) {
    throw new Error(`Expected 2 historical structure rows, got ${allStructs.length}`)
  }

  // 4. Test Querying Effective Structure for August 2026 (month = 8, year = 2026)
  console.log('\n--- Testing Effective Structure Query for August 2026 ---')
  const lastDayOfMonth = '2026-08-31'
  let { data: effectiveForAug } = await supabase
    .from('faculty_salary_structures')
    .select('*')
    .eq('faculty_id', faculty.id)
    .lte('effective_from', lastDayOfMonth)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!effectiveForAug) {
    // Fallback to latest overall structure
    const { data: latest } = await supabase
      .from('faculty_salary_structures')
      .select('*')
      .eq('faculty_id', faculty.id)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()
    effectiveForAug = latest
  }

  console.log(` Effective Structure Retrieved for August 2026: Basic = ₹${effectiveForAug.basic}`)
  if (effectiveForAug.basic !== 75000) {
    throw new Error(`Expected effective basic ₹75,000 for August 2026, got ₹${effectiveForAug.basic}`)
  }

  // 5. Generate Payslip #1 for August 2026
  console.log('\n--- Generating Payslip #1 for August 2026 ---')
  const gross = Number(effectiveForAug.basic) + Number(effectiveForAug.hra) + Number(effectiveForAug.other_allowances)
  const deductions = Number(effectiveForAug.pf_deduction) + Number(effectiveForAug.pt_deduction) + Number(effectiveForAug.tds_deduction) + Number(effectiveForAug.other_deductions)
  const net = gross - deductions

  const { data: payslip1, error: p1Err } = await supabase
    .from('payslips')
    .insert({
      payslip_no: `AV/PAY/2026-27/TEST1_${Date.now()}`,
      faculty_id: faculty.id,
      month: 8,
      year: 2026,
      gross_pay: gross,
      total_deductions: deductions,
      net_pay: net,
      salary_structure_snapshot: {
        basic: effectiveForAug.basic,
        hra: effectiveForAug.hra,
        other_allowances: effectiveForAug.other_allowances,
        pf_deduction: effectiveForAug.pf_deduction,
        pt_deduction: effectiveForAug.pt_deduction,
        tds_deduction: effectiveForAug.tds_deduction,
        other_deductions: effectiveForAug.other_deductions,
        gross_pay: gross,
        total_deductions: deductions,
        net_pay: net,
      },
    })
    .select()
    .single()

  if (p1Err) throw p1Err
  console.log(` Payslip #1 Generated: ${payslip1.payslip_no} (Gross: ₹${payslip1.gross_pay}, Net: ₹${payslip1.net_pay})`)

  // 6. Test Duplicate Generation Protection for August 2026
  console.log('\n--- Testing Duplicate Generation Block ---')
  const { error: dupErr } = await supabase
    .from('payslips')
    .insert({
      payslip_no: `AV/PAY/2026-27/DUP_${Date.now()}`,
      faculty_id: faculty.id,
      month: 8,
      year: 2026,
      gross_pay: gross,
      total_deductions: deductions,
      net_pay: net,
      salary_structure_snapshot: {},
    })

  if (dupErr) {
    console.log(` Duplicate Generation Successfully Blocked by Postgres Unique Constraint! Error: ${dupErr.message} (Code: ${dupErr.code})`)
  } else {
    throw new Error('FAILED: Duplicate payslip generation was not blocked!')
  }

  // Cleanup
  await supabase.from('payslips').delete().eq('id', payslip1.id)
  await supabase.from('faculty_salary_structures').delete().eq('faculty_id', faculty.id)
  await supabase.from('faculty').delete().eq('id', faculty.id)
  console.log('\n Cleaned up test records.')

  console.log('\n====================================================')
  console.log('FACULTY PAYROLL FLOW VERIFIED 100% SUCCESSFUL!')
  console.log('====================================================')
}

testFacultyPayrollFlow().catch((err) => {
  console.error('Faculty Payroll Test Error:', err)
  process.exit(1)
})
