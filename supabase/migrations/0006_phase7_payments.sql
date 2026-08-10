-- ==============================================================================
-- Phase 7: Payments, Receipts, and Student Billing Ledger
-- ==============================================================================

-- 1. Add payment_type column for audit adjustments / refunds
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'payment' CHECK (payment_type IN ('payment', 'refund'));
  END IF;
END $$;

-- 2. Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_receipt_no ON public.payments(receipt_no);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_mode ON public.payments(payment_mode);
