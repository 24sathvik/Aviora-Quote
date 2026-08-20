import { QuotationList } from './QuotationList'

export const metadata = {
  title: 'Fee Quotations | Aviora Finance',
  description: 'Manage and issue itemized program quotations, fee schedules, and proposals.',
}

export default function QuotationsPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <QuotationList />
    </div>
  )
}
