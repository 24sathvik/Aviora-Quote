import React from 'react'
import { Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { CompanySettings } from '@/types/database'

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    marginBottom: 16,
  },
  companyLogo: {
    width: 64,
    height: 64,
    objectFit: 'contain',
    borderRadius: 6,
  },
  companyInfo: {
    alignItems: 'flex-end',
    maxWidth: '55%',
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 3,
  },
  companyMeta: {
    fontSize: 8,
    color: '#64748b',
    lineHeight: 1.3,
    textAlign: 'right',
  },
  taxIdsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  taxBadge: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bankBlock: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 14,
    width: '55%',
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  bankLabel: {
    width: '40%',
    color: '#64748b',
    fontSize: 8,
  },
  bankValue: {
    width: '60%',
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    fontSize: 8,
  },
  footerContainer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerNote: {
    fontSize: 7.5,
    color: '#94a3b8',
    maxWidth: '55%',
    lineHeight: 1.3,
  },
  signatureBlock: {
    alignItems: 'center',
    width: 140,
  },
  signatureImage: {
    width: 100,
    height: 40,
    objectFit: 'contain',
    marginBottom: 4,
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    paddingTop: 4,
    alignItems: 'center',
  },
  signatoryTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  signatorySubtitle: {
    fontSize: 7,
    color: '#64748b',
  },
})

export function PdfHeader({ settings }: { settings?: Partial<CompanySettings> | null }) {
  const companyName = settings?.company_name || 'AVIORA AVIATION ACADEMY'
  const email = settings?.company_email || 'finance@aviora.edu'
  const phone = settings?.company_phone || '+91 (0) 80 4567 8900'
  const address = settings?.company_address || 'Aviora Flight Operations Wing, International Aerocity'
  const gstin = settings?.gstin || '29AAAAA0000A1Z5'
  const pan = settings?.pan || 'AAAAA0000A'

  return (
    <View style={pdfStyles.headerContainer}>
      <View>
        {settings?.logo_url ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={settings.logo_url} style={pdfStyles.companyLogo} />
        ) : (
          <View style={{ backgroundColor: '#0f172a', padding: 8, borderRadius: 4 }}>
            <Text style={{ color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 12 }}>AVIORA</Text>
          </View>
        )}
      </View>

      <View style={pdfStyles.companyInfo}>
        <Text style={pdfStyles.companyName}>{companyName}</Text>
        <Text style={pdfStyles.companyMeta}>{address}</Text>
        <Text style={pdfStyles.companyMeta}>
          {phone} | {email}
        </Text>
        <View style={pdfStyles.taxIdsRow}>
          {gstin && <Text style={pdfStyles.taxBadge}>GSTIN: {gstin}</Text>}
          {pan && <Text style={pdfStyles.taxBadge}>PAN: {pan}</Text>}
        </View>
      </View>
    </View>
  )
}

export function PdfBankDetails({ settings }: { settings?: Partial<CompanySettings> | null }) {
  const bankName = settings?.bank_name || 'HDFC Bank Ltd'
  const accName = settings?.bank_account_name || 'Aviora Aviation Academy Pvt Ltd'
  const accNo = settings?.bank_account_number || '50200084920192'
  const ifsc = settings?.bank_ifsc || 'HDFC0001234'
  const branch = settings?.bank_branch || 'Aerocity Corporate Branch'

  return (
    <View style={pdfStyles.bankBlock}>
      <Text style={[pdfStyles.sectionTitle, { fontSize: 8.5, marginBottom: 4 }]}>
        Remittance & Bank Details
      </Text>
      <View style={pdfStyles.bankRow}>
        <Text style={pdfStyles.bankLabel}>Beneficiary:</Text>
        <Text style={pdfStyles.bankValue}>{accName}</Text>
      </View>
      <View style={pdfStyles.bankRow}>
        <Text style={pdfStyles.bankLabel}>Bank Name:</Text>
        <Text style={pdfStyles.bankValue}>{bankName}</Text>
      </View>
      <View style={pdfStyles.bankRow}>
        <Text style={pdfStyles.bankLabel}>Account No:</Text>
        <Text style={pdfStyles.bankValue}>{accNo}</Text>
      </View>
      <View style={pdfStyles.bankRow}>
        <Text style={pdfStyles.bankLabel}>IFSC Code:</Text>
        <Text style={pdfStyles.bankValue}>{ifsc}</Text>
      </View>
      <View style={pdfStyles.bankRow}>
        <Text style={pdfStyles.bankLabel}>Branch:</Text>
        <Text style={pdfStyles.bankValue}>{branch}</Text>
      </View>
    </View>
  )
}

export function PdfSignatureFooter({
  settings,
  note = 'This is a computer-generated official document. Please quote the reference number in all communications.',
}: {
  settings?: Partial<CompanySettings> | null
  note?: string
}) {
  const companyName = settings?.company_name || 'Aviora Aviation Academy'

  return (
    <View style={pdfStyles.footerContainer}>
      <Text style={pdfStyles.footerNote}>{note}</Text>

      <View style={pdfStyles.signatureBlock}>
        {settings?.signature_url ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={settings.signature_url} style={pdfStyles.signatureImage} />
        ) : (
          <View style={{ height: 32 }} />
        )}
        <View style={pdfStyles.signatureLine}>
          <Text style={pdfStyles.signatoryTitle}>Authorized Signatory</Text>
          <Text style={pdfStyles.signatorySubtitle}>For {companyName}</Text>
        </View>
      </View>
    </View>
  )
}
