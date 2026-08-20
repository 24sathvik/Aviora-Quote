import { DashboardClient } from './DashboardClient'

export const metadata = {
  title: 'Executive Financial Dashboard | Aviora Finance',
  description: 'Real-time overview of fee collections, outstanding ledgers, course performance, and payroll disbursements.',
}

export default function DashboardPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <DashboardClient />
    </div>
  )
}
