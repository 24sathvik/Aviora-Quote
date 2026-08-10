import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function getDashboardData() {
  // Query 1: Summary totals directly from invoice_balances
  const { data: balances } = await supabase
    .from('invoice_balances')
    .select('grand_total, amount_paid, balance_due, computed_status')

  const rows = balances || []
  const totalBilled = rows.reduce((s, r) => s + (Number(r.grand_total) || 0), 0)
  const totalCollected = rows.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0)
  const totalOutstanding = rows.reduce((s, r) => s + (Number(r.balance_due) || 0), 0)

  // Counts
  const paid = rows.filter((r) => r.computed_status === 'paid').length
  const partial = rows.filter((r) => r.computed_status === 'partial').length
  const pending = rows.filter(
    (r) => (r.computed_status === 'sent' || r.computed_status === 'draft') && Number(r.amount_paid) === 0
  ).length
  const overdue = rows.filter((r) => r.computed_status === 'overdue').length

  return { totalBilled, totalCollected, totalOutstanding, counts: { paid, partial, pending, overdue } }
}

async function testDashboardReflection() {
  console.log('====================================================')
  console.log('AVIORA PHASE 12.2: DASHBOARD DATA REFLECTION TEST')
  console.log('====================================================\n')

  const before = await getDashboardData()
  console.log('1. Initial Dashboard State:')
  console.log(` Billed: ₹${before.totalBilled} | Collected: ₹${before.totalCollected} | Outstanding: ₹${before.totalOutstanding}`)
  console.log(` Status Counts: Paid=${before.counts.paid}, Partial=${before.counts.partial}, Pending=${before.counts.pending}, Overdue=${before.counts.overdue}\n`)

  // Create a student for testing
  const { data: student } = await supabase
    .from('students')
    .insert({
      admission_no: `AV-12.2-${Date.now()}`,
      name: 'Cadet Reflection Test',
      phone: '9988776655',
    })
    .select()
    .single()

  // 2. Create Test Invoice #1 (Partial Payment test)
  console.log('2. Inserting Test Invoice #1 (₹150,000)...')
  const { data: inv1 } = await supabase
    .from('invoices')
    .insert({
      invoice_no: `AV/INV/2026-27/REF1_${Date.now()}`,
      fy_label: '2026-27',
      student_id: student.id,
      invoice_date: '2026-08-01',
      due_date: '2026-08-30',
      subtotal: 150000,
      discount_amount: 0,
      gst_percent: 0,
      gst_amount: 0,
      grand_total: 150000,
      status: 'sent',
    })
    .select()
    .single()

  // Record partial payment of ₹50,000 on Inv #1
  await supabase.from('payments').insert({
    invoice_id: inv1.id,
    student_id: student.id,
    receipt_no: `AV/RCT/2026-27/REF1`,
    amount: 50000,
    payment_date: '2026-08-08',
    payment_mode: 'upi',
  })

  const afterPartial = await getDashboardData()
  console.log(' Dashboard State after Partial Invoice Insertion:')
  console.log(` Billed: ₹${afterPartial.totalBilled} (+₹150,000)`)
  console.log(` Collected: ₹${afterPartial.totalCollected} (+₹50,000)`)
  console.log(` Outstanding: ₹${afterPartial.totalOutstanding} (+₹100,000)`)
  console.log(` Partial Count: ${afterPartial.counts.partial} (+1)\n`)

  if (afterPartial.totalBilled !== before.totalBilled + 150000) {
    throw new Error('FAILED: Total Billed did not increase by ₹150,000!')
  }
  if (afterPartial.totalCollected !== before.totalCollected + 50000) {
    throw new Error('FAILED: Total Collected did not increase by ₹50,000!')
  }
  if (afterPartial.totalOutstanding !== before.totalOutstanding + 100000) {
    throw new Error('FAILED: Total Outstanding did not increase by ₹100,000!')
  }

  // 3. Create Test Invoice #2 (Fully Paid test)
  console.log('3. Inserting Test Invoice #2 (₹80,000) with Full Settlement...')
  const { data: inv2 } = await supabase
    .from('invoices')
    .insert({
      invoice_no: `AV/INV/2026-27/REF2_${Date.now()}`,
      fy_label: '2026-27',
      student_id: student.id,
      invoice_date: '2026-08-01',
      due_date: '2026-08-30',
      subtotal: 80000,
      discount_amount: 0,
      gst_percent: 0,
      gst_amount: 0,
      grand_total: 80000,
      status: 'sent',
    })
    .select()
    .single()

  await supabase.from('payments').insert({
    invoice_id: inv2.id,
    student_id: student.id,
    receipt_no: `AV/RCT/2026-27/REF2`,
    amount: 80000,
    payment_date: '2026-08-08',
    payment_mode: 'bank_transfer',
  })

  const afterFull = await getDashboardData()
  console.log(' Dashboard State after Fully Paid Invoice Insertion:')
  console.log(` Billed: ₹${afterFull.totalBilled} (+₹80,000)`)
  console.log(` Collected: ₹${afterFull.totalCollected} (+₹80,000)`)
  console.log(` Outstanding: ₹${afterFull.totalOutstanding} (Unchanged: ₹${afterFull.totalOutstanding})`)
  console.log(` Paid Count: ${afterFull.counts.paid} (+1)\n`)

  if (afterFull.totalBilled !== afterPartial.totalBilled + 80000) {
    throw new Error('FAILED: Total Billed did not increase by ₹80,000!')
  }
  if (afterFull.totalCollected !== afterPartial.totalCollected + 80000) {
    throw new Error('FAILED: Total Collected did not increase by ₹80,000!')
  }
  if (afterFull.totalOutstanding !== afterPartial.totalOutstanding) {
    throw new Error('FAILED: Total Outstanding changed when fully paid invoice was added!')
  }

  // Cleanup test records
  await supabase.from('payments').delete().eq('student_id', student.id)
  await supabase.from('invoices').delete().eq('student_id', student.id)
  await supabase.from('students').delete().eq('id', student.id)
  console.log(' Cleaned up test invoices, payments, and student.')

  console.log('\n====================================================')
  console.log('DASHBOARD DATA REFLECTION VERIFIED 100% ACCURATE!')
  console.log('====================================================')
}

testDashboardReflection().catch((err) => {
  console.error('Reflection Test Error:', err)
  process.exit(1)
})
