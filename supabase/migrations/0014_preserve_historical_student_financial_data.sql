-- ==============================================================================
-- Migration 0014: Preserve Historical Student Details on Invoices & Payments
-- Allows student profiles to be deleted from active directory without destroying
-- historical financial ledgers, audit trails, reports, or downloadable PDFs.
-- ==============================================================================

-- 1. Add historical snapshot columns to `invoices`
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_admission_no TEXT,
  ADD COLUMN IF NOT EXISTS student_phone TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS course_name TEXT;

-- 2. Add historical snapshot columns to `payments`
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_admission_no TEXT;

-- 3. Backfill existing `invoices` snapshot fields from current `students` and `courses`
UPDATE public.invoices i
SET 
  student_name = s.name,
  student_admission_no = s.admission_no,
  student_phone = s.phone,
  student_email = s.email
FROM public.students s
WHERE i.student_id = s.id AND (i.student_name IS NULL OR i.student_name = '');

UPDATE public.invoices i
SET course_name = c.name
FROM public.enrollments e
JOIN public.courses c ON c.id = e.course_id
WHERE i.enrollment_id = e.id AND (i.course_name IS NULL OR i.course_name = '');

-- 4. Backfill existing `payments` snapshot fields from current `students`
UPDATE public.payments p
SET 
  student_name = s.name,
  student_admission_no = s.admission_no
FROM public.students s
WHERE p.student_id = s.id AND (p.student_name IS NULL OR p.student_name = '');

