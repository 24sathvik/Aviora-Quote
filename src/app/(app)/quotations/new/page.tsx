import { QuotationForm } from './QuotationForm'

export const metadata = {
  title: 'Create Quotation | Aviora Finance',
  description: 'Generate itemized fee quotations for enrolled students or prospective leads.',
}

export default function NewQuotationPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <QuotationForm />
    </div>
  )
}
