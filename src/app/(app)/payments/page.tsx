import { PaymentList } from './PaymentList'

export const metadata = {
  title: 'Payment Receipts & Collections | Aviora Finance',
  description: 'Manage student fee receipts, bank transactions, and collections ledger.',
}

export default function PaymentsPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <PaymentList />
    </div>
  )
}
