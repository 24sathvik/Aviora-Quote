import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { PaymentReceiptPdfDocument } from '@/lib/pdf/PaymentReceiptPdfDocument'
import type { Payment, CompanySettings } from '@/types/database'

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { id } = params
  const supabase = await createClient()

  // Fetch payment with all joined relations
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .select(`
      *,
      students (
        id,
        admission_no,
        name,
        phone,
        email
      ),
      invoices (
        id,
        invoice_no,
        grand_total,
        enrollments (
          id,
          courses (
            id,
            name
          )
        ),
        course_terms (
          id,
          term_label
        ),
        invoice_balances (
          balance_due
        )
      )
    `)
    .eq('id', id)
    .single()

  if (paymentError || !paymentData) {
    return NextResponse.json({ error: 'Payment receipt record not found' }, { status: 404 })
  }

  // Fetch company branding & settings
  const { data: settingsData } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  const payment = paymentData as unknown as Payment
  const settings = (settingsData || null) as unknown as CompanySettings
  const resultingBalance = payment.invoices?.invoice_balances?.balance_due ?? 0

  const pdfBuffer = await renderToBuffer(
    React.createElement(PaymentReceiptPdfDocument, {
      payment,
      settings,
      resultingBalance,
    }) as unknown as Parameters<typeof renderToBuffer>[0]
  )

  const sanitizedReceiptNo = payment.receipt_no.replace(/\//g, '_')
  const filename = `Receipt_${sanitizedReceiptNo}.pdf`

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
