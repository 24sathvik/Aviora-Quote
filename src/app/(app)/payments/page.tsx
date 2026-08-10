import { PaymentList } from './PaymentList'

export const metadata = {
  title: 'Payment Receipts & Collections | Aviora Finance',
  description: 'Manage student fee receipts, bank realizations, and collections ledger.',
}

export default function PaymentsPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <PaymentList />
    </div>
  )
}
