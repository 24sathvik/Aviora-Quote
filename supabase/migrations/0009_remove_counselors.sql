-- ==============================================================================
-- Phase 12.1: Remove Counselors Feature Completely
-- ==============================================================================

-- 1. Drop foreign key and column from quotations
ALTER TABLE public.quotations DROP COLUMN IF EXISTS counselor_id CASCADE;

-- 2. Drop counselors table completely
DROP TABLE IF EXISTS public.counselors CASCADE;
