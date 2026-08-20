import { EditQuotationClient } from './EditQuotationClient'

export const metadata = {
  title: 'Edit Quotation | Aviora Finance',
  description: 'Modify quotation details, itemized service breakdown, and valid terms.',
}

export default function EditQuotationPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <EditQuotationClient />
    </div>
  )
}
