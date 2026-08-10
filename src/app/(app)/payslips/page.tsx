import { PayslipList } from './PayslipList'

export const metadata = {
  title: 'Faculty Payroll & Payslips | Aviora Finance',
  description: 'Manage faculty salary payslips, statutory deductions, and payroll PDF exports.',
}

export default function PayslipsPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <PayslipList />
    </div>
  )
}
