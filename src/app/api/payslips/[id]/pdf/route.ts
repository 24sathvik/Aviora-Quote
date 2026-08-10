import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { PayslipPdfDocument } from '@/lib/pdf/PayslipPdfDocument'
import type { Payslip, CompanySettings } from '@/types/database'

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { id } = params
  const supabase = await createClient()

  // Fetch payslip with faculty relation
  const { data: payslipData, error: payslipError } = await supabase
    .from('payslips')
    .select(`
      *,
      faculty (
        id,
        name,
        designation,
        department,
        bank_name,
        bank_account_name,
        bank_account_number,
        bank_ifsc,
        date_of_joining
      )
    `)
    .eq('id', id)
    .single()

  if (payslipError || !payslipData) {
    return NextResponse.json({ error: 'Payslip record not found' }, { status: 404 })
  }

  // Fetch company settings for header branding
  const { data: settingsData } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  const payslip = payslipData as unknown as Payslip
  const settings = (settingsData || null) as unknown as CompanySettings

  const pdfBuffer = await renderToBuffer(
    React.createElement(PayslipPdfDocument, {
      payslip,
      settings,
    }) as unknown as Parameters<typeof renderToBuffer>[0]
  )

  const sanitizedPayslipNo = payslip.payslip_no.replace(/\//g, '_')
  const filename = `Payslip_${sanitizedPayslipNo}.pdf`

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
