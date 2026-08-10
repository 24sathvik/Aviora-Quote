import { TestNumberingClient } from './TestNumberingClient'

export const metadata = {
  title: 'Numbering Engine Test Harness | Aviora Finance',
  description: 'Developer test harness for atomic sequence generation and financial year boundaries.',
}

export default function TestNumberingPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <TestNumberingClient />
    </div>
  )
}
