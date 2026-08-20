import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  PdfHeader,
  PdfStatusRibbon,
  PdfBankDetails,
  PdfFooter,
  pdfColors,
  pdfStyles,
} from './branding'
import { formatCurrency } from '@/lib/utils/currency'
import type { Quotation, CompanySettings } from '@/types/database'

const styles = StyleSheet.create({
  table: {
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: pdfColors.navy,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.navy,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.borderGray,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8.5,
    backgroundColor: pdfColors.bgCream,
  },
  headerColDesc: { width: '46%', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },
  headerColQty: { width: '10%', textAlign: 'center', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },
  headerColRate: { width: '16%', textAlign: 'right', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },
  headerColDisc: { width: '12%', textAlign: 'right', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },
  headerColTotal: { width: '16%', textAlign: 'right', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },

  colDesc: { width: '46%', color: pdfColors.navy },
  colQty: { width: '10%', textAlign: 'center', color: pdfColors.navy },
  colRate: { width: '16%', textAlign: 'right', color: pdfColors.navy },
  colDisc: { width: '12%', textAlign: 'right', color: pdfColors.navy },
  colTotal: { width: '16%', textAlign: 'right', fontWeight: 'bold', color: pdfColors.navy },
  totalsBlock: {
    width: '46%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3.5,
    fontSize: 8.5,
  },
})

interface QuotationPdfDocumentProps {
  quotation: Quotation
  settings?: Partial<CompanySettings> | null
}

