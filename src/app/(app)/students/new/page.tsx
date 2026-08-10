import { StudentForm } from './StudentForm'

export const metadata = {
  title: 'New Student Admission | Aviora Finance',
  description: 'Create a new student admission record.',
}

export default function NewStudentPage() {
  return (
    <div className="max-w-4xl mx-auto py-4">
      <StudentForm />
    </div>
  )
}
