import { CourseList } from './CourseList'

export const metadata = {
  title: 'Courses & Fee Structure | Aviora Finance',
  description: 'Manage academic courses, terms, and fee structure catalog.',
}

export default function CoursesPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <CourseList />
    </div>
  )
}
