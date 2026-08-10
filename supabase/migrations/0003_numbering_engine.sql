-- ==============================================================================
-- Phase 4: Atomic Numbering Engine
-- ==============================================================================

-- Create atomic sequence generator function
CREATE OR REPLACE FUNCTION public.get_next_document_number(
  p_doc_type TEXT,
  p_fy_label TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_next_num INTEGER;
BEGIN
  -- Atomic Upsert with Increment
  INSERT INTO public.numbering_sequences (doc_type, fy_label, last_number)
  VALUES (p_doc_type, p_fy_label, 1)
  ON CONFLICT (doc_type, fy_label)
  DO UPDATE SET last_number = numbering_sequences.last_number + 1
  RETURNING last_number INTO v_next_num;

  RETURN v_next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_next_document_number(TEXT, TEXT) TO authenticated, anon, service_role;
