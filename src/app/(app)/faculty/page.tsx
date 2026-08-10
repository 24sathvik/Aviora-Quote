import { FacultyList } from './FacultyList'

export const metadata = {
  title: 'Faculty & Instructors | Aviora Finance',
  description: 'Manage teaching faculty, departments, and payroll bank allocations.',
}

export default function FacultyPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <FacultyList />
    </div>
  )
}
