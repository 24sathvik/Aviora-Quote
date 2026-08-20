import { InvoiceForm } from './InvoiceForm'

export const metadata = {
  title: 'Create Tax Invoice | Aviora Finance',
  description: 'Generate itemized term billing, tax invoices, and enrollment fees.',
}

export default async function NewInvoicePage(props: {
  searchParams: Promise<{ quotation_id?: string }>
}) {
  const searchParams = await props.searchParams
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <InvoiceForm prefillQuotationId={searchParams.quotation_id || null} />
    </div>
  )
}
