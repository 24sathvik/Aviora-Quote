import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrncaebimjmwhqltroqi.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function setupEnrollment() {
  await supabase.auth.signInWithPassword({
    email: 'admin@aviora.edu',
    password: 'AvioraAdmin2026!',
  })

  const studentId = 'c7d03884-0f8d-41f9-98f5-cf6c0180ae0f' // Aarav Sharma
  const courseId = 'e373463d-0868-4425-8651-4d3a55553fd4' // Computer Science

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)

  if (existing && existing.length > 0) {
    console.log('Enrollment already exists:', existing[0].id)
    return
  }

  const { data: newEnrollment, error } = await supabase
    .from('enrollments')
    .insert({
      student_id: studentId,
      course_id: courseId,
      batch_year: 2026,
      current_term: 1,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating enrollment:', error.message)
  } else {
    console.log('Enrollment created successfully:', newEnrollment.id)
  }
}

setupEnrollment()
