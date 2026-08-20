import { PaymentForm } from './PaymentForm'

export const metadata = {
  title: 'Record Payment & Issue Receipt | Aviora Finance',
  description: 'Record student tuition collections, fee payments, and generate official receipts.',
}

export default async function NewPaymentPage(props: {
  searchParams: Promise<{ invoice_id?: string }>
}) {
  const searchParams = await props.searchParams
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <PaymentForm prefillInvoiceId={searchParams.invoice_id || null} />
    </div>
  )
}
