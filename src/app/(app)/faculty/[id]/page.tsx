import { FacultyProfile } from './FacultyProfile'

export const metadata = {
  title: 'Faculty Profile | Aviora Finance',
  description: 'View faculty details, department assignment, and payroll banking info.',
}

export default function FacultyDetailPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <FacultyProfile />
    </div>
  )
}
