import { StudentList } from './StudentList'

export const metadata = {
  title: 'Students & Admissions | Aviora Finance',
  description: 'Manage student directory, admissions, and academic enrollment profiles.',
}

export default function StudentsPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <StudentList />
    </div>
  )
}
