import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PdfHeader, PdfBankDetails, PdfSignatureFooter, pdfStyles } from './branding'
import { formatCurrency } from '@/lib/utils/currency'
import type { Quotation, CompanySettings } from '@/types/database'

const styles = StyleSheet.create({
  titleBar: {
    backgroundColor: '#0f172a',
    padding: '6 12',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  docTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  docNumber: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 11,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaHeading: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  metaLabel: {
    width: '35%',
    fontSize: 8,
    color: '#64748b',
  },
  metaValue: {
    width: '65%',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  table: {
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 8,
    padding: '6 8',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    padding: '6 8',
    fontSize: 8,
  },
  colDesc: { width: '46%' },
  colQty: { width: '10%', textAlign: 'center' },
  colRate: { width: '16%', textAlign: 'right' },
  colDisc: { width: '12%', textAlign: 'right' },
  colTotal: { width: '16%', textAlign: 'right', fontWeight: 'bold' },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  termsBlock: {
    width: '50%',
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  termsText: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.3,
  },
  totalsBlock: {
    width: '45%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 8,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
  },
  grandTotalLabel: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#0f172a',
  },
  grandTotalValue: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#0f172a',
  },
})

interface QuotationPdfDocumentProps {
  quotation: Quotation
  settings?: Partial<CompanySettings> | null
}

export function QuotationPdfDocument({ quotation, settings }: QuotationPdfDocumentProps) {
  const items = quotation.quotation_items || []
  const recipientName = quotation.students?.name || quotation.lead_name || 'Valued Prospect'
  const recipientPhone = quotation.students?.phone || quotation.lead_phone || 'N/A'
  const recipientEmail = quotation.students?.email || quotation.lead_email || 'N/A'
  const admissionNo = quotation.students?.admission_no || 'Lead Prospect'

  return (
    <Document title={`Quotation - ${quotation.quote_no}`} author="Aviora Finance">
      <Page size="A4" style={pdfStyles.page}>
        {/* Shared Reusable Header */}
        <PdfHeader settings={settings} />

        {/* Title Bar */}
        <View style={styles.titleBar}>
          <Text style={styles.docTitle}>Official Fee Quotation</Text>
          <Text style={styles.docNumber}>Ref: {quotation.quote_no}</Text>
        </View>

        {/* Meta Details Grid */}
        <View style={styles.metaGrid}>
          {/* Recipient Card */}
          <View style={styles.metaCard}>
            <Text style={styles.metaHeading}>Quotation Issued To</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Name:</Text>
              <Text style={styles.metaValue}>{recipientName}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Phone:</Text>
              <Text style={styles.metaValue}>{recipientPhone}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Email:</Text>
              <Text style={styles.metaValue}>{recipientEmail}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Student Ref:</Text>
              <Text style={styles.metaValue}>{admissionNo}</Text>
            </View>
          </View>

          {/* Quotation Validity & Metadata Card */}
          <View style={styles.metaCard}>
            <Text style={styles.metaHeading}>Quotation Details</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date Issued:</Text>
              <Text style={styles.metaValue}>{quotation.quote_date}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Valid Until:</Text>
              <Text style={styles.metaValue}>{quotation.valid_until || '15 Days from issue'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status:</Text>
              <Text style={[styles.metaValue, { textTransform: 'uppercase' }]}>
                {quotation.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Itemized Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Course / Service Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Unit Price</Text>
            <Text style={styles.colDisc}>Disc</Text>
            <Text style={styles.colTotal}>Line Total</Text>
          </View>

          {items.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.tableRow,
                { backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' },
              ]}
            >
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

        {/* Summary & Terms Section */}
        <View style={styles.summaryContainer}>
          {/* Terms & Conditions */}
          <View style={styles.termsBlock}>
            <Text style={[styles.metaHeading, { marginBottom: 3 }]}>Terms & Conditions</Text>
            <Text style={styles.termsText}>
              {quotation.terms_text ||
                '1. Fees quoted are subject to seat availability at enrollment.\n2. Applicable taxes (GST) are levied per Government of India guidelines.\n3. Installment schedules will be governed by admission agreements.'}
            </Text>
          </View>

          {/* Totals Calculation Card */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalRow}>
              <Text style={{ color: '#64748b' }}>Subtotal:</Text>
              <Text style={{ fontWeight: 'bold' }}>
                {formatCurrency(quotation.subtotal)}
              </Text>
            </View>

            {quotation.discount_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#b91c1c' }}>Scholarship / Discount:</Text>
                <Text style={{ fontWeight: 'bold', color: '#b91c1c' }}>
                  - {formatCurrency(quotation.discount_amount)}
                </Text>
              </View>
            )}

            {quotation.gst_percent > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#64748b' }}>GST ({quotation.gst_percent}%):</Text>
                <Text style={{ fontWeight: 'bold' }}>
                  {formatCurrency(quotation.gst_amount)}
                </Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Quotation Value:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(quotation.total)}</Text>
            </View>
          </View>
        </View>

        {/* Bank Remittance Details */}
        <PdfBankDetails settings={settings} />

        {/* Shared Signature Footer */}
        <PdfSignatureFooter settings={settings} />
      </Page>
    </Document>
  )
}