export function QuotationPdfDocument({ quotation, settings }: QuotationPdfDocumentProps) {
  const items = quotation.quotation_items || []
  const recipientName = quotation.students?.name || quotation.student_name_snapshot || quotation.lead_name || 'Valued Prospect'
  const recipientPhone = quotation.students?.phone || quotation.lead_phone || 'N/A'
  const recipientEmail = quotation.students?.email || quotation.lead_email || 'N/A'
  const admissionNo = quotation.students?.admission_no || 'Lead Prospect'

  const termsText =
    quotation.terms_text ||
    settings?.terms_and_conditions_text ||
    '1. Fees quoted are subject to seat availability at enrollment.\n2. Applicable taxes (GST) are levied per Government of India guidelines.\n3. Installment schedules will be governed by admission agreements.'

  return (
    <Document title={`Quotation - ${quotation.quote_no}`} author="Aviora Finance">
      <Page size="A4" style={pdfStyles.page}>
        {/* Solid Top Edge Bar */}
        <View style={pdfStyles.topEdgeBar} />

        {/* Page Inner Container */}
        <View style={pdfStyles.bodyContent}>
          {/* Header Row with Address, Tax IDs & Fixed Logo */}
          <PdfHeader settings={settings} />

          {/* Document Title */}
          <Text style={pdfStyles.docTitle}>QUOTATION</Text>

          {/* Two-Tone Angled Status Ribbon */}
          <PdfStatusRibbon
            title="FEE QUOTATION"
            subtitle={`Ref: ${quotation.quote_no}`}
          />

          {/* Side-by-side Info Cards */}
          <View style={pdfStyles.infoBoxesGrid}>
            {/* Left Card: PROSPECT / STUDENT DETAILS */}
            <View style={pdfStyles.infoBoxCard}>
              <Text style={pdfStyles.infoBoxTitle}>PROSPECT / STUDENT DETAILS</Text>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Name:</Text>
                <Text style={pdfStyles.infoBoxValue}>{recipientName}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Phone:</Text>
                <Text style={pdfStyles.infoBoxValue}>{recipientPhone}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Email:</Text>
                <Text style={pdfStyles.infoBoxValue}>{recipientEmail}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Student Ref:</Text>
                <Text style={pdfStyles.infoBoxValue}>{admissionNo}</Text>
              </View>
            </View>

            {/* Right Card: QUOTATION SUMMARY */}
            <View style={pdfStyles.infoBoxCard}>
              <Text style={pdfStyles.infoBoxTitle}>QUOTATION SUMMARY</Text>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Date Issued:</Text>
                <Text style={pdfStyles.infoBoxValue}>{quotation.quote_date}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Valid Until:</Text>
                <Text style={pdfStyles.infoBoxValue}>
                  {quotation.valid_until || '15 Days from issue'}
                </Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Status:</Text>
                <Text style={[pdfStyles.infoBoxValue, { textTransform: 'uppercase' }]}>
                  {quotation.status}
                </Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Total Value:</Text>
                <Text
                  style={[
                    pdfStyles.infoBoxValue,
                    { color: pdfColors.gold, fontWeight: 'bold' },
                  ]}
                >
                  {formatCurrency(quotation.total)}
                </Text>
              </View>
            </View>
          </View>

          {/* Itemized Line Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerColDesc, { color: '#FFFFFF' }]}>Course / Service Description</Text>
              <Text style={[styles.headerColQty, { color: '#FFFFFF' }]}>Qty</Text>
              <Text style={[styles.headerColRate, { color: '#FFFFFF' }]}>Unit Price</Text>
              <Text style={[styles.headerColDisc, { color: '#FFFFFF' }]}>Disc</Text>
              <Text style={[styles.headerColTotal, { color: '#FFFFFF' }]}>Line Total</Text>
            </View>

            {items.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colRate}>{formatCurrency(item.unit_price)}</Text>
                <Text style={styles.colDisc}>
                  {item.discount_amount > 0 ? formatCurrency(item.discount_amount) : '—'}
                </Text>
                <Text style={styles.colTotal}>{formatCurrency(item.line_total)}</Text>
              </View>
            ))}
          </View>

          {/* Totals Block & Terms Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            {/* Totals Block (Left) */}
            <View style={styles.totalsBlock}>
              <View style={styles.totalRow}>
                <Text style={{ color: pdfColors.textMuted }}>Subtotal:</Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.navy }}>
                  {formatCurrency(quotation.subtotal)}
                </Text>
              </View>

              {quotation.discount_amount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{ color: pdfColors.redText }}>Scholarship / Discount:</Text>
                  <Text style={{ fontWeight: 'bold', color: pdfColors.redText }}>
                    - {formatCurrency(quotation.discount_amount)}
                  </Text>
                </View>
              )}

              {quotation.gst_percent > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{ color: pdfColors.textMuted }}>GST ({quotation.gst_percent}%):</Text>
                  <Text style={{ fontWeight: 'bold', color: pdfColors.navy }}>
                    + {formatCurrency(quotation.gst_amount)}
                  </Text>
                </View>
              )}

              <View style={{ borderBottomWidth: 1, borderBottomColor: pdfColors.navy, marginVertical: 4 }} />

              <View style={styles.totalRow}>
                <Text style={{ fontWeight: 'bold', fontSize: 10, color: pdfColors.navy }}>
                  Total Quotation Value:
                </Text>
                <Text style={{ fontWeight: 'bold', fontSize: 10, color: pdfColors.navy }}>
                  {formatCurrency(quotation.total)}
                </Text>
              </View>
            </View>

            {/* Bank Remittance & Terms & Conditions (Right) */}
            <View style={{ width: '50%' }}>
              <PdfBankDetails settings={settings} />

              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: pdfColors.navy, marginBottom: 2 }}>
                  Terms &amp; Conditions
                </Text>
                <Text style={{ fontSize: 6.5, color: '#475569', lineHeight: 1.3 }}>
                  {termsText}
                </Text>
              </View>
            </View>
          </View>

          {/* Shared Footer with ZYXEN Tag */}
          <PdfFooter settings={settings} />
        </View>

        {/* Solid Bottom Edge Bar */}
        <View style={pdfStyles.bottomEdgeBar} />
      </Page>
    </Document>
  )
}
