-- ==============================================================================
-- Phase 8: Faculty Salary Structure & Payslip Payroll Engine
-- ==============================================================================

-- 1. Faculty Salary Structures Table
CREATE TABLE IF NOT EXISTS public.faculty_salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  basic NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  hra NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  other_allowances NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pt_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tds_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for salary structures
CREATE INDEX IF NOT EXISTS idx_salary_structures_faculty ON public.faculty_salary_structures(faculty_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_effective ON public.faculty_salary_structures(effective_from);

-- 2. Payslips Table
CREATE TABLE IF NOT EXISTS public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_no TEXT NOT NULL UNIQUE,
  faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  gross_pay NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  salary_structure_snapshot JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT unique_faculty_month_year UNIQUE (faculty_id, month, year)
);

-- Indexes for payslips
CREATE INDEX IF NOT EXISTS idx_payslips_faculty ON public.payslips(faculty_id);
CREATE INDEX IF NOT EXISTS idx_payslips_month_year ON public.payslips(year, month);

-- 3. Enable RLS and permissive policies
ALTER TABLE public.faculty_salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'faculty_salary_structures' AND policyname = 'Allow authenticated read write for faculty_salary_structures'
  ) THEN
    CREATE POLICY "Allow authenticated read write for faculty_salary_structures"
      ON public.faculty_salary_structures FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payslips' AND policyname = 'Allow authenticated read write for payslips'
  ) THEN
    CREATE POLICY "Allow authenticated read write for payslips"
      ON public.payslips FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
