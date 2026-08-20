import { InvoiceDetail } from './InvoiceDetail'

export const metadata = {
  title: 'Invoice Details | Aviora Finance',
  description: 'View official tax invoice, term-wise breakdown, balance due, and payment ledger.',
}

export default function InvoiceDetailPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <InvoiceDetail />
    </div>
  )
}
