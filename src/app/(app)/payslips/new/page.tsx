import { PayslipForm } from './PayslipForm'

export const metadata = {
  title: 'Generate Faculty Payslip | Aviora Finance',
  description: 'Generate monthly faculty payslips with frozen salary structure snapshots.',
}

export default async function NewPayslipPage(props: {
  searchParams: Promise<{ faculty_id?: string }>
}) {
  const searchParams = await props.searchParams
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <PayslipForm prefillFacultyId={searchParams.faculty_id || null} />
    </div>
  )
}
