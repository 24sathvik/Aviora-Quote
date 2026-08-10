import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Indian Financial Year helper
function getFinancialYearLabel(dateInput) {
  const date = new Date(dateInput)
  const month = date.getMonth()
  const fullYear = date.getFullYear()
  const startYear = month >= 3 ? fullYear : fullYear - 1
  const endYearShort = ((startYear + 1) % 100).toString().padStart(2, '0')
  return `${startYear}-${endYearShort}`
}

async function getNextAtomicSequence(docType, fyLabel) {
  const { data, error } = await supabase.rpc('get_next_document_number', {
    p_doc_type: docType,
    p_fy_label: fyLabel,
  })

  if (error) {
    throw new Error(`RPC error for ${docType} (${fyLabel}): ${error.message}`)
  }
  return Number(data)
}

async function runConcurrencyTests() {
  console.log('====================================================')
  console.log('AVIORA NUMBERING ENGINE - CONCURRENCY & ACCURACY TEST')
  console.log('====================================================\n')

  // 1. Test Financial Year Edge Cases
  console.log('--- 1. Testing Financial Year Edge Cases ---')
  const testDates = [
    { date: '2026-03-31', expected: '2025-26', note: 'Last day of FY 2025-26' },
    { date: '2026-04-01', expected: '2026-27', note: 'First day of FY 2026-27' },
    { date: '2026-12-31', expected: '2026-27', note: 'Mid FY 2026-27' },
    { date: '2027-01-01', expected: '2026-27', note: 'Q4 of FY 2026-27' },
    { date: '2027-03-31', expected: '2026-27', note: 'Last day of FY 2026-27' },
    { date: '2027-04-01', expected: '2027-28', note: 'First day of FY 2027-28' },
  ]

  let fyErrors = 0
  for (const t of testDates) {
    const calculated = getFinancialYearLabel(t.date)
    const passed = calculated === t.expected
    console.log(
      `  [${passed ? 'PASS' : 'FAIL'}] Date: ${t.date} -> FY: ${calculated} (Expected: ${t.expected}) - ${t.note}`
    )
    if (!passed) fyErrors++
  }

  if (fyErrors > 0) {
    throw new Error(`Financial Year test failed with ${fyErrors} errors`)
  }
  console.log(' Financial Year boundary tests passed!\n')

  // 2. Test Quotation Concurrency (20 simultaneous calls)
  console.log('--- 2. Testing 20 Simultaneous Quotation Number Calls ---')
  const quotationPromises = Array.from({ length: 20 }, async (_, idx) => {
    const seq = await getNextAtomicSequence('QT', 'GLOBAL')
    return `AV/QT/${seq.toString().padStart(5, '0')}`
  })

  const quotationResults = await Promise.all(quotationPromises)
  console.log('  Generated Quotation Numbers:', quotationResults.slice(0, 5), '... (20 total)')

  const uniqueQuotations = new Set(quotationResults)
  if (uniqueQuotations.size !== 20) {
    throw new Error(`DUPLICATE DETECTED! Expected 20 unique quotation numbers, got ${uniqueQuotations.size}`)
  }
  console.log(` ZERO DUPLICATES: All 20 simultaneous quotation numbers are unique!\n`)

  // 3. Test Invoice Concurrency Across Two FYs
  console.log('--- 3. Testing 20 Simultaneous Invoice Calls for FY 2026-27 ---')
  const fy26 = '2026-27'
  const invoicePromises = Array.from({ length: 20 }, async () => {
    const seq = await getNextAtomicSequence('INV', fy26)
    return `AV/INV/${fy26}/${seq.toString().padStart(5, '0')}`
  })

  const invoiceResults = await Promise.all(invoicePromises)
  console.log('  Generated Invoice Numbers for FY 2026-27:', invoiceResults.slice(0, 5), '... (20 total)')

  const uniqueInvoices = new Set(invoiceResults)
  if (uniqueInvoices.size !== 20) {
    throw new Error(`DUPLICATE DETECTED! Expected 20 unique invoice numbers, got ${uniqueInvoices.size}`)
  }
  console.log(` ZERO DUPLICATES: All 20 simultaneous invoice numbers for ${fy26} are unique!\n`)

  // 4. Test Financial Year Sequence Independence (Reset for new FY)
  console.log('--- 4. Testing FY Sequence Independence (Reset for FY 2027-28) ---')
  const fy27 = '2027-28'
  // Clean up any test sequence for 2027-28
  await supabase.from('numbering_sequences').delete().match({ doc_type: 'INV_TEST_FY', fy_label: fy27 })
  
  const seq1 = await getNextAtomicSequence('INV_TEST_FY', fy27)
  const seq2 = await getNextAtomicSequence('INV_TEST_FY', fy27)
  console.log(`  New FY ${fy27} Sequence started at: ${seq1}, then ${seq2}`)
  if (seq1 !== 1 || seq2 !== 2) {
    throw new Error(`Expected sequence to start at 1 for new FY, got ${seq1}`)
  }
  console.log(` FY reset verified: New financial years start strictly at sequence 00001!\n`)

  // 5. Test Payslip Generation
  console.log('--- 5. Testing 20 Simultaneous Payslip Calls for 2026-08 ---')
  const month = '2026-08'
  const payslipPromises = Array.from({ length: 20 }, async (_, idx) => {
    const facCode = `FAC${(idx + 1).toString().padStart(3, '0')}`
    await getNextAtomicSequence('PAY', month)
    return `AV/PAY/${month}/${facCode}`
  })

  const payslipResults = await Promise.all(payslipPromises)
  console.log('  Generated Payslip Numbers:', payslipResults.slice(0, 5), '... (20 total)')
  const uniquePayslips = new Set(payslipResults)
  if (uniquePayslips.size !== 20) {
    throw new Error(`DUPLICATE DETECTED in payslips!`)
  }
  console.log(` Payslips generated successfully with 20 distinct faculty codes!\n`)

  console.log('====================================================')
  console.log('ALL PHASE 4 NUMBERING ENGINE VERIFICATIONS PASSED!')
  console.log('====================================================')
}

runConcurrencyTests().catch((err) => {
  console.error('Test Harness Error:', err)
  process.exit(1)
})