-- 5. Update `create_invoice` RPC to populate snapshot columns on insert
CREATE OR REPLACE FUNCTION public.create_invoice(
  p_student_id uuid,
  p_enrollment_id uuid,
  p_course_term_id uuid,
  p_quotation_id uuid,
  p_invoice_date date,
  p_due_date date,
  p_items jsonb,
  p_discount_amount numeric DEFAULT 0,
  p_scholarship_amount numeric DEFAULT 0,
  p_coupon_amount numeric DEFAULT 0,
  p_gst_percent numeric DEFAULT 18,
  p_notes text DEFAULT NULL::text,
  p_save_as_draft boolean DEFAULT false,
  p_idempotency_key uuid DEFAULT NULL::uuid,
  p_manual_invoice_no text DEFAULT NULL::text
)
RETURNS TABLE(
  invoice_id uuid,
  invoice_no text,
  subtotal numeric,
  previous_outstanding numeric,
  gst_amount numeric,
  grand_total numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_subtotal NUMERIC(12,2) := 0;
  v_taxable NUMERIC(12,2);
  v_gst_amount NUMERIC(12,2);
  v_previous_outstanding NUMERIC(12,2);
  v_grand_total NUMERIC(12,2);
  v_fy_label TEXT;
  v_seq INTEGER;
  v_invoice_no TEXT;
  v_new_invoice_id UUID;
  v_status TEXT;
  v_item JSONB;
  v_reserved BOOLEAN := false;
  v_cached JSONB;
  v_parsed_num INTEGER;

  -- Historical Snapshot Variables
  v_student_name TEXT;
  v_student_admission_no TEXT;
  v_student_phone TEXT;
  v_student_email TEXT;
  v_course_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.idempotency_keys (operation, idempotency_key, result)
    VALUES ('create_invoice', p_idempotency_key, NULL)
    ON CONFLICT (operation, idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_reserved = ROW_COUNT;
    IF NOT v_reserved THEN
      SELECT result INTO v_cached FROM public.idempotency_keys
        WHERE operation = 'create_invoice' AND idempotency_key = p_idempotency_key;
      IF v_cached IS NULL THEN
        RAISE EXCEPTION 'A duplicate request is already in progress — please wait and retry';
      END IF;
      RETURN QUERY SELECT (v_cached->>'invoice_id')::UUID, v_cached->>'invoice_no',
        (v_cached->>'subtotal')::NUMERIC, (v_cached->>'previous_outstanding')::NUMERIC,
        (v_cached->>'gst_amount')::NUMERIC, (v_cached->>'grand_total')::NUMERIC, v_cached->>'status';
      RETURN;
    END IF;
  END IF;

  -- Fetch & Verify Student Snapshot
  SELECT name, admission_no, phone, email
  INTO v_student_name, v_student_admission_no, v_student_phone, v_student_email
  FROM public.students WHERE id = p_student_id;

  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Invalid student';
  END IF;

  -- Fetch Course Snapshot via Enrollment
  IF p_enrollment_id IS NOT NULL THEN
    SELECT c.name INTO v_course_name
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = p_enrollment_id AND e.student_id = p_student_id;

    IF v_course_name IS NULL THEN
      RAISE EXCEPTION 'The selected enrollment does not belong to this student';
    END IF;
  END IF;

  IF p_course_term_id IS NOT NULL AND p_enrollment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.course_terms ct
    JOIN public.enrollments e ON e.course_id = ct.course_id
    WHERE ct.id = p_course_term_id AND e.id = p_enrollment_id
  ) THEN
    RAISE EXCEPTION 'The selected term does not belong to this enrollment''s course';
  END IF;

  IF p_quotation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.quotations WHERE id = p_quotation_id AND student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'The referenced quotation does not belong to this student';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'An invoice must have at least one line item';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF (v_item->>'quantity')::NUMERIC <= 0 THEN
      RAISE EXCEPTION 'Line item quantity must be greater than zero: %', v_item->>'description';
    END IF;
    IF (v_item->>'unit_price')::NUMERIC < 0 THEN
      RAISE EXCEPTION 'Line item unit price cannot be negative: %', v_item->>'description';
    END IF;
    IF COALESCE(TRIM(v_item->>'description'), '') = '' THEN
      RAISE EXCEPTION 'Every line item needs a description';
    END IF;
    v_subtotal := v_subtotal + ((v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC);
  END LOOP;

  IF p_discount_amount < 0 OR p_scholarship_amount < 0 OR p_coupon_amount < 0 THEN
    RAISE EXCEPTION 'Discount, scholarship, and coupon amounts cannot be negative';
  END IF;

  IF (p_discount_amount + p_scholarship_amount + p_coupon_amount) > v_subtotal THEN
    RAISE EXCEPTION 'Total deductions (%) cannot exceed the subtotal (%)',
      (p_discount_amount + p_scholarship_amount + p_coupon_amount), v_subtotal;
  END IF;

  IF p_gst_percent < 0 OR p_gst_percent > 100 THEN
    RAISE EXCEPTION 'GST percent must be between 0 and 100';
  END IF;

  v_taxable := v_subtotal - p_discount_amount - p_scholarship_amount - p_coupon_amount;
  v_gst_amount := ROUND(v_taxable * p_gst_percent / 100, 2);

  SELECT COALESCE(SUM(ib.balance_due), 0) INTO v_previous_outstanding
  FROM public.invoice_balances ib
  JOIN public.invoices i ON i.id = ib.invoice_id
  WHERE i.student_id = p_student_id AND i.status NOT IN ('cancelled', 'draft');

  v_grand_total := v_taxable + v_gst_amount;
  v_fy_label := public.fy_label_for_date(p_invoice_date);

  -- Determine Invoice Number (Manual Override vs Auto-generate)
  IF p_manual_invoice_no IS NOT NULL AND TRIM(p_manual_invoice_no) <> '' THEN
    v_invoice_no := TRIM(p_manual_invoice_no);
    
    IF v_invoice_no ~ '^[0-9]+$' THEN
      v_invoice_no := 'AV/INV/' || v_fy_label || '/' || LPAD(v_invoice_no, 5, '0');
    END IF;

    IF EXISTS (SELECT 1 FROM public.invoices WHERE invoices.invoice_no = v_invoice_no) THEN
      RAISE EXCEPTION 'Invoice number % is already in use', v_invoice_no;
    END IF;

    IF v_invoice_no ~ '[0-9]+' THEN
      v_parsed_num := (regexp_match(v_invoice_no, '([0-9]+)\s*$'))[1]::INTEGER;
      IF v_parsed_num IS NOT NULL THEN
        PERFORM public.resync_numbering_sequence('invoice', v_fy_label, v_parsed_num);
      END IF;
    END IF;
  ELSE
    v_seq := public.get_next_document_number('invoice', v_fy_label);
    v_invoice_no := 'AV/INV/' || v_fy_label || '/' || LPAD(v_seq::TEXT, 5, '0');
  END IF;

  v_status := CASE WHEN p_save_as_draft THEN 'draft' ELSE 'sent' END;

  INSERT INTO public.invoices (
    invoice_no, fy_label, student_id, enrollment_id, course_term_id, quotation_id,
    invoice_date, due_date, previous_outstanding, subtotal, discount_amount,
    scholarship_amount, coupon_amount, gst_percent, gst_amount, grand_total,
    status, notes, created_by,
    student_name, student_admission_no, student_phone, student_email, course_name
  ) VALUES (
    v_invoice_no, v_fy_label, p_student_id, p_enrollment_id, p_course_term_id, p_quotation_id,
    p_invoice_date, p_due_date, v_previous_outstanding, v_subtotal, p_discount_amount,
    p_scholarship_amount, p_coupon_amount, p_gst_percent, v_gst_amount, v_grand_total,
    v_status, p_notes, auth.uid(),
    v_student_name, v_student_admission_no, v_student_phone, v_student_email, v_course_name
  ) RETURNING id INTO v_new_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, line_total)
    VALUES (v_new_invoice_id, v_item->>'description', (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC, (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC);
  END LOOP;

  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.idempotency_keys SET result = jsonb_build_object(
      'invoice_id', v_new_invoice_id, 'invoice_no', v_invoice_no, 'subtotal', v_subtotal,
      'previous_outstanding', v_previous_outstanding, 'gst_amount', v_gst_amount,
      'grand_total', v_grand_total, 'status', v_status
    ) WHERE operation = 'create_invoice' AND idempotency_key = p_idempotency_key;
  END IF;

  RETURN QUERY SELECT v_new_invoice_id, v_invoice_no, v_subtotal, v_previous_outstanding,
                      v_gst_amount, v_grand_total, v_status;
END;
$function$;
