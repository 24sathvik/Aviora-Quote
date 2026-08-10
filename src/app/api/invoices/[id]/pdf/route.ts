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

  // Fetch invoice with all joined relations and balances view
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
      ),
      invoice_balances (
        invoice_id,
        grand_total,
        amount_paid,
        balance_due,
        computed_status
      )
    `)
    .eq('id', id)
    .single()

  if (invoiceError || !invoiceData) {
    return NextResponse.json({ error: 'Invoice record not found' }, { status: 404 })
  }

  // Fetch company branding & settings
  const { data: settingsData } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  const invoice = invoiceData as unknown as Invoice
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
