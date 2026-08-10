import { DashboardClient } from './DashboardClient'

export const metadata = {
  title: 'Executive Financial Dashboard | Aviora Finance',
  description: 'Real-time overview of fee collections, outstanding ledgers, course performance, and payroll disbursements.',
}

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <DashboardClient />
    </div>
  )
}
