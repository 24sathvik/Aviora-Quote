-- ==============================================================================
-- Phase 6: Invoices, Invoice Line Items, Payments Stub & Invoice Balances View
-- ==============================================================================

-- 1. Invoices Table
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 2. Invoice Line Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Payments Table (Schema Stub for Phase 7 Join & Balance Calculations)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  receipt_no TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT DEFAULT 'bank_transfer',
  reference_no TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 4. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON public.invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_enrollment_id ON public.invoices(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);

-- 5. The Authoritative invoice_balances View
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

-- 6. Enable Row-Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (Permissive Authenticated Access)
CREATE POLICY "Authenticated users have full access to invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to invoice_items"
  ON public.invoice_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to payments"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
