import { StudentProfile } from './StudentProfile'

export const metadata = {
  title: 'Student Profile & Admission Details | Aviora Finance',
  description: 'View student profile, contact info, enrollment history, and fee ledgers.',
}

export default function StudentDetailPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <StudentProfile />
    </div>
  )
}
