-- ============================================================================
-- AVIORA Finance & Fee Management System
-- Migration: 0012_fix_cancel_invoice_ambiguity.sql
-- Description: Historical record of narrow database fix applied directly in Phase D
-- Fixes PL/pgSQL variable reference ambiguity in public.cancel_invoice(uuid, text)
--
-- PROBLEM:
-- The function returns TABLE(invoice_id uuid, status text).
-- In the body: IF EXISTS (SELECT 1 FROM public.payments WHERE invoice_id = p_invoice_id)
-- PostgreSQL treats the unqualified column 'invoice_id' as ambiguous because it matches
-- both the public.payments.invoice_id column and the output variable invoice_id (ERROR 42702).
--
-- FIX:
-- Explicitly qualify the column reference as 'payments.invoice_id = p_invoice_id'.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_invoice(p_invoice_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(invoice_id uuid, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_invoice RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_invoice.status = 'cancelled' THEN RAISE EXCEPTION 'Invoice is already cancelled'; END IF;

  IF EXISTS (SELECT 1 FROM public.payments WHERE payments.invoice_id = p_invoice_id) THEN
    RAISE EXCEPTION 'Cannot cancel an invoice that already has payments recorded against it';
  END IF;

  UPDATE public.invoices
  SET status = 'cancelled',
      notes = COALESCE(notes || E'\n', '') || 'Cancelled: ' || COALESCE(p_reason, 'No reason given')
  WHERE id = p_invoice_id;

  RETURN QUERY SELECT p_invoice_id, 'cancelled'::TEXT;
END;
$function$;
