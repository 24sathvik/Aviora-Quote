import { InvoiceDetail } from './InvoiceDetail'

export const metadata = {
  title: 'Invoice Details | Aviora Finance',
  description: 'View official tax invoice, term-wise breakdown, balance due, and payment ledger.',
}

export default function InvoiceDetailPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <InvoiceDetail />
    </div>
  )
}
