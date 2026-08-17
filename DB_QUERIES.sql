-- ==============================================================================
-- AVIORA AVIATION ACADEMY — COMPLETE DATABASE SCHEMA & QUERIES
-- ==============================================================================
-- System: AVIORA Aviation Finance & Fee Management System
-- Database: PostgreSQL 15+ (Supabase)
-- Currency Standard: NUMERIC(12,2) Strict Fixed-Point Precision
-- ==============================================================================

-- ##############################################################################
-- SECTION 1: EXTENSIONS & SCHEMAS
-- ##############################################################################

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ##############################################################################
-- SECTION 2: TABLES DDL & SEQUENCES
-- ##############################################################################

-- 1. Users Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Company & Academy Settings Table
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  address TEXT,
  phone TEXT,
  gstin TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  logo_url TEXT,
  signature_url TEXT,
  terms_and_conditions_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Atomic Numbering Sequences Ledger Table
CREATE TABLE IF NOT EXISTS public.numbering_sequences (
  doc_type TEXT NOT NULL,
  fy_label TEXT NOT NULL,
  last_number INTEGER DEFAULT 0,
  PRIMARY KEY (doc_type, fy_label)
);

-- 4. Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Courses Catalog Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_terms INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Course Terms Table
CREATE TABLE IF NOT EXISTS public.course_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  term_no INTEGER NOT NULL,
  term_label TEXT NOT NULL,
  term_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Fee Heads Table (Optional fee breakdown per term)
CREATE TABLE IF NOT EXISTS public.fee_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_term_id UUID REFERENCES public.course_terms(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

-- 8. Students Master Table & Admission Sequence
CREATE SEQUENCE IF NOT EXISTS public.student_admission_seq START 1;

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

-- 9. Student Course Enrollments Table
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

-- 10. Faculty & Flight Instructors Table
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

-- 11. Faculty Salary Structures Table
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Monthly Payslips Table (with Frozen JSONB Snapshot)
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
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT unique_faculty_month_year UNIQUE (faculty_id, month, year)
);

-- 13. Flight Training Quotations Table
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no TEXT UNIQUE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  lead_name TEXT,
  lead_phone TEXT,
  lead_email TEXT,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired', 'converted')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  terms_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- 14. Quotation Line Items Table
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Term Tax Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  fy_label TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  course_term_id UUID REFERENCES public.course_terms(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  previous_outstanding NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  scholarship_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  coupon_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- 16. Invoice Line Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Payment Transactions & Receipts Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  receipt_no TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT DEFAULT 'bank_transfer' CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque')),
  payment_type TEXT NOT NULL DEFAULT 'payment' CHECK (payment_type IN ('payment', 'refund')),
  reference_no TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);


-- ##############################################################################
-- SECTION 3: DATABASE VIEWS
-- ##############################################################################

-- The Single Source of Truth for Real-time Invoice Balances & Computed Status
CREATE OR REPLACE VIEW public.invoice_balances AS
SELECT 
  i.id AS invoice_id,
  i.grand_total,
  COALESCE(SUM(p.amount), 0)::NUMERIC(12,2) AS amount_paid,
  (i.grand_total - COALESCE(SUM(p.amount), 0))::NUMERIC(12,2) AS balance_due,
  CASE 
    WHEN i.status = 'draft' THEN 'draft'
    WHEN i.status = 'cancelled' THEN 'cancelled'
    WHEN (i.grand_total - COALESCE(SUM(p.amount), 0)) <= 0 THEN 'paid'
    WHEN COALESCE(SUM(p.amount), 0) > 0 
         AND (i.grand_total - COALESCE(SUM(p.amount), 0)) > 0 
         AND i.due_date >= CURRENT_DATE THEN 'partial'
    WHEN (i.grand_total - COALESCE(SUM(p.amount), 0)) > 0 
         AND i.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'sent'
  END AS computed_status
FROM public.invoices i
LEFT JOIN public.payments p ON p.invoice_id = i.id
GROUP BY i.id, i.grand_total, i.status, i.due_date;


-- ##############################################################################
-- SECTION 4: STORED PROCEDURES & TRIGGER FUNCTIONS
-- ##############################################################################

