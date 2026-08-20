import { InvoiceList } from './InvoiceList'

export const metadata = {
  title: 'Tax Invoices & Billing | Aviora Finance',
  description: 'Manage academic fee invoices, term billing, previous outstandings, and balance ledgers.',
}

export default function InvoicesPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <InvoiceList />
    </div>
  )
}
