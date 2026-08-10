import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PdfHeader, PdfBankDetails, PdfSignatureFooter, pdfStyles } from './branding'
import { formatCurrency } from '@/lib/utils/currency'
import type { Invoice, CompanySettings } from '@/types/database'

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
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  docNumber: {
    color: '#f8fafc',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    fontFamily: 'Helvetica-Bold',
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
    width: '38%',
    fontSize: 8,
    color: '#64748b',
  },
  metaValue: {
    width: '62%',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
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
    fontFamily: 'Helvetica-Bold',
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
  colDesc: { width: '56%' },
  colQty: { width: '12%', textAlign: 'center' },
  colRate: { width: '16%', textAlign: 'right' },
  colTotal: { width: '16%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  notesBlock: {
    width: '48%',
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesText: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.3,
  },
  totalsBlock: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3.5,
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
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    color: '#0f172a',
  },
  grandTotalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    color: '#0f172a',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginTop: 3,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
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

  const studentName = student?.name || 'Enrolled Student'
  const admissionNo = student?.admission_no || 'AV-STUDENT'
  const computedStatus = balances?.computed_status || invoice.status || 'draft'
  const amountPaid = balances?.amount_paid || 0
  const balanceDue = balances?.balance_due ?? invoice.grand_total

  return (
    <Document title={`Tax Invoice - ${invoice.invoice_no}`} author="Aviora Finance">
      <Page size="A4" style={pdfStyles.page}>
        {/* Shared Reusable Header */}
        <PdfHeader settings={settings} />

        {/* Title Bar */}
        <View style={styles.titleBar}>
          <Text style={styles.docTitle}>Official Tax Invoice</Text>
          <Text style={styles.docNumber}>
            {invoice.invoice_no} ({invoice.fy_label})
          </Text>
        </View>

        {/* Meta Details Grid */}
        <View style={styles.metaGrid}>
          {/* Student / Bill To Card */}
          <View style={styles.metaCard}>
            <Text style={styles.metaHeading}>Billed To (Student)</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Name:</Text>
              <Text style={styles.metaValue}>{studentName}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Student ID:</Text>
              <Text style={styles.metaValue}>{admissionNo}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Phone:</Text>
              <Text style={styles.metaValue}>{student?.phone || 'N/A'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Course Program:</Text>
              <Text style={styles.metaValue}>
                {course?.name || 'Aviation Pilot Training Track'}
              </Text>
            </View>
            {term && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Billing Term:</Text>
                <Text style={styles.metaValue}>{term.term_label}</Text>
              </View>
            )}
          </View>

          {/* Invoice Date & Balance Status Card */}
          <View style={styles.metaCard}>
            <Text style={styles.metaHeading}>Invoice Summary</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice Date:</Text>
              <Text style={styles.metaValue}>{invoice.invoice_date}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date:</Text>
              <Text style={styles.metaValue}>{invoice.due_date}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Status:</Text>
              <Text
                style={[
                  styles.metaValue,
                  {
                    color:
                      computedStatus === 'paid'
                        ? '#059669'
                        : computedStatus === 'overdue'
                        ? '#dc2626'
                        : '#0f172a',
                    textTransform: 'uppercase',
                  },
                ]}
              >
                {computedStatus}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Balance Due:</Text>
              <Text
                style={[
                  styles.metaValue,
                  { color: balanceDue > 0 ? '#dc2626' : '#059669' },
                ]}
              >
                {formatCurrency(balanceDue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Itemized Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Fee Head / Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Unit Price</Text>
            <Text style={styles.colTotal}>Amount</Text>
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
              <Text style={styles.colTotal}>{formatCurrency(item.line_total)}</Text>
            </View>
          ))}
        </View>

        {/* Summary & Calculations Section */}
        <View style={styles.summaryContainer}>
          {/* Notes & Payment Instructions */}
          <View style={styles.notesBlock}>
            <Text style={[styles.metaHeading, { marginBottom: 3 }]}>
              Payment Terms & Instructions
            </Text>
            <Text style={styles.notesText}>
              {invoice.notes ||
                '1. Payments must reference the invoice number.\n2. Invoices overdue beyond 15 days may incur late fee adjustments.\n3. Digital payment receipts are issued upon bank realization.'}
            </Text>
          </View>

          {/* Totals Breakdown */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalRow}>
              <Text style={{ color: '#64748b' }}>Term Fee Subtotal:</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                {formatCurrency(invoice.subtotal)}
              </Text>
            </View>

            {invoice.previous_outstanding > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#64748b' }}>Previous Outstanding:</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  + {formatCurrency(invoice.previous_outstanding)}
                </Text>
              </View>
            )}

            {invoice.discount_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#b91c1c' }}>Early Bird / Discount:</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: '#b91c1c' }}>
                  - {formatCurrency(invoice.discount_amount)}
                </Text>
              </View>
            )}

            {invoice.scholarship_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#b91c1c' }}>Merit Scholarship:</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: '#b91c1c' }}>
                  - {formatCurrency(invoice.scholarship_amount)}
                </Text>
              </View>
            )}

            {invoice.coupon_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#b91c1c' }}>Promotional Coupon:</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: '#b91c1c' }}>
                  - {formatCurrency(invoice.coupon_amount)}
                </Text>
              </View>
            )}

            {invoice.gst_percent > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#64748b' }}>GST ({invoice.gst_percent}%):</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  + {formatCurrency(invoice.gst_amount)}
                </Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total (Invoice):</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice.grand_total)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={{ color: '#059669', fontSize: 8 }}>Amount Paid:</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: '#059669', fontSize: 8 }}>
                {formatCurrency(amountPaid)}
              </Text>
            </View>

            <View style={styles.balanceRow}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: '#0f172a' }}>
                Net Balance Due:
              </Text>
              <Text
                style={{
                  fontFamily: 'Helvetica-Bold',
                  fontSize: 8.5,
                  color: balanceDue > 0 ? '#b91c1c' : '#059669',
                }}
              >
                {formatCurrency(balanceDue)}
              </Text>
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
