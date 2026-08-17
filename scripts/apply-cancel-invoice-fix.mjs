import { Client } from 'pg'

const connectionString = 'postgresql://postgres.yrncaebimjmwhqltroqi:NGF4pXvZ8NxnpMft@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

const correctedFunctionSQL = `
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
`

async function applyFix() {
  const client = new Client({ connectionString })

  try {
    await client.connect()
    console.log('Applying minimal cancel_invoice ambiguity fix to live database...')

    await client.query(correctedFunctionSQL)
    console.log('✅ Replacement SQL executed successfully!')

    // Verify replacement definition
    const res = await client.query(`
      SELECT pg_get_functiondef(p.oid) as func_def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'cancel_invoice'
    `)

    console.log('\n=== VERIFIED LIVE DEFINITION OF public.cancel_invoice ===\n')
    console.log(res.rows[0].func_def)
    console.log('\n============================================================')
  } catch (err) {
    console.error('Error applying fix:', err.message)
  } finally {
    await client.end()
  }
}

applyFix()
