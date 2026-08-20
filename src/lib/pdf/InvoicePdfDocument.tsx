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
import type { Invoice, CompanySettings } from '@/types/database'

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
  headerColDesc: { width: '55%', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5 },
  headerColQty: { width: '12%', textAlign: 'center', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5 },
  headerColRate: { width: '16.5%', textAlign: 'right', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5 },
  headerColTotal: { width: '16.5%', textAlign: 'right', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5 },

  colDesc: { width: '55%', color: pdfColors.navy },
  colQty: { width: '12%', textAlign: 'center', color: pdfColors.navy },
  colRate: { width: '16.5%', textAlign: 'right', color: pdfColors.navy },
  colTotal: { width: '16.5%', textAlign: 'right', fontWeight: 'bold', color: pdfColors.navy },
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

interface InvoicePdfDocumentProps {
  invoice: Invoice
  settings?: Partial<CompanySettings> | null
}

export function InvoicePdfDocument({ invoice, settings }: InvoicePdfDocumentProps) {
  const items = invoice.invoice_items || []
  const student = invoice.students
  const course = invoice.enrollments?.courses
  const term = invoice.course_terms
  const balances = invoice.invoice_balances

  const studentName = student?.name || invoice.student_name_snapshot || 'Enrolled Student'
  const admissionNo = student?.admission_no || 'AV-2026-0001'
  const computedStatus = balances?.computed_status || invoice.status || 'partial'
  const amountPaid = balances?.amount_paid || 0
  const balanceDue = balances?.balance_due ?? invoice.grand_total

  const courseName = course?.name || 'Aviation take off'
  const termLabel = term?.term_label || 'Term 1'

  const termsText =
    settings?.terms_and_conditions_text ||
    '1. Fees quoted are subject to seat availability at enrollment.\n2. Applicable taxes (GST) are levied per Government of India guidelines.\n3. Installment schedules will be governed by admission agreements.'

  return (
    <Document title={`Tax Invoice - ${invoice.invoice_no}`} author="Aviora Finance">
      <Page size="A4" style={pdfStyles.page}>
        {/* Solid Top Edge Bar */}
        <View style={pdfStyles.topEdgeBar} />

        {/* Page Inner Container */}
        <View style={pdfStyles.bodyContent}>
          {/* Header Row with Address, Tax IDs & Fixed Logo */}
          <PdfHeader settings={settings} />

          {/* Document Title */}
          <Text style={pdfStyles.docTitle}>INVOICE</Text>

          {/* Two-Tone Angled Status Ribbon */}
          <PdfStatusRibbon
            title="OFFICIAL TAX INVOICE"
            subtitle={`${invoice.invoice_no} (${invoice.fy_label})`}
          />

          {/* Side-by-side Info Cards */}
          <View style={pdfStyles.infoBoxesGrid}>
            {/* Left Card: BILLED TO (STUDENT) */}
            <View style={pdfStyles.infoBoxCard}>
              <Text style={pdfStyles.infoBoxTitle}>BILLED TO (STUDENT)</Text>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Name:</Text>
                <Text style={pdfStyles.infoBoxValue}>{studentName}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Student ID:</Text>
                <Text style={pdfStyles.infoBoxValue}>{admissionNo}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Phone:</Text>
                <Text style={pdfStyles.infoBoxValue}>{student?.phone || '98669 42111'}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Course Program:</Text>
                <Text style={pdfStyles.infoBoxValue}>{courseName}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Billing Term:</Text>
                <Text style={pdfStyles.infoBoxValue}>{termLabel}</Text>
              </View>
            </View>

            {/* Right Card: INVOICE SUMMARY */}
            <View style={pdfStyles.infoBoxCard}>
              <Text style={pdfStyles.infoBoxTitle}>INVOICE SUMMARY</Text>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Invoice Date:</Text>
                <Text style={pdfStyles.infoBoxValue}>{invoice.invoice_date}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Due Date:</Text>
                <Text style={pdfStyles.infoBoxValue}>{invoice.due_date}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Payment Status:</Text>
                <Text style={[pdfStyles.infoBoxValue, { textTransform: 'uppercase' }]}>
                  {computedStatus}
                </Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Balance Due:</Text>
                <Text
                  style={[
                    pdfStyles.infoBoxValue,
                    { color: pdfColors.gold, fontWeight: 'bold' },
                  ]}
                >
                  {formatCurrency(balanceDue)}
                </Text>
              </View>
            </View>
          </View>

          {/* Itemized Line Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.headerColDesc}>Fee Head / Description</Text>
              <Text style={styles.headerColQty}>Qty</Text>
              <Text style={styles.headerColRate}>Unit Price</Text>
              <Text style={styles.headerColTotal}>Amount</Text>
            </View>

            {items.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colRate}>{formatCurrency(item.unit_price)}</Text>
                <Text style={styles.colTotal}>{formatCurrency(item.line_total)}</Text>
              </View>
            ))}
          </View>

          {/* Totals Block & Bank Remittance Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            {/* Totals Block (Left) */}
            <View style={styles.totalsBlock}>
              <View style={styles.totalRow}>
                <Text style={{ color: pdfColors.textMuted }}>Term Fee Subtotal:</Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.navy }}>
                  {formatCurrency(invoice.subtotal)}
                </Text>
              </View>

              {invoice.previous_outstanding > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{ color: pdfColors.textMuted }}>Previous Outstanding:</Text>
                  <Text style={{ fontWeight: 'bold', color: pdfColors.navy }}>
                    + {formatCurrency(invoice.previous_outstanding)}
                  </Text>
                </View>
              )}

              {invoice.discount_amount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{ color: pdfColors.redText }}>Discount Amount:</Text>
                  <Text style={{ fontWeight: 'bold', color: pdfColors.redText }}>
                    - {formatCurrency(invoice.discount_amount)}
                  </Text>
                </View>
              )}

              {invoice.scholarship_amount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{ color: pdfColors.redText }}>Scholarship Amount:</Text>
                  <Text style={{ fontWeight: 'bold', color: pdfColors.redText }}>
                    - {formatCurrency(invoice.scholarship_amount)}
                  </Text>
                </View>
              )}

              {invoice.coupon_amount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{ color: pdfColors.redText }}>Coupon Amount:</Text>
                  <Text style={{ fontWeight: 'bold', color: pdfColors.redText }}>
                    - {formatCurrency(invoice.coupon_amount)}
                  </Text>
                </View>
              )}

              {invoice.gst_percent > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{ color: pdfColors.textMuted }}>GST ({invoice.gst_percent}%):</Text>
                  <Text style={{ fontWeight: 'bold', color: pdfColors.navy }}>
                    + {formatCurrency(invoice.gst_amount)}
                  </Text>
                </View>
              )}

              <View style={{ borderBottomWidth: 1, borderBottomColor: pdfColors.navy, marginVertical: 4 }} />

              <View style={styles.totalRow}>
                <Text style={{ fontWeight: 'bold', fontSize: 9, color: pdfColors.navy }}>
                  Grand Total (Invoice):
                </Text>
                <Text style={{ fontWeight: 'bold', fontSize: 9, color: pdfColors.navy }}>
                  {formatCurrency(invoice.grand_total)}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={{ color: pdfColors.gold, fontWeight: 'bold', fontSize: 8.5 }}>
                  Amount Paid:
                </Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.gold, fontSize: 8.5 }}>
                  {formatCurrency(amountPaid)}
                </Text>
              </View>

              <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#CBD5E1', marginVertical: 4 }} />

              <View style={styles.totalRow}>
                <Text style={{ fontWeight: 'bold', fontSize: 10, color: pdfColors.redText }}>
                  Net Balance Due:
                </Text>
                <Text style={{ fontWeight: 'bold', fontSize: 10, color: pdfColors.redText }}>
                  {formatCurrency(balanceDue)}
                </Text>
              </View>
            </View>

            {/* Bank Remittance & Payment Terms (Right) */}
            <View style={{ width: '50%' }}>
              <PdfBankDetails settings={settings} />

              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: pdfColors.navy, marginBottom: 2 }}>
                  Payment terms &amp; Instructions
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
