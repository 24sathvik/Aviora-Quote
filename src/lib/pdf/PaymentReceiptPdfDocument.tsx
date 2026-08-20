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
import type { Payment, CompanySettings } from '@/types/database'

const styles = StyleSheet.create({
  amountHighlightBox: {
    backgroundColor: pdfColors.goldLight,
    borderWidth: 1,
    borderColor: pdfColors.gold,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: pdfColors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountSub: {
    fontSize: 8,
    color: pdfColors.textMuted,
    marginTop: 2,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: pdfColors.navy,
  },
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
  headerColParam: { width: '45%', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },
  headerColValue: { width: '55%', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },

  colParam: { width: '45%', color: pdfColors.navy },
  colValue: { width: '55%', fontWeight: 'bold', color: pdfColors.navy },
  notesBox: {
    backgroundColor: pdfColors.bgCream,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: pdfColors.goldBorder,
    marginBottom: 12,
  },
  notesHeading: {
    fontSize: 8,
    fontWeight: 'bold',
    color: pdfColors.navy,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 7.5,
    color: pdfColors.navy,
    lineHeight: 1.3,
  },
})

interface PaymentReceiptPdfDocumentProps {
  payment: Payment
  settings?: Partial<CompanySettings> | null
  resultingBalance?: number
}

export function PaymentReceiptPdfDocument({
  payment,
  settings,
  resultingBalance = 0,
}: PaymentReceiptPdfDocumentProps) {
  const student = payment.students
  const invoice = payment.invoices
  const course = invoice?.enrollments?.courses
  const term = invoice?.course_terms

  const studentName = student?.name || payment.student_name_snapshot || invoice?.student_name_snapshot || 'Enrolled Student'
  const admissionNo = student?.admission_no || 'AV-STUDENT'
  const invoiceNo = invoice?.invoice_no || 'Invoice Ref'
  const modeText = payment.payment_mode
    ? payment.payment_mode.replace('_', ' ').toUpperCase()
    : 'BANK TRANSFER'

  return (
    <Document title={`Receipt - ${payment.receipt_no}`} author="Aviora Finance">
      <Page size="A4" style={pdfStyles.page}>
        {/* Solid Top Edge Bar */}
        <View style={pdfStyles.topEdgeBar} />

        {/* Page Inner Container */}
        <View style={pdfStyles.bodyContent}>
          {/* Header Row with Address, Tax IDs & Fixed Logo */}
          <PdfHeader settings={settings} />

          {/* Document Title */}
          <Text style={pdfStyles.docTitle}>PAYMENT RECEIPT</Text>

          {/* Two-Tone Angled Status Ribbon */}
          <PdfStatusRibbon
            title="OFFICIAL RECEIPT"
            subtitle={`Ref: ${payment.receipt_no}`}
          />

          {/* Prominent Amount Card */}
          <View style={styles.amountHighlightBox}>
            <View>
              <Text style={styles.amountLabel}>Total Amount Received</Text>
              <Text style={styles.amountSub}>Payment Mode: {modeText}</Text>
            </View>
            <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
          </View>

          {/* Side-by-side Info Cards */}
          <View style={pdfStyles.infoBoxesGrid}>
            {/* Left Card: RECEIVED FROM (STUDENT) */}
            <View style={pdfStyles.infoBoxCard}>
              <Text style={pdfStyles.infoBoxTitle}>RECEIVED FROM (STUDENT)</Text>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Name:</Text>
                <Text style={pdfStyles.infoBoxValue}>{studentName}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Student ID:</Text>
                <Text style={pdfStyles.infoBoxValue}>{admissionNo}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Contact Phone:</Text>
                <Text style={pdfStyles.infoBoxValue}>{student?.phone || 'N/A'}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Invoice Applied:</Text>
                <Text style={pdfStyles.infoBoxValue}>{invoiceNo}</Text>
              </View>
            </View>

            {/* Right Card: PAYMENT SUMMARY */}
            <View style={pdfStyles.infoBoxCard}>
              <Text style={pdfStyles.infoBoxTitle}>PAYMENT SUMMARY</Text>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Payment Date:</Text>
                <Text style={pdfStyles.infoBoxValue}>{payment.payment_date}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Payment Mode:</Text>
                <Text style={pdfStyles.infoBoxValue}>{modeText}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Reference No:</Text>
                <Text style={pdfStyles.infoBoxValue}>
                  {payment.reference_no || 'Direct Deposit'}
                </Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Resulting Balance:</Text>
                <Text
                  style={[
                    pdfStyles.infoBoxValue,
                    { color: pdfColors.gold, fontWeight: 'bold' },
                  ]}
                >
                  {formatCurrency(resultingBalance)}
                </Text>
              </View>
            </View>
          </View>

          {/* Particulars Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerColParam, { color: '#FFFFFF' }]}>Fee Particulars</Text>
              <Text style={[styles.headerColValue, { color: '#FFFFFF' }]}>Transaction &amp; Settlement Details</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.colParam}>Billed Invoice Total:</Text>
              <Text style={styles.colValue}>
                {formatCurrency(invoice?.grand_total || payment.amount)}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.colParam}>This Transaction Received:</Text>
              <Text style={[styles.colValue, { color: pdfColors.navy }]}>
                {formatCurrency(payment.amount)} ({modeText})
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.colParam}>Remaining Term Balance Due:</Text>
              <Text
                style={[
                  styles.colValue,
                  { color: resultingBalance > 0 ? pdfColors.redText : pdfColors.gold },
                ]}
              >
                {formatCurrency(resultingBalance)}
              </Text>
            </View>
          </View>

          {/* Remittance Notes if available */}
          {payment.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesHeading}>Remittance Notes</Text>
              <Text style={styles.notesText}>{payment.notes}</Text>
            </View>
          )}

          {/* Shared Bank Details Box */}
          <PdfBankDetails settings={settings} />

          {/* Shared Signature Footer with ZYXEN Tag */}
          <PdfFooter
            settings={settings}
            note="Payment receipts are digitally generated upon payment confirmation. For discrepancies, contact finance@aviora.edu with this receipt reference."
          />
        </View>

        {/* Solid Bottom Edge Bar */}
        <View style={pdfStyles.bottomEdgeBar} />
      </Page>
    </Document>
  )
}
