import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  PdfHeader,
  PdfStatusRibbon,
  PdfFooter,
  pdfColors,
  pdfStyles,
} from './branding'
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
  netPayHighlightBox: {
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
  netPayLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: pdfColors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  netPaySub: {
    fontSize: 7.5,
    color: pdfColors.textMuted,
    marginTop: 2,
  },
  netPayValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: pdfColors.navy,
  },
  twoColTable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tableCol: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: pdfColors.navy,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: pdfColors.navy,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 8.5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.borderGray,
    fontSize: 8.5,
    backgroundColor: pdfColors.bgCream,
  },
  tableTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: pdfColors.goldLight,
    fontWeight: 'bold',
    fontSize: 8.5,
  },
  facultyBankBox: {
    marginBottom: 12,
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

  // Faculty member's own bank details
  const facultyBankName = faculty?.bank_name || 'N/A'
  const facultyAccName = faculty?.bank_account_name || facultyName
  const facultyAccNo = faculty?.bank_account_number || 'N/A'
  const facultyIfsc = faculty?.bank_ifsc || 'N/A'

  return (
    <Document title={`Payslip - ${payslip.payslip_no}`} author="Aviora Finance">
      <Page size="A4" style={pdfStyles.page}>
        {/* Solid Top Edge Bar */}
        <View style={pdfStyles.topEdgeBar} />

        {/* Page Inner Container */}
        <View style={pdfStyles.bodyContent}>
          {/* Header Row with Address, Tax IDs & Fixed Logo */}
          <PdfHeader settings={settings} />

          {/* Document Title */}
          <Text style={pdfStyles.docTitle}>PAYSLIP</Text>

          {/* Two-Tone Angled Status Ribbon */}
          <PdfStatusRibbon
            title="SALARY PAYSLIP"
            subtitle={`${payslip.payslip_no} — ${monthName.toUpperCase()} ${payslip.year}`}
          />

          {/* Side-by-side Info Cards */}
          <View style={pdfStyles.infoBoxesGrid}>
            {/* Left Card: FACULTY DETAILS */}
            <View style={pdfStyles.infoBoxCard}>
              <Text style={pdfStyles.infoBoxTitle}>FACULTY DETAILS</Text>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Name:</Text>
                <Text style={pdfStyles.infoBoxValue}>{facultyName}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Designation:</Text>
                <Text style={pdfStyles.infoBoxValue}>{designation}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Department:</Text>
                <Text style={pdfStyles.infoBoxValue}>{department}</Text>
              </View>
              {faculty?.date_of_joining && (
                <View style={pdfStyles.infoBoxRow}>
                  <Text style={pdfStyles.infoBoxLabel}>Joining Date:</Text>
                  <Text style={pdfStyles.infoBoxValue}>{faculty.date_of_joining}</Text>
                </View>
              )}
            </View>

            {/* Right Card: PAY PERIOD SUMMARY */}
            <View style={pdfStyles.infoBoxCard}>
              <Text style={pdfStyles.infoBoxTitle}>PAY PERIOD SUMMARY</Text>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Pay Period:</Text>
                <Text style={pdfStyles.infoBoxValue}>
                  {monthName} {payslip.year}
                </Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Issue Date:</Text>
                <Text style={pdfStyles.infoBoxValue}>
                  {payslip.generated_at ? payslip.generated_at.split('T')[0] : 'N/A'}
                </Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Status:</Text>
                <Text style={[pdfStyles.infoBoxValue, { textTransform: 'uppercase' }]}>
                  PAID
                </Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Net Pay:</Text>
                <Text
                  style={[
                    pdfStyles.infoBoxValue,
                    { color: pdfColors.gold, fontWeight: 'bold' },
                  ]}
                >
                  {formatCurrency(payslip.net_pay)}
                </Text>
              </View>
            </View>
          </View>

          {/* Prominent Net Salary Payable Card */}
          <View style={styles.netPayHighlightBox}>
            <View>
              <Text style={styles.netPayLabel}>NET SALARY PAYABLE</Text>
              <Text style={styles.netPaySub}>
                Gross Pay ({formatCurrency(payslip.gross_pay)}) minus Total Deductions (
                {formatCurrency(payslip.total_deductions)})
              </Text>
            </View>
            <Text style={styles.netPayValue}>{formatCurrency(payslip.net_pay)}</Text>
          </View>

          {/* Two-Column Earnings & Deductions Table */}
          <View style={styles.twoColTable}>
            {/* Earnings Table (Left Column) */}
            <View style={styles.tableCol}>
              <Text style={styles.tableHeader}>Gross Earnings</Text>
              <View style={styles.tableRow}>
                <Text style={{ color: pdfColors.navy }}>Basic Pay</Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.navy }}>
                  {formatCurrency(snap.basic || 0)}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={{ color: pdfColors.navy }}>House Rent Allowance (HRA)</Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.navy }}>
                  {formatCurrency(snap.hra || 0)}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={{ color: pdfColors.navy }}>Special / Other Allowances</Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.navy }}>
                  {formatCurrency(snap.other_allowances || 0)}
                </Text>
              </View>
              <View style={styles.tableTotalRow}>
                <Text style={{ color: pdfColors.navy, fontWeight: 'bold' }}>
                  Total Gross Earnings:
                </Text>
                <Text style={{ color: pdfColors.navy, fontWeight: 'bold' }}>
                  {formatCurrency(payslip.gross_pay)}
                </Text>
              </View>
            </View>

            {/* Deductions Table (Right Column) */}
            <View style={styles.tableCol}>
              <Text style={styles.tableHeader}>Statutory Deductions</Text>
              <View style={styles.tableRow}>
                <Text style={{ color: pdfColors.navy }}>Provident Fund (PF)</Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.redText }}>
                  {formatCurrency(snap.pf_deduction || 0)}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={{ color: pdfColors.navy }}>Professional Tax (PT)</Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.redText }}>
                  {formatCurrency(snap.pt_deduction || 0)}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={{ color: pdfColors.navy }}>Income Tax (TDS)</Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.redText }}>
                  {formatCurrency(snap.tds_deduction || 0)}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={{ color: pdfColors.navy }}>Other Deductions</Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.redText }}>
                  {formatCurrency(snap.other_deductions || 0)}
                </Text>
              </View>
              <View style={styles.tableTotalRow}>
                <Text style={{ color: pdfColors.redText, fontWeight: 'bold' }}>
                  Total Deductions:
                </Text>
                <Text style={{ color: pdfColors.redText, fontWeight: 'bold' }}>
                  {formatCurrency(payslip.total_deductions)}
                </Text>
              </View>
            </View>
          </View>

          {/* Faculty Salary Remittance Bank Account Details (Pulled from Faculty Record) */}
          <View style={styles.facultyBankBox}>
            <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: pdfColors.navy, marginBottom: 4 }}>
              FACULTY SALARY REMITTANCE BANK ACCOUNT
            </Text>
            <View
              style={{
                backgroundColor: pdfColors.goldLight,
                padding: 8,
                borderRadius: 6,
              }}
            >
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Beneficiary:</Text>
                <Text style={pdfStyles.infoBoxValue}>{facultyAccName}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Bank Name:</Text>
                <Text style={pdfStyles.infoBoxValue}>{facultyBankName}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Account No:</Text>
                <Text style={pdfStyles.infoBoxValue}>{facultyAccNo}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>IFSC Code:</Text>
                <Text style={pdfStyles.infoBoxValue}>{facultyIfsc}</Text>
              </View>
            </View>
          </View>

          {/* Shared Signature Footer with ZYXEN Tag */}
          <PdfFooter
            settings={settings}
            note="This is a computer-generated salary payslip. It does not require a physical wet signature."
          />
        </View>

        {/* Solid Bottom Edge Bar */}
        <View style={pdfStyles.bottomEdgeBar} />
      </Page>
    </Document>
  )
}
