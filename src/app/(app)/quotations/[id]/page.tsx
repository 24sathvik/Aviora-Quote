import { QuotationDetail } from './QuotationDetail'

export const metadata = {
  title: 'Quotation Details | Aviora Finance',
  description: 'View official fee quotation sheet, itemized breakdown, and export to PDF.',
}

export default function QuotationDetailPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <QuotationDetail />
    </div>
  )
}
