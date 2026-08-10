import { ReportsClient } from './ReportsClient'

export const metadata = {
  title: 'Financial Reports & Audit Hub | Aviora Finance',
  description: 'Exportable financial ledgers, outstanding fee registers, collection histories, and payroll reports.',
}

export default function ReportsPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <ReportsClient />
    </div>
  )
}
