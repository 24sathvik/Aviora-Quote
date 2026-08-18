import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PdfHeader, PdfBankDetails, PdfSignatureFooter, pdfStyles } from './branding'
import { formatCurrency } from '@/lib/utils/currency'
import type { Payment, CompanySettings } from '@/types/database'

const styles = StyleSheet.create({
  receiptBanner: {
    backgroundColor: '#059669',
    padding: '8 14',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  receiptNumber: {
    color: '#ecfdf5',
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
    marginBottom: 2.5,
  },
  metaLabel: {
    width: '38%',
    fontSize: 8,
    color: '#64748b',
  },
  metaValue: {
    width: '62%',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  amountCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065f46',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#047857',
  },
  table: {
    width: '100%',
    marginBottom: 16,
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
  colParam: { width: '40%', color: '#64748b' },
  colValue: { width: '60%', fontWeight: 'bold', color: '#0f172a' },
  notesBox: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  notesText: {
    fontSize: 7.5,
    color: '#475569',
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

  const studentName = student?.name || 'Enrolled Student'
  const admissionNo = student?.admission_no || 'AV-STUDENT'
  const invoiceNo = invoice?.invoice_no || 'Invoice Ref'

  return (
    <Document title={`Receipt - ${payment.receipt_no}`} author="Aviora Finance">
      <Page size="A4" style={pdfStyles.page}>
        {/* Shared Reusable Branding Header */}
        <PdfHeader settings={settings} />

        {/* Receipt Banner */}
        <View style={styles.receiptBanner}>
          <Text style={styles.receiptTitle}>Official Payment Receipt</Text>
          <Text style={styles.receiptNumber}>Ref: {payment.receipt_no}</Text>
        </View>

        {/* Amount Box */}
        <View style={styles.amountCard}>
          <View>
            <Text style={styles.amountLabel}>Total Amount Received</Text>
            <Text style={{ fontSize: 7.5, color: '#065f46', marginTop: 2 }}>
              Mode: {payment.payment_mode ? payment.payment_mode.replace('_', ' ').toUpperCase() : 'BANK TRANSFER'}
            </Text>
          </View>
          <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
        </View>

        {/* Meta Grid */}
        <View style={styles.metaGrid}>
          {/* Student Details Card */}
          <View style={styles.metaCard}>
            <Text style={styles.metaHeading}>Student / Remitter</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Student Name:</Text>
              <Text style={styles.metaValue}>{studentName}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Admission No:</Text>
              <Text style={styles.metaValue}>{admissionNo}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Contact Phone:</Text>
              <Text style={styles.metaValue}>{student?.phone || 'N/A'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Course Track:</Text>
              <Text style={styles.metaValue}>
                {course?.name || 'Aviation Pilot Training'}
              </Text>
            </View>
          </View>

          {/* Transaction Metadata Card */}
          <View style={styles.metaCard}>
            <Text style={styles.metaHeading}>Transaction Summary</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Date:</Text>
              <Text style={styles.metaValue}>{payment.payment_date}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice Applied:</Text>
              <Text style={styles.metaValue}>{invoiceNo}</Text>
            </View>
            {term && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Billing Term:</Text>
                <Text style={styles.metaValue}>{term.term_label}</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Transaction Ref:</Text>
              <Text style={styles.metaValue}>{payment.reference_no || 'Direct Realization'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Resulting Balance:</Text>
              <Text
                style={[
                  styles.metaValue,
                  { color: resultingBalance > 0 ? '#b91c1c' : '#047857' },
                ]}
              >
                {formatCurrency(resultingBalance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Breakdown Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colParam}>Fee Particulars</Text>
            <Text style={styles.colValue}>Transaction & Settlement Details</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colParam}>Billed Invoice Total:</Text>
            <Text style={styles.colValue}>
              {formatCurrency(invoice?.grand_total || payment.amount)}
            </Text>
          </View>

          <View style={[styles.tableRow, { backgroundColor: '#f8fafc' }]}>
            <Text style={styles.colParam}>This Transaction Received:</Text>
            <Text style={[styles.colValue, { color: '#047857' }]}>
              {formatCurrency(payment.amount)} ({payment.payment_mode.replace('_', ' ').toUpperCase()})
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colParam}>Remaining Term Balance Due:</Text>
            <Text
              style={[
                styles.colValue,
                { color: resultingBalance > 0 ? '#b91c1c' : '#047857' },
              ]}
            >
              {formatCurrency(resultingBalance)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {payment.notes && (
          <View style={styles.notesBox}>
            <Text style={[styles.metaHeading, { marginBottom: 2 }]}>Remittance Notes</Text>
            <Text style={styles.notesText}>{payment.notes}</Text>
          </View>
        )}

        {/* Shared Bank Details */}
        <PdfBankDetails settings={settings} />

        {/* Shared Signature Footer */}
        <PdfSignatureFooter
          settings={settings}
          note="Payment receipts are digitally generated upon bank realization. For discrepancies, contact finance@aviora.edu with this receipt reference."
        />
      </Page>
    </Document>
  )
}
