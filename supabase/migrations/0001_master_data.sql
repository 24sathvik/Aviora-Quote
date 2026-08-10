-- ==============================================================================
-- Phase 2: Master Data — Students, Courses & Fee Structure
-- ==============================================================================

-- 1. Create `courses` table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_terms INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create `course_terms` table
CREATE TABLE IF NOT EXISTS public.course_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  term_no INTEGER NOT NULL,
  term_label TEXT NOT NULL,
  term_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create `fee_heads` table (Optional fee breakup per term)
CREATE TABLE IF NOT EXISTS public.fee_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_term_id UUID REFERENCES public.course_terms(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

-- 4. Create sequence for Student Admission Number
CREATE SEQUENCE IF NOT EXISTS public.student_admission_seq START 1;

-- 5. Create `students` table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  dob DATE,
  phone TEXT NOT NULL,
  email TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  address TEXT,
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'enquiry' CHECK (status IN ('enquiry', 'enrolled', 'active', 'completed', 'dropped')),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Auto-generate admission_no trigger function
CREATE OR REPLACE FUNCTION public.generate_admission_no()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_val BIGINT;
BEGIN
  IF NEW.admission_no IS NULL OR NEW.admission_no = '' THEN
    current_year := TO_CHAR(COALESCE(NEW.admission_date, CURRENT_DATE), 'YYYY');
    next_val := nextval('public.student_admission_seq');
    NEW.admission_no := 'AV-' || current_year || '-' || LPAD(next_val::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_admission_no ON public.students;
CREATE TRIGGER trigger_generate_admission_no
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_admission_no();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 7. Permissive policies for authenticated users
DROP POLICY IF EXISTS "Authenticated users can access courses" ON public.courses;
CREATE POLICY "Authenticated users can access courses" ON public.courses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access course_terms" ON public.course_terms;
CREATE POLICY "Authenticated users can access course_terms" ON public.course_terms FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access fee_heads" ON public.fee_heads;
CREATE POLICY "Authenticated users can access fee_heads" ON public.fee_heads FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access students" ON public.students;
CREATE POLICY "Authenticated users can access students" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);
