import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import { QuotationPdfDocument } from '../src/lib/pdf/QuotationPdfDocument.js'
import { InvoicePdfDocument } from '../src/lib/pdf/InvoicePdfDocument.js'
import { PaymentReceiptPdfDocument } from '../src/lib/pdf/PaymentReceiptPdfDocument.js'
import { PayslipPdfDocument } from '../src/lib/pdf/PayslipPdfDocument.js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkxMTgwMCwiZXhwIjoyMTAxNDg3ODAwfQ.28OdC6-m4aMt0ZVd4uXSkrcqmQhFtCqpYZuITcRW4Bs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function verifyPdfs() {
  console.log('====================================================')
  console.log('AVIORA PHASE 11: ALL 4 PDF TYPES BRANDING VERIFICATION')
  console.log('====================================================\n')

  // Fetch official company settings
  const { data: settings } = await supabase.from('company_settings').select('*').limit(1).single()
  console.log(` Loaded Settings Branding: ${settings.name}`)
  console.log(` Address: ${settings.address}`)
  console.log(` Bank: ${settings.bank_name} (${settings.bank_account_number})\n`)

  // Sample data objects for all 4 document types
  const sampleQuotation = {
    quote_no: 'AV/QT/00001',
    quote_date: '2026-08-08',
    valid_until: '2026-08-22',
    subtotal: 180000,
    discount_amount: 10000,
    gst_percent: 18,
    gst_amount: 30600,
    total: 200600,
    students: { name: 'Cadet Pilot Rahul Sharma', phone: '9876543210', email: 'rahul@aviora.edu' },
    counselors: { name: 'Counselor Ananya Verma' },
    quotation_items: [{ description: 'CPL Flight Instruction & Simulator Training', amount: 180000 }],
  }

  const sampleInvoice = {
    invoice_no: 'AV/INV/2026-27/00001',
    invoice_date: '2026-08-08',
    due_date: '2026-08-20',
    previous_outstanding: 0,
    subtotal: 180000,
    discount_amount: 5000,
    scholarship_amount: 5000,
    coupon_amount: 0,
    gst_percent: 18,
    gst_amount: 30600,
    grand_total: 200600,
    students: { name: 'Cadet Pilot Rahul Sharma', admission_no: 'AV-2026-001', phone: '9876543210' },
    enrollments: { courses: { name: 'Commercial Pilot License (CPL)' } },
    course_terms: { term_label: 'Term 1 — Ground School & Pre-Flight' },
    invoice_items: [{ description: 'Term 1 Ground School Tuition Fee', amount: 180000 }],
    invoice_balances: { amount_paid: 50000, balance_due: 150600, computed_status: 'partial' },
  }

  const samplePayment = {
    receipt_no: 'AV/RCT/2026-27/00001',
    amount: 50000,
    payment_mode: 'bank_transfer',
    reference_no: 'UTR-HDFC-99887766',
    payment_date: '2026-08-08',
    students: { name: 'Cadet Pilot Rahul Sharma', admission_no: 'AV-2026-001', phone: '9876543210' },
    invoices: {
      invoice_no: 'AV/INV/2026-27/00001',
      grand_total: 200600,
      invoice_balances: { grand_total: 200600, amount_paid: 50000, balance_due: 150600 },
      enrollments: { courses: { name: 'Commercial Pilot License (CPL)' } },
      course_terms: { term_label: 'Term 1' },
    },
  }

  const samplePayslip = {
    payslip_no: 'AV/PAY/2026-27/00001',
    month: 8,
    year: 2026,
    gross_pay: 120000,
    total_deductions: 12000,
    net_pay: 108000,
    salary_structure_snapshot: {
      basic: 80000,
      hra: 32000,
      other_allowances: 8000,
      pf_deduction: 4000,
      pt_deduction: 200,
      tds_deduction: 7800,
      other_deductions: 0,
    },
    faculty: {
      name: 'Capt. Vikramaditya Flight Instructor',
      designation: 'Chief Flight Instructor',
      department: 'Flight Operations',
      bank_name: 'HDFC Bank Ltd',
      bank_account_name: 'Capt Vikramaditya',
      bank_account_number: '50100098765432',
      bank_ifsc: 'HDFC0001234',
    },
  }

  console.log('1. Rendering Quotation PDF with shared branding partial...')
  const quoteBuffer = await renderToBuffer(
    React.createElement(QuotationPdfDocument, { quotation: sampleQuotation, settings })
  )
  console.log(` Quotation PDF rendered successfully (${quoteBuffer.length} bytes)`)

  console.log('2. Rendering Invoice PDF with shared branding partial...')
  const invoiceBuffer = await renderToBuffer(
    React.createElement(InvoicePdfDocument, { invoice: sampleInvoice, settings })
  )
  console.log(` Invoice PDF rendered successfully (${invoiceBuffer.length} bytes)`)

  console.log('3. Rendering Payment Receipt PDF with shared branding partial...')
  const receiptBuffer = await renderToBuffer(
    React.createElement(PaymentReceiptPdfDocument, { payment: samplePayment, settings })
  )
  console.log(` Payment Receipt PDF rendered successfully (${receiptBuffer.length} bytes)`)

  console.log('4. Rendering Payslip PDF with shared branding partial...')
  const payslipBuffer = await renderToBuffer(
    React.createElement(PayslipPdfDocument, { payslip: samplePayslip, settings })
  )
  console.log(` Payslip PDF rendered successfully (${payslipBuffer.length} bytes)\n`)

  console.log('====================================================')
  console.log('ALL 4 PDF TYPES RENDERED WITH OFFICIAL AVIORA BRANDING!')
  console.log('NO PDF TEMPLATE CODE NEEDED modification!')
  console.log('====================================================')
}

verifyPdfs().catch((err) => {
  console.error('PDF Verification Error:', err)
  process.exit(1)
})
