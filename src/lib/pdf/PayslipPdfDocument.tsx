import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PdfHeader, PdfSignatureFooter, pdfStyles } from './branding'
import { formatCurrency } from '@/lib/utils/currency'
import type { Payslip, CompanySettings } from '@/types/database'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const styles = StyleSheet.create({
  titleBar: {
    backgroundColor: '#0f172a',
    padding: '8 14',
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
    width: '42%',
    fontSize: 8,
    color: '#64748b',
  },
  metaValue: {
    width: '58%',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  twoColTable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tableCol: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 8.5,
    padding: '6 8',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '6 8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    fontSize: 8,
  },
  tableTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '6 8',
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
    fontSize: 8.5,
  },
  netPayCard: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  netPayLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  netPayValue: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: 'bold',
  },
})

interface PayslipPdfDocumentProps {
  payslip: Payslip
  settings?: Partial<CompanySettings> | null
}

export function PayslipPdfDocument({ payslip, settings }: PayslipPdfDocumentProps) {
  const faculty = payslip.faculty
  const snap = payslip.salary_structure_snapshot || {}
  const monthName = MONTH_NAMES[(payslip.month || 1) - 1]

  const facultyName = faculty?.name || 'Faculty Member'
  const designation = faculty?.designation || 'Senior Flight Instructor'
  const department = faculty?.department || 'Aviation Instruction'

  return (
    <Document title={`Payslip - ${payslip.payslip_no}`} author="Aviora Finance">
      <Page size="A4" style={pdfStyles.page}>
        {/* Shared Branding Header */}
        <PdfHeader settings={settings} />

        {/* Payroll Title Bar */}
        <View style={styles.titleBar}>
          <Text style={styles.docTitle}>
            Faculty Payslip — {monthName} {payslip.year}
          </Text>
          <Text style={styles.docNumber}>Ref: {payslip.payslip_no}</Text>
        </View>

        {/* Faculty & Bank Details Grid */}
        <View style={styles.metaGrid}>
          {/* Faculty Particulars */}
          <View style={styles.metaCard}>
            <Text style={styles.metaHeading}>Faculty Information</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Faculty Name:</Text>
              <Text style={styles.metaValue}>{facultyName}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Designation:</Text>
              <Text style={styles.metaValue}>{designation}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Department:</Text>
              <Text style={styles.metaValue}>{department}</Text>
            </View>
            {faculty?.date_of_joining && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date of Joining:</Text>
                <Text style={styles.metaValue}>{faculty.date_of_joining}</Text>
              </View>
            )}
          </View>

          {/* Salary Remittance Bank Account Details */}
          <View style={styles.metaCard}>
            <Text style={styles.metaHeading}>Remittance Bank Account</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Bank Name:</Text>
              <Text style={styles.metaValue}>{faculty?.bank_name || 'N/A'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Account Name:</Text>
              <Text style={styles.metaValue}>{faculty?.bank_account_name || facultyName}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Account Number:</Text>
              <Text style={styles.metaValue}>{faculty?.bank_account_number || 'N/A'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>IFSC Code:</Text>
              <Text style={styles.metaValue}>{faculty?.bank_ifsc || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Two-Column Earnings vs Deductions Table */}
        <View style={styles.twoColTable}>
          {/* Earnings Table */}
          <View style={styles.tableCol}>
            <Text style={styles.tableHeader}>Gross Earnings</Text>
            <View style={styles.tableRow}>
              <Text style={{ color: '#475569' }}>Basic Pay</Text>
              <Text style={{ fontWeight: 'bold' }}>
                {formatCurrency(snap.basic || 0)}
              </Text>
            </View>
            <View style={[styles.tableRow, { backgroundColor: '#f8fafc' }]}>
              <Text style={{ color: '#475569' }}>House Rent Allowance (HRA)</Text>
              <Text style={{ fontWeight: 'bold' }}>
                {formatCurrency(snap.hra || 0)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ color: '#475569' }}>Special / Other Allowances</Text>
              <Text style={{ fontWeight: 'bold' }}>
                {formatCurrency(snap.other_allowances || 0)}
              </Text>
            </View>
            <View style={styles.tableTotalRow}>
              <Text style={{ color: '#0f172a' }}>Total Gross Earnings:</Text>
              <Text style={{ color: '#0f172a' }}>
                {formatCurrency(payslip.gross_pay)}
              </Text>
            </View>
          </View>

          {/* Deductions Table */}
          <View style={styles.tableCol}>
            <Text style={[styles.tableHeader, { backgroundColor: '#881337' }]}>
              Statutory Deductions
            </Text>
            <View style={styles.tableRow}>
              <Text style={{ color: '#475569' }}>Provident Fund (PF)</Text>
              <Text style={{ fontWeight: 'bold', color: '#b91c1c' }}>
                {formatCurrency(snap.pf_deduction || 0)}
              </Text>
            </View>
            <View style={[styles.tableRow, { backgroundColor: '#f8fafc' }]}>
              <Text style={{ color: '#475569' }}>Professional Tax (PT)</Text>
              <Text style={{ fontWeight: 'bold', color: '#b91c1c' }}>
                {formatCurrency(snap.pt_deduction || 0)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ color: '#475569' }}>Income Tax (TDS)</Text>
              <Text style={{ fontWeight: 'bold', color: '#b91c1c' }}>
                {formatCurrency(snap.tds_deduction || 0)}
              </Text>
            </View>
            <View style={[styles.tableRow, { backgroundColor: '#f8fafc' }]}>
              <Text style={{ color: '#475569' }}>Other Deductions</Text>
              <Text style={{ fontWeight: 'bold', color: '#b91c1c' }}>
                {formatCurrency(snap.other_deductions || 0)}
              </Text>
            </View>
            <View style={[styles.tableTotalRow, { backgroundColor: '#fff1f2' }]}>
              <Text style={{ color: '#9f1239' }}>Total Deductions:</Text>
              <Text style={{ color: '#9f1239' }}>
                {formatCurrency(payslip.total_deductions)}
              </Text>
            </View>
          </View>
        </View>

        {/* Net Salary Payable Box */}
        <View style={styles.netPayCard}>
          <View>
            <Text style={styles.netPayLabel}>Net Salary Transferred to Bank Account</Text>
            <Text style={{ color: '#cbd5e1', fontSize: 7.5, marginTop: 2 }}>
              Gross Pay ({formatCurrency(payslip.gross_pay)}) minus Total Deductions (
              {formatCurrency(payslip.total_deductions)})
            </Text>
          </View>
          <Text style={styles.netPayValue}>{formatCurrency(payslip.net_pay)}</Text>
        </View>

        {/* Shared Signature Footer */}
        <PdfSignatureFooter
          settings={settings}
          note="This is a computer-generated salary payslip. It does not require a physical wet signature."
        />
      </Page>
    </Document>
  )
}
