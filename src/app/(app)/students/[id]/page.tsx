import { StudentProfile } from './StudentProfile'

export const metadata = {
  title: 'Student Profile & Admission Details | Aviora Finance',
  description: 'View student profile, contact info, enrollment history, and fee ledgers.',
}

export default function StudentDetailPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <StudentProfile />
    </div>
  )
}
