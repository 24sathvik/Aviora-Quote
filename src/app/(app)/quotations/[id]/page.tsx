import { QuotationDetail } from './QuotationDetail'

export const metadata = {
  title: 'Quotation Details | Aviora Finance',
  description: 'View official fee quotation sheet, itemized breakdown, and export to PDF.',
}

export default function QuotationDetailPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <QuotationDetail />
    </div>
  )
}
