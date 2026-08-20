import { FacultyList } from './FacultyList'

export const metadata = {
  title: 'Faculty & Instructors | Aviora Finance',
  description: 'Manage teaching faculty, departments, and payroll bank allocations.',
}

export default function FacultyPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <FacultyList />
    </div>
  )
}
