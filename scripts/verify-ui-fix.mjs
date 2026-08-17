import assert from 'node:assert/strict'
import fs from 'node:fs'

console.log('====================================================')
console.log('SCOPED UI FIX VERIFICATION (WHOLE RUPEES CORRECTION)')
console.log('====================================================\n')

// 1. Verify SearchableStudentSelect component exists
assert(fs.existsSync('src/components/ui/SearchableStudentSelect.tsx'), 'SearchableStudentSelect component exists')
console.log('✅ PASS: SearchableStudentSelect.tsx component exists')

// 2. Verify PaymentForm step attribute
const paymentFormContent = fs.readFileSync('src/app/(app)/payments/new/PaymentForm.tsx', 'utf-8')
assert(paymentFormContent.includes('step={1}'), 'PaymentForm uses step={1}')
assert(paymentFormContent.includes('min={1}'), 'PaymentForm uses min={1}')
assert(!paymentFormContent.includes('step={100}'), 'PaymentForm step={100} removed')
console.log('✅ PASS: PaymentForm Payment Amount field uses min={1} and step={1}')

// 3. Verify QuotationForm SearchableStudentSelect and money steps
const quoteFormContent = fs.readFileSync('src/app/(app)/quotations/new/QuotationForm.tsx', 'utf-8')
assert(quoteFormContent.includes('SearchableStudentSelect'), 'QuotationForm uses SearchableStudentSelect')
assert(!quoteFormContent.includes('step={100}'), 'QuotationForm step={100} removed for money fields')
assert(quoteFormContent.includes('step={1}'), 'QuotationForm uses step={1}')
console.log('✅ PASS: QuotationForm uses SearchableStudentSelect and step={1}')

// 4. Verify InvoiceForm SearchableStudentSelect and money steps
const invoiceFormContent = fs.readFileSync('src/app/(app)/invoices/new/InvoiceForm.tsx', 'utf-8')
assert(invoiceFormContent.includes('SearchableStudentSelect'), 'InvoiceForm uses SearchableStudentSelect')
assert(!invoiceFormContent.includes('step={100}'), 'InvoiceForm step={100} removed for money fields')
assert(invoiceFormContent.includes('step={1}'), 'InvoiceForm uses step={1}')
console.log('✅ PASS: InvoiceForm uses SearchableStudentSelect and step={1}')

// 5. Verify Payment Form student selector was NOT modified
assert(!paymentFormContent.includes('SearchableStudentSelect'), 'PaymentForm student selector was NOT changed')
console.log('✅ PASS: PaymentForm student selector remains untouched')

// 6. Verify FacultySalarySection uses step={1}
const facultySalaryContent = fs.readFileSync('src/app/(app)/faculty/[id]/FacultySalarySection.tsx', 'utf-8')
assert(facultySalaryContent.includes('step={1}'), 'FacultySalarySection uses step={1}')
console.log('✅ PASS: FacultySalarySection uses step={1} for salary fields')

console.log('\n====================================================')
console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!')
console.log('====================================================')
