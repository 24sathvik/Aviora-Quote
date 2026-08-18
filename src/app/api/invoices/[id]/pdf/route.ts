import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { InvoicePdfDocument } from '@/lib/pdf/InvoicePdfDocument'
import type { Invoice, CompanySettings } from '@/types/database'

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { id } = params
  const supabase = await createClient()

  // Fetch invoice with all joined relations
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      students (
        id,
        admission_no,
        name,
        phone,
        email,
        address
      ),
      enrollments (
        id,
        batch_year,
        current_term,
        courses (
          id,
          name,
          duration_terms
        )
      ),
      course_terms (
        id,
        term_no,
        term_label,
        term_fee
      ),
      invoice_items (
        id,
        description,
        quantity,
        unit_price,
        line_total
      )
    `)
    .eq('id', id)
    .single()

  if (invoiceError || !invoiceData) {
    return NextResponse.json({ error: 'Invoice record not found' }, { status: 404 })
  }

  // Fetch invoice balances view
  const { data: balanceData } = await supabase
    .from('invoice_balances')
    .select('*')
    .eq('invoice_id', id)
    .maybeSingle()

  // Fetch company branding & settings
  const { data: settingsData } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  const student = invoiceData.students || {
    id: invoiceData.student_id || '',
    name: (invoiceData as any).student_name || 'Historical Student',
    admission_no: (invoiceData as any).student_admission_no || 'N/A',
    phone: (invoiceData as any).student_phone || '',
    email: (invoiceData as any).student_email || '',
    address: '',
  }

  const enrollment = invoiceData.enrollments || {
    id: invoiceData.enrollment_id || '',
    batch_year: new Date().getFullYear(),
    current_term: 1,
    courses: {
      id: '',
      name: (invoiceData as any).course_name || 'Academic Program Track',
      duration_terms: 1,
    },
  }

  const invoice = {
    ...invoiceData,
    students: student,
    enrollments: enrollment,
    invoice_balances: balanceData || {
      invoice_id: invoiceData.id,
      grand_total: invoiceData.grand_total,
      amount_paid: 0,
      balance_due: invoiceData.grand_total,
      computed_status: invoiceData.status || 'draft',
    },
  } as unknown as Invoice
  const settings = (settingsData || null) as unknown as CompanySettings

  const pdfBuffer = await renderToBuffer(
    React.createElement(InvoicePdfDocument, {
      invoice,
      settings,
    }) as unknown as Parameters<typeof renderToBuffer>[0]
  )

  const sanitizedInvoiceNo = invoice.invoice_no.replace(/\//g, '_')
  const filename = `Invoice_${sanitizedInvoiceNo}.pdf`

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