-- 1. Atomic Document Numbering Sequence Generator
CREATE OR REPLACE FUNCTION public.get_next_document_number(
  p_doc_type TEXT,
  p_fy_label TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_next_num INTEGER;
BEGIN
  -- Atomic Upsert with Row-Level Lock & Increment
  INSERT INTO public.numbering_sequences (doc_type, fy_label, last_number)
  VALUES (p_doc_type, p_fy_label, 1)
  ON CONFLICT (doc_type, fy_label)
  DO UPDATE SET last_number = numbering_sequences.last_number + 1
  RETURNING last_number INTO v_next_num;

  RETURN v_next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_next_document_number(TEXT, TEXT) TO authenticated, anon, service_role;

-- 2. Automatic Student Admission Number Formatter (AV-YYYY-XXXX)
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

-- 3. Automatic Auth User Sync Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Financial Audit Trail Trigger Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
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

-- Attach Audit Triggers to Financial Tables
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


-- ##############################################################################
-- SECTION 5: PERFORMANCE INDEXES
-- ##############################################################################

CREATE INDEX IF NOT EXISTS idx_students_admission_no ON public.students(admission_no);
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON public.students USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_phone ON public.students(phone);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON public.invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_enrollment_id ON public.invoices(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_course_term_id ON public.invoices(course_term_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON public.invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_dates ON public.invoices(invoice_date, due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_receipt_no ON public.payments(receipt_no);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_mode ON public.payments(payment_mode);

CREATE INDEX IF NOT EXISTS idx_quotations_quote_no ON public.quotations(quote_no);
CREATE INDEX IF NOT EXISTS idx_quotations_student_id ON public.quotations(student_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON public.quotations(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON public.quotation_items(quotation_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);

CREATE INDEX IF NOT EXISTS idx_salary_struct_faculty_date ON public.faculty_salary_structures(faculty_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_payslips_faculty_id ON public.payslips(faculty_id);
CREATE INDEX IF NOT EXISTS idx_payslips_faculty_month_year ON public.payslips(faculty_id, month, year);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);


-- ##############################################################################
-- SECTION 6: ROW LEVEL SECURITY (RLS) POLICIES
-- ##############################################################################

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.numbering_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Grant standard authenticated full CRUD policies
CREATE POLICY "Auth full access users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access company_settings" ON public.company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access numbering_sequences" ON public.numbering_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access courses" ON public.courses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access course_terms" ON public.course_terms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access fee_heads" ON public.fee_heads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access students" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access enrollments" ON public.enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access faculty" ON public.faculty FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access faculty_salary_structures" ON public.faculty_salary_structures FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access payslips" ON public.payslips FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access quotations" ON public.quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access quotation_items" ON public.quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access invoice_items" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ##############################################################################
-- SECTION 7: SEED & INITIAL DATA
-- ##############################################################################

INSERT INTO public.company_settings (
  name,
  address,
  phone,
  gstin,
  bank_name,
  bank_account_name,
  bank_account_number,
  bank_ifsc,
  terms_and_conditions_text
) VALUES (
  'Aviora Aviation Academy Pvt. Ltd.',
  'Hangar 4, International Flight Training Terminal, Bangalore Aerospace Park, Karnataka 562149',
  '+91 80 4912 8800',
  '29AABCA1234F1Z8',
  'HDFC Bank Ltd.',
  'Aviora Aviation Academy Private Limited',
  '50200088991122',
  'HDFC0001234',
  '1. All aviation flight training fees are subject to DGCA regulations.\n2. Invoices must be cleared before starting flight simulator & solo flight sorties.\n3. Late payments will attract an administrative fee of 2% per month.'
) ON CONFLICT DO NOTHING;


-- ##############################################################################
-- SECTION 8: PRIMARY APPLICATION & ANALYTICAL QUERIES
-- ##############################################################################

-- 1. Two-Step Query: Fetch Invoices + Merge with invoice_balances View
-- Step 1a:
SELECT 
  i.id,
  i.invoice_no,
  i.invoice_date,
  i.due_date,
  i.grand_total,
  i.status,
  s.name AS student_name,
  s.admission_no,
  c.name AS course_name,
  ct.term_label
FROM public.invoices i
LEFT JOIN public.students s ON s.id = i.student_id
LEFT JOIN public.enrollments e ON e.id = i.enrollment_id
LEFT JOIN public.courses c ON c.id = e.course_id
LEFT JOIN public.course_terms ct ON ct.id = i.course_term_id
ORDER BY i.created_at DESC
LIMIT 20;

-- Step 1b:
SELECT * FROM public.invoice_balances WHERE invoice_id IN ('<invoice_id_1>', '<invoice_id_2>');

-- 2. Dashboard KPI Summary Aggregations
SELECT 
  COALESCE(SUM(grand_total), 0) AS total_billed,
  COALESCE(SUM(amount_paid), 0) AS total_collected,
  COALESCE(SUM(balance_due), 0) AS total_outstanding
FROM public.invoice_balances;

-- 3. Settlement Status Breakdown
SELECT 
  computed_status,
  COUNT(*) AS invoice_count,
  SUM(grand_total) AS total_amount,
  SUM(balance_due) AS total_balance_due
FROM public.invoice_balances
GROUP BY computed_status;

-- 4. Course-wise Fee & Collection Performance
SELECT 
  COALESCE(c.name, 'Unassigned Track') AS course_name,
  SUM(ib.grand_total) AS total_billed,
  SUM(ib.amount_paid) AS total_collected,
  SUM(ib.balance_due) AS total_outstanding
FROM public.invoices i
LEFT JOIN public.enrollments e ON e.id = i.enrollment_id
LEFT JOIN public.courses c ON c.id = e.course_id
LEFT JOIN public.invoice_balances ib ON ib.invoice_id = i.id
WHERE i.status != 'cancelled'
GROUP BY c.name;

-- 5. Student Ledger Query for /students/[id]
SELECT 
  i.id AS invoice_id,
  i.invoice_no,
  i.invoice_date,
  i.grand_total,
  ib.amount_paid,
  ib.balance_due,
  ib.computed_status
FROM public.invoices i
JOIN public.invoice_balances ib ON ib.invoice_id = i.id
WHERE i.student_id = '<student_uuid>'
ORDER BY i.invoice_date ASC;

-- 6. Faculty Monthly Payroll Disbursement Query
SELECT 
  p.payslip_no,
  f.name AS faculty_name,
  f.designation,
  p.month,
  p.year,
  p.gross_pay,
  p.total_deductions,
  p.net_pay,
  p.generated_at
FROM public.payslips p
JOIN public.faculty f ON f.id = p.faculty_id
WHERE p.month = 8 AND p.year = 2026
ORDER BY f.name ASC;
