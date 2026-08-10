-- ==============================================================================
-- Phase 5: Quotations & Quotation Line Items
-- ==============================================================================

-- 1. Quotations Table
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no TEXT UNIQUE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  lead_name TEXT,
  lead_phone TEXT,
  lead_email TEXT,
  counselor_id UUID REFERENCES public.counselors(id) ON DELETE SET NULL,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired', 'converted')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  terms_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 2. Quotation Line Items Table
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for fast lookup & filtering
CREATE INDEX IF NOT EXISTS idx_quotations_quote_no ON public.quotations(quote_no);
CREATE INDEX IF NOT EXISTS idx_quotations_student_id ON public.quotations(student_id);
CREATE INDEX IF NOT EXISTS idx_quotations_counselor_id ON public.quotations(counselor_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_quote_date ON public.quotations(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON public.quotation_items(quotation_id);

-- 4. Enable Row-Level Security
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Permissive Authenticated Access)
CREATE POLICY "Authenticated users have full access to quotations"
  ON public.quotations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to quotation_items"
  ON public.quotation_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
