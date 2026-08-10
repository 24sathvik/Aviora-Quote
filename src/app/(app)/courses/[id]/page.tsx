import { CourseDetail } from './CourseDetail'

export const metadata = {
  title: 'Course Fee Structure | Aviora Finance',
  description: 'Manage term-wise fees and line-item breakups for this course.',
}

export default function CourseDetailPage() {
  return (
    <div className="max-w-7xl mx-auto py-4">
      <CourseDetail />
    </div>
  )
}
