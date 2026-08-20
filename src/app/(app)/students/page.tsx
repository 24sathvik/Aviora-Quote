import { StudentList } from './StudentList'

export const metadata = {
  title: 'Students & Admissions | Aviora Finance',
  description: 'Manage student directory, admissions, and academic enrollment profiles.',
}

export default function StudentsPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <StudentList />
    </div>
  )
}
