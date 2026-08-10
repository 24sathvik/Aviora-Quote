import { EditQuotationClient } from './EditQuotationClient'

export const metadata = {
  title: 'Edit Quotation | Aviora Finance',
  description: 'Modify quotation details, itemized service breakdown, and valid terms.',
}

export default function EditQuotationPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <EditQuotationClient />
    </div>
  )
}
