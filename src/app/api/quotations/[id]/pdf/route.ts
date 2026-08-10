import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { QuotationPdfDocument } from '@/lib/pdf/QuotationPdfDocument'
import type { Quotation, CompanySettings } from '@/types/database'

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { id } = params
  const supabase = await createClient()

  // Fetch quotation with relations
  const { data: quotationData, error: quoteError } = await supabase
    .from('quotations')
    .select(`
      *,
      students (
        id,
        admission_no,
        name,
        phone,
        email
      ),
      quotation_items (
        id,
        description,
        quantity,
        unit_price,
        discount_amount,
        line_total
      )
    `)
    .eq('id', id)
    .single()

  if (quoteError || !quotationData) {
    return NextResponse.json({ error: 'Quotation record not found' }, { status: 404 })
  }

  // Fetch company branding & settings
  const { data: settingsData } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  const quotation = quotationData as unknown as Quotation
  const settings = (settingsData || null) as unknown as CompanySettings

  const pdfBuffer = await renderToBuffer(
    React.createElement(QuotationPdfDocument, {
      quotation,
      settings,
    }) as unknown as Parameters<typeof renderToBuffer>[0]
  )

  const sanitizedQuoteNo = quotation.quote_no.replace(/\//g, '_')
  const filename = `Quotation_${sanitizedQuoteNo}.pdf`

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
