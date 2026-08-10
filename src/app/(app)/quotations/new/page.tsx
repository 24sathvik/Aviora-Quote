import { QuotationForm } from './QuotationForm'

export const metadata = {
  title: 'Create Quotation | Aviora Finance',
  description: 'Generate itemized fee quotations for enrolled students or prospective leads.',
}

export default function NewQuotationPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <QuotationForm />
    </div>
  )
}
