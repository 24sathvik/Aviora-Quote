import { EditInvoiceClient } from './EditInvoiceClient'

export const metadata = {
  title: 'Edit Tax Invoice | Aviora Finance',
  description: 'Modify invoice details, line items, and payment schedules.',
}

export default function EditInvoicePage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <EditInvoiceClient />
    </div>
  )
}
