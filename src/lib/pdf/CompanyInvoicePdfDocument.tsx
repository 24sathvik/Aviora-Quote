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
import { formatCurrencyWithSymbol, getCurrencySymbol } from '@/lib/utils/currency'
import type { CompanyInvoice, CompanySettings } from '@/types/database'

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
  headerColNo: { width: '8%', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },
  headerColDesc: { width: '52%', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },
  headerColQty: { width: '10%', textAlign: 'center', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },
  headerColRate: { width: '15%', textAlign: 'right', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },
  headerColTotal: { width: '15%', textAlign: 'right', color: '#FFFFFF', fontWeight: 'bold', fontSize: 8.5, textTransform: 'uppercase' },

  colNo: { width: '8%', color: pdfColors.textMuted },
  colDesc: { width: '52%', color: pdfColors.navy, fontWeight: 'medium' },
  colQty: { width: '10%', textAlign: 'center', color: pdfColors.navy },
  colRate: { width: '15%', textAlign: 'right', color: pdfColors.navy },
  colTotal: { width: '15%', textAlign: 'right', fontWeight: 'bold', color: pdfColors.navy },
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

interface CompanyInvoicePdfDocumentProps {
  invoice: CompanyInvoice
  settings?: Partial<CompanySettings> | null
}

export function CompanyInvoicePdfDocument({ invoice, settings }: CompanyInvoicePdfDocumentProps) {
  const items = invoice.company_invoice_items || []
  const currency = invoice.currency || 'INR'
  const currencySymbol = getCurrencySymbol(currency)

  const termsText =
    settings?.terms_and_conditions_text ||
    '1. Payment must reference this company invoice number.\n2. Invoices overdue beyond 15 days may incur finance service fees.\n3. Bank account remittance details provided below.'

  const isGstApplied = Number(invoice.gst_percent) > 0 && Number(invoice.gst_amount) > 0

  return (
    <Document title={`Company Invoice - ${invoice.invoice_no}`} author="Aviora Finance">
      <Page size="A4" style={pdfStyles.page}>
        {/* Solid Top Edge Bar */}
        <View style={pdfStyles.topEdgeBar} />

        {/* Page Inner Container */}
        <View style={pdfStyles.bodyContent}>
          {/* Header Row with Address, Tax IDs & Fixed Logo */}
          <PdfHeader settings={settings} />

          {/* Document Title */}
          <Text style={pdfStyles.docTitle}>
            {isGstApplied ? 'TAX INVOICE' : 'COMMERCIAL INVOICE'}
          </Text>

          {/* Two-Tone Angled Status Ribbon */}
          <PdfStatusRibbon
            title="CORPORATE COMPANY INVOICE"
            subtitle={`${invoice.invoice_no} (${invoice.fy_label})`}
          />

          {/* Side-by-side Info Cards */}
          <View style={pdfStyles.infoBoxesGrid}>
            {/* Left Card: BILLED TO (COMPANY) */}
            <View style={pdfStyles.infoBoxCard}>
              <Text style={pdfStyles.infoBoxTitle}>BILLED TO (COMPANY)</Text>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Company Name:</Text>
                <Text style={pdfStyles.infoBoxValue}>{invoice.company_name}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Mobile / Phone:</Text>
                <Text style={pdfStyles.infoBoxValue}>{invoice.company_phone}</Text>
              </View>
              {invoice.company_address && (
                <View style={pdfStyles.infoBoxRow}>
                  <Text style={pdfStyles.infoBoxLabel}>Address:</Text>
                  <Text style={pdfStyles.infoBoxValue}>{invoice.company_address}</Text>
                </View>
              )}
              {invoice.company_gstin && (
                <View style={pdfStyles.infoBoxRow}>
                  <Text style={pdfStyles.infoBoxLabel}>GST Number:</Text>
                  <Text style={pdfStyles.infoBoxValue}>{invoice.company_gstin}</Text>
                </View>
              )}
              {invoice.company_cin && (
                <View style={pdfStyles.infoBoxRow}>
                  <Text style={pdfStyles.infoBoxLabel}>CIN Number:</Text>
                  <Text style={pdfStyles.infoBoxValue}>{invoice.company_cin}</Text>
                </View>
              )}
            </View>

            {/* Right Card: INVOICE DETAILS */}
            <View style={pdfStyles.infoBoxCard}>
              <Text style={pdfStyles.infoBoxTitle}>INVOICE DETAILS</Text>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Invoice Date:</Text>
                <Text style={pdfStyles.infoBoxValue}>{invoice.invoice_date}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Due Date:</Text>
                <Text style={pdfStyles.infoBoxValue}>{invoice.due_date}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Billing Currency:</Text>
                <Text style={pdfStyles.infoBoxValue}>{`${currency} (${currencySymbol})`}</Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Payment Status:</Text>
                <Text style={[pdfStyles.infoBoxValue, { textTransform: 'uppercase' }]}>
                  {invoice.status}
                </Text>
              </View>
              <View style={pdfStyles.infoBoxRow}>
                <Text style={pdfStyles.infoBoxLabel}>Grand Total:</Text>
                <Text
                  style={[
                    pdfStyles.infoBoxValue,
                    { color: pdfColors.navy, fontWeight: 'bold' },
                  ]}
                >
                  {formatCurrencyWithSymbol(invoice.grand_total, currency)}
                </Text>
              </View>
            </View>
          </View>

          {/* Itemized Line Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.headerColNo}>#</Text>
              <Text style={styles.headerColDesc}>Student Name / Description</Text>
              <Text style={styles.headerColQty}>Qty</Text>
              <Text style={styles.headerColRate}>Fee / Amount</Text>
              <Text style={styles.headerColTotal}>Total</Text>
            </View>

            {items.map((item, idx) => (
              <View key={item.id || idx} style={styles.tableRow}>
                <Text style={styles.colNo}>{idx + 1}</Text>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colRate}>
                  {formatCurrencyWithSymbol(item.unit_price, currency)}
                </Text>
                <Text style={styles.colTotal}>
                  {formatCurrencyWithSymbol(item.line_total, currency)}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals Block & Bank Remittance Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            {/* Totals Block (Left) */}
            <View style={styles.totalsBlock}>
              <View style={styles.totalRow}>
                <Text style={{ color: pdfColors.textMuted }}>Subtotal:</Text>
                <Text style={{ fontWeight: 'bold', color: pdfColors.navy }}>
                  {formatCurrencyWithSymbol(invoice.subtotal, currency)}
                </Text>
              </View>

              {Number(invoice.discount_amount) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{ color: pdfColors.redText }}>Discount Amount:</Text>
                  <Text style={{ fontWeight: 'bold', color: pdfColors.redText }}>
                    - {formatCurrencyWithSymbol(invoice.discount_amount, currency)}
                  </Text>
                </View>
              )}

              {isGstApplied ? (
                <View style={styles.totalRow}>
                  <Text style={{ color: pdfColors.textMuted }}>
                    GST ({invoice.gst_percent}%):
                  </Text>
                  <Text style={{ fontWeight: 'bold', color: pdfColors.navy }}>
                    + {formatCurrencyWithSymbol(invoice.gst_amount, currency)}
                  </Text>
                </View>
              ) : (
                <View style={styles.totalRow}>
                  <Text style={{ color: pdfColors.textMuted }}>GST (Optional):</Text>
                  <Text style={{ color: pdfColors.textMuted }}>Not Applicable (0%)</Text>
                </View>
              )}

              <View style={{ borderBottomWidth: 1, borderBottomColor: pdfColors.navy, marginVertical: 4 }} />

              <View style={styles.totalRow}>
                <Text style={{ fontWeight: 'bold', fontSize: 10, color: pdfColors.navy }}>
                  Grand Total ({currency}):
                </Text>
                <Text style={{ fontWeight: 'bold', fontSize: 10, color: pdfColors.navy }}>
                  {formatCurrencyWithSymbol(invoice.grand_total, currency)}
                </Text>
              </View>
            </View>

            {/* Bank Remittance & Payment Terms (Right) */}
            <View style={{ width: '50%' }}>
              <PdfBankDetails settings={settings} />

              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: pdfColors.navy, marginBottom: 2 }}>
                  Payment Terms &amp; Instructions
                </Text>
                <Text style={{ fontSize: 6.5, color: '#475569', lineHeight: 1.3 }}>
                  {invoice.notes || termsText}
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
