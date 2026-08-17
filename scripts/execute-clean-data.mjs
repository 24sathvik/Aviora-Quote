import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function executeDataCleanup() {
  console.log('====================================================')
  console.log('EXECUTING APPROVED AVIORA DATA CLEANUP')
  console.log('====================================================\n')

  // 1. Authenticate as admin
  console.log('1. Authenticating as admin user...')
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })
  if (authErr) {
    console.error('Authentication error:', authErr.message)
    process.exit(1)
  }
  console.log(`  Authenticated as: ${auth.user.email} (ID: ${auth.user.id})\n`)

  const deletionLog = []

  // Step 1: Delete Payments (2 records)
  console.log('Step 1: Deleting payments...')
  const paymentIds = [
    'c49848bd-4594-49cd-bc02-c8891c1ff477',
    'ee2836c0-bec8-43e2-81aa-620f30d31cfa',
  ]
  const { data: delPay, error: errPay } = await supabase
    .from('payments')
    .delete()
    .in('id', paymentIds)
    .select('id, receipt_no')
  if (errPay) {
    console.error('Error deleting payments:', errPay.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'payments', count: delPay.length, records: delPay })
  console.log(`  Deleted ${delPay.length} payments:`, delPay)

  // Step 2: Delete Invoice Items (3 records)
  console.log('\nStep 2: Deleting invoice_items...')
  const invoiceItemIds = [
    'a72ca557-f674-416c-91ce-a209f32be1dc',
    '6e532220-6a8f-431c-a67b-606d8e77dba2',
    'e9cf3222-c8b0-4bba-bc33-a459dfca3822',
  ]
  const { data: delInvItems, error: errInvItems } = await supabase
    .from('invoice_items')
    .delete()
    .in('id', invoiceItemIds)
    .select('id')
  if (errInvItems) {
    console.error('Error deleting invoice_items:', errInvItems.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'invoice_items', count: delInvItems.length, records: delInvItems })
  console.log(`  Deleted ${delInvItems.length} invoice_items:`, delInvItems)

  // Step 3: Delete Invoices (3 records)
  console.log('\nStep 3: Deleting invoices...')
  const invoiceIds = [
    'f29abd35-e24c-462a-94b7-2ff4bb241195',
    'a0965e6d-0d9e-4885-b375-ebaeba2364dd',
    'be9538d5-94c5-4e9b-ae20-084e6f656498',
  ]
  const { data: delInvoices, error: errInvoices } = await supabase
    .from('invoices')
    .delete()
    .in('id', invoiceIds)
    .select('id, invoice_no')
  if (errInvoices) {
    console.error('Error deleting invoices:', errInvoices.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'invoices', count: delInvoices.length, records: delInvoices })
  console.log(`  Deleted ${delInvoices.length} invoices:`, delInvoices)

  // Step 4: Delete Quotation Items (2 records)
  console.log('\nStep 4: Deleting quotation_items...')
  const quotationItemIds = [
    'a181ee01-cd3a-4012-9f3d-462a70a50807',
    '3e76b1c1-9291-462c-9925-dae09e17f34b',
  ]
  const { data: delQuoteItems, error: errQuoteItems } = await supabase
    .from('quotation_items')
    .delete()
    .in('id', quotationItemIds)
    .select('id')
  if (errQuoteItems) {
    console.error('Error deleting quotation_items:', errQuoteItems.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'quotation_items', count: delQuoteItems.length, records: delQuoteItems })
  console.log(`  Deleted ${delQuoteItems.length} quotation_items:`, delQuoteItems)

  // Step 5: Delete Quotations (2 records)
  console.log('\nStep 5: Deleting quotations...')
  const quotationIds = [
    '4c458067-58b5-4b7c-91d0-3ca0d8ea2a0e',
    '1a350568-37a5-480d-aa99-042cec1482ff',
  ]
  const { data: delQuotes, error: errQuotes } = await supabase
    .from('quotations')
    .delete()
    .in('id', quotationIds)
    .select('id, quote_no')
  if (errQuotes) {
    console.error('Error deleting quotations:', errQuotes.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'quotations', count: delQuotes.length, records: delQuotes })
  console.log(`  Deleted ${delQuotes.length} quotations:`, delQuotes)

  // Step 6: Delete Enrollments (1 record)
  console.log('\nStep 6: Deleting enrollments...')
  const enrollmentIds = [
    'a2b8311c-50d6-4271-9803-7a99119cd64f',
  ]
  const { data: delEnroll, error: errEnroll } = await supabase
    .from('enrollments')
    .delete()
    .in('id', enrollmentIds)
    .select('id')
  if (errEnroll) {
    console.error('Error deleting enrollments:', errEnroll.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'enrollments', count: delEnroll.length, records: delEnroll })
  console.log(`  Deleted ${delEnroll.length} enrollments:`, delEnroll)

  // Step 7: Delete Students (2 records)
  console.log('\nStep 7: Deleting students...')
  const studentIds = [
    'c7d03884-0f8d-41f9-98f5-cf6c0180ae0f',
    '5885ec4b-a9a6-42f4-a493-b83f20e44777',
  ]
  const { data: delStudents, error: errStudents } = await supabase
    .from('students')
    .delete()
    .in('id', studentIds)
    .select('id, name')
  if (errStudents) {
    console.error('Error deleting students:', errStudents.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'students', count: delStudents.length, records: delStudents })
  console.log(`  Deleted ${delStudents.length} students:`, delStudents)

  // Step 8: Delete Payslips (1 record)
  console.log('\nStep 8: Deleting payslips...')
  const payslipIds = [
    'a1954501-8565-420f-8728-d568ecc812ac',
  ]
  const { data: delPayslips, error: errPayslips } = await supabase
    .from('payslips')
    .delete()
    .in('id', payslipIds)
    .select('id, payslip_no')
  if (errPayslips) {
    console.error('Error deleting payslips:', errPayslips.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'payslips', count: delPayslips.length, records: delPayslips })
  console.log(`  Deleted ${delPayslips.length} payslips:`, delPayslips)

  // Step 9: Delete Faculty Salary Structures (1 record)
  console.log('\nStep 9: Deleting faculty_salary_structures...')
  const salaryStructureIds = [
    '75d9f2ef-92fc-4be5-a84a-a074dbd7973a',
  ]
  const { data: delSalary, error: errSalary } = await supabase
    .from('faculty_salary_structures')
    .delete()
    .in('id', salaryStructureIds)
    .select('id')
  if (errSalary) {
    console.error('Error deleting faculty_salary_structures:', errSalary.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'faculty_salary_structures', count: delSalary.length, records: delSalary })
  console.log(`  Deleted ${delSalary.length} faculty_salary_structures:`, delSalary)

  // Step 10: Delete Faculty (1 record)
  console.log('\nStep 10: Deleting faculty...')
  const facultyIds = [
    '62b3fad7-b38c-4d5e-9f04-9f7dc1f11745',
  ]
  const { data: delFaculty, error: errFaculty } = await supabase
    .from('faculty')
    .delete()
    .in('id', facultyIds)
    .select('id, name')
  if (errFaculty) {
    console.error('Error deleting faculty:', errFaculty.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'faculty', count: delFaculty.length, records: delFaculty })
  console.log(`  Deleted ${delFaculty.length} faculty:`, delFaculty)

  // Step 11: Delete Course Terms (1 record)
  console.log('\nStep 11: Deleting course_terms...')
  const termIds = [
    '0be69aaf-8a99-465b-a9a0-d36348578d9c',
  ]
  const { data: delTerms, error: errTerms } = await supabase
    .from('course_terms')
    .delete()
    .in('id', termIds)
    .select('id')
  if (errTerms) {
    console.error('Error deleting course_terms:', errTerms.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'course_terms', count: delTerms.length, records: delTerms })
  console.log(`  Deleted ${delTerms.length} course_terms:`, delTerms)

  // Step 12: Delete Courses (1 record)
  console.log('\nStep 12: Deleting courses...')
  const courseIds = [
    'e373463d-0868-4425-8651-4d3a55553fd4',
  ]
  const { data: delCourses, error: errCourses } = await supabase
    .from('courses')
    .delete()
    .in('id', courseIds)
    .select('id, name')
  if (errCourses) {
    console.error('Error deleting courses:', errCourses.message)
    process.exit(1)
  }
  deletionLog.push({ table: 'courses', count: delCourses.length, records: delCourses })
  console.log(`  Deleted ${delCourses.length} courses:`, delCourses)

  console.log('\n====================================================')
  console.log('DATA CLEANUP EXECUTION COMPLETED')
  console.log('====================================================\n')

  return deletionLog
}

executeDataCleanup()
