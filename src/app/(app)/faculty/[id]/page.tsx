import { FacultyProfile } from './FacultyProfile'

export const metadata = {
  title: 'Faculty Profile | Aviora Finance',
  description: 'View faculty details, department assignment, and payroll banking info.',
}

export default function FacultyDetailPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <FacultyProfile />
    </div>
  )
}
