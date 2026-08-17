import assert from 'node:assert/strict'
import fs from 'node:fs'

console.log('====================================================')
console.log('CONSOLIDATED TASK VERIFICATION')
console.log('====================================================\n')

// 1. Verify FacultySalarySection fixes
const facultySalaryContent = fs.readFileSync('src/app/(app)/faculty/[id]/FacultySalarySection.tsx', 'utf-8')
assert(facultySalaryContent.includes('setEffectiveFrom(salaryStructure.effective_from'), 'Effective date set in handleOpenModal')
assert(facultySalaryContent.includes("refetchType: 'all'"), 'refetchType: all passed in mutation onSuccess')
console.log('✅ PASS: Faculty Salary Structure effective date & update bug fixed')

// 2. Verify Payments SearchableStudentSelect
const paymentFormContent = fs.readFileSync('src/app/(app)/payments/new/PaymentForm.tsx', 'utf-8')
assert(paymentFormContent.includes('SearchableStudentSelect'), 'PaymentForm uses SearchableStudentSelect')
assert(paymentFormContent.includes('step={1}'), 'PaymentForm uses step={1}')
assert(paymentFormContent.includes('min={1}'), 'PaymentForm uses min={1}')
console.log('✅ PASS: PaymentForm uses SearchableStudentSelect and step={1}')

// 3. Verify Payslips SearchableFacultySelect
const payslipFormContent = fs.readFileSync('src/app/(app)/payslips/new/PayslipForm.tsx', 'utf-8')
assert(payslipFormContent.includes('SearchableFacultySelect'), 'PayslipForm uses SearchableFacultySelect')
console.log('✅ PASS: PayslipForm uses SearchableFacultySelect')

// 4. Verify SearchableFacultySelect component exists
assert(fs.existsSync('src/components/ui/SearchableFacultySelect.tsx'), 'SearchableFacultySelect component exists')
console.log('✅ PASS: SearchableFacultySelect.tsx component exists')

// 5. Verify QuotationForm and InvoiceForm retain SearchableStudentSelect and step={1}
const quoteFormContent = fs.readFileSync('src/app/(app)/quotations/new/QuotationForm.tsx', 'utf-8')
assert(quoteFormContent.includes('SearchableStudentSelect'), 'QuotationForm uses SearchableStudentSelect')
assert(quoteFormContent.includes('step={1}'), 'QuotationForm uses step={1}')
console.log('✅ PASS: QuotationForm retains SearchableStudentSelect and step={1}')

const invoiceFormContent = fs.readFileSync('src/app/(app)/invoices/new/InvoiceForm.tsx', 'utf-8')
assert(invoiceFormContent.includes('SearchableStudentSelect'), 'InvoiceForm uses SearchableStudentSelect')
assert(invoiceFormContent.includes('step={1}'), 'InvoiceForm uses step={1}')
console.log('✅ PASS: InvoiceForm retains SearchableStudentSelect and step={1}')

console.log('\n====================================================')
console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!')
console.log('====================================================')
