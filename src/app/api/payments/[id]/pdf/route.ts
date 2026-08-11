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

  // Fetch payment with all joined relations (without embedded invoice_balances)
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
        )
      )
    `)
    .eq('id', id)
    .single()

  if (paymentError || !paymentData) {
    return NextResponse.json({ error: 'Payment receipt record not found' }, { status: 404 })
  }

  // Fetch balance_due from invoice_balances view
  let resultingBalance = 0
  let invoiceBalanceData = null
  const invoiceId = paymentData.invoice_id || paymentData.invoices?.id
  if (invoiceId) {
    const { data: balanceData } = await supabase
      .from('invoice_balances')
      .select('*')
      .eq('invoice_id', invoiceId)
      .maybeSingle()

    if (balanceData) {
      invoiceBalanceData = balanceData
      resultingBalance = Number(balanceData.balance_due) || 0
    }
  }

  // Fetch company branding & settings
  const { data: settingsData } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  const payment = {
    ...paymentData,
    invoices: paymentData.invoices
      ? {
          ...paymentData.invoices,
          invoice_balances: invoiceBalanceData || {
            invoice_id: invoiceId,
            grand_total: paymentData.invoices.grand_total,
            amount_paid: paymentData.amount,
            balance_due: resultingBalance,
            computed_status: 'paid',
          },
        }
      : null,
  } as unknown as Payment
  const settings = (settingsData || null) as unknown as CompanySettings

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
