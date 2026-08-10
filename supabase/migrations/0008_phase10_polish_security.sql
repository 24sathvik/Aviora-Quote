-- ==============================================================================
-- Phase 10: Performance Indexes, Security Hardening & Trigger-based Audit Logging
-- ==============================================================================

-- 1. Performance Indexes across All High-Traffic Query Paths
CREATE INDEX IF NOT EXISTS idx_students_admission_no ON public.students(admission_no);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_enrollment_id ON public.invoices(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_course_term_id ON public.invoices(course_term_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON public.invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_quotations_student_id ON public.quotations(student_id);
CREATE INDEX IF NOT EXISTS idx_quotations_counselor_id ON public.quotations(counselor_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);

CREATE INDEX IF NOT EXISTS idx_payslips_faculty_id ON public.payslips(faculty_id);
CREATE INDEX IF NOT EXISTS idx_payslips_month_year ON public.payslips(year, month);
CREATE INDEX IF NOT EXISTS idx_salary_struct_faculty_date ON public.faculty_salary_structures(faculty_id, effective_from DESC);

-- 2. Audit Log Table Schema (from Phase 1 / 10)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 3. Automatic Trigger Function for Financial Audit Logging
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Extract user ID from Supabase auth context if available
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', NULL, to_jsonb(NEW), v_user_id);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), NULL, v_user_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach Audit Triggers to the 4 Core Document & Transaction Tables
DROP TRIGGER IF EXISTS audit_quotations_trigger ON public.quotations;
CREATE TRIGGER audit_quotations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_invoices_trigger ON public.invoices;
CREATE TRIGGER audit_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_payments_trigger ON public.payments;
CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_payslips_trigger ON public.payslips;
CREATE TRIGGER audit_payslips_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 5. RLS Audit: Enforce Row Level Security across All 12 Database Tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.numbering_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policy for audit_logs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Allow authenticated read write for audit_logs'
  ) THEN
    CREATE POLICY "Allow authenticated read write for audit_logs"
      ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
