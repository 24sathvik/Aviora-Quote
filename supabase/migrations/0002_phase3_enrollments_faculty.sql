-- ==============================================================================
-- Phase 3: Enrollments, Counselors & Faculty Master Data
-- ==============================================================================

-- 1. Create `counselors` table
CREATE TABLE IF NOT EXISTS public.counselors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create `faculty` table
CREATE TABLE IF NOT EXISTS public.faculty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  date_of_joining DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create `enrollments` table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT NOT NULL,
  batch_year INTEGER NOT NULL,
  current_term INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 5. Permissive policies for authenticated users
DROP POLICY IF EXISTS "Authenticated users can access counselors" ON public.counselors;
CREATE POLICY "Authenticated users can access counselors" ON public.counselors FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access faculty" ON public.faculty;
CREATE POLICY "Authenticated users can access faculty" ON public.faculty FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access enrollments" ON public.enrollments;
CREATE POLICY "Authenticated users can access enrollments" ON public.enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
