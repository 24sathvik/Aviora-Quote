/**
 * AVIORA Finance & Fee Management System
 * Authoritative Financial RPC Client Layer
 *
 * CRITICAL ARCHITECTURAL CONVENTION — NO OPTIMISTIC UI FOR FINANCIAL MUTATIONS:
 * Financial operations (invoices, payments, quotation conversion, payroll, cancellation)
 * MUST NOT use optimistic UI updates. When a financial mutation is triggered, the UI
 * must display a loading/disabled state until the database RPC confirms execution.
 * The UI state must then update strictly from the authoritative result returned by the RPC.
 *
 * Non-financial actions (navigation, filters, opening modals) can remain optimistic/instant.
 *
 * ERROR PROPAGATION RULE:
 * Postgres RAISE EXCEPTION messages are human-readable and authoritative. All RPC wrappers
 * must unwrap and re-throw the exact error message from Supabase/PostgreSQL without masking
 * or replacing it with generic messages.
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// 1. CREATE INVOICE
// ============================================================================

export interface CreateInvoiceItem {
  description: string
  quantity: number
  unit_price: number
}

export interface CreateInvoiceParams {
  studentId: string
  enrollmentId?: string | null
  courseTermId?: string | null
  quotationId?: string | null
  invoiceDate: string // YYYY-MM-DD
  dueDate: string // YYYY-MM-DD
  items: CreateInvoiceItem[]
  discountAmount?: number
  scholarshipAmount?: number
  couponAmount?: number
  gstPercent?: number
  notes?: string | null
  saveAsDraft?: boolean
  idempotencyKey?: string | null
  manualInvoiceNo?: string | null
}

export interface CreateInvoiceResult {
  invoice_id: string
  invoice_no: string
  subtotal: number
  previous_outstanding: number
  gst_amount: number
  grand_total: number
  status: string
}

/**
 * Calls the `create_invoice` database RPC.
 * Direct writes to invoices / invoice_items are blocked at the DB level.
 */
export async function createInvoice(
  params: CreateInvoiceParams,
  client?: SupabaseClient
): Promise<CreateInvoiceResult> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase.rpc('create_invoice', {
    p_student_id: params.studentId,
    p_enrollment_id: params.enrollmentId ?? null,
    p_course_term_id: params.courseTermId ?? null,
    p_quotation_id: params.quotationId ?? null,
    p_invoice_date: params.invoiceDate,
    p_due_date: params.dueDate,
    p_items: params.items,
    p_discount_amount: params.discountAmount ?? 0,
    p_scholarship_amount: params.scholarshipAmount ?? 0,
    p_coupon_amount: params.couponAmount ?? 0,
    p_gst_percent: params.gstPercent ?? 18,
    p_notes: params.notes ?? null,
    p_save_as_draft: params.saveAsDraft ?? false,
    p_idempotency_key: params.idempotencyKey ?? null,
    p_manual_invoice_no: params.manualInvoiceNo ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  // Supabase returns TABLE results as an array of records
  const result = Array.isArray(data) ? data[0] : data
  if (!result) {
    throw new Error('Invoice creation succeeded but no record was returned.')
  }

  return {
    invoice_id: result.invoice_id,
    invoice_no: result.invoice_no,
    subtotal: Number(result.subtotal),
    previous_outstanding: Number(result.previous_outstanding),
    gst_amount: Number(result.gst_amount),
    grand_total: Number(result.grand_total),
    status: result.status,
  }
}

// ============================================================================
// 2. RECORD PAYMENT
// ============================================================================

export interface RecordPaymentParams {
  invoiceId: string
  amount: number
  paymentDate: string // YYYY-MM-DD
  paymentMode: string // cash | upi | card | bank_transfer | cheque
  referenceNo?: string | null
  notes?: string | null
  idempotencyKey?: string | null
}

export interface RecordPaymentResult {
  payment_id: string
  receipt_no: string
  amount_paid: number
  balance_due: number
  computed_status: string
}

/**
 * Calls the `record_payment` database RPC.
 * Direct writes to payments are blocked at the DB level.
 */
export async function recordPayment(
  params: RecordPaymentParams,
  client?: SupabaseClient
): Promise<RecordPaymentResult> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase.rpc('record_payment', {
    p_invoice_id: params.invoiceId,
    p_amount: params.amount,
    p_payment_date: params.paymentDate,
    p_payment_mode: params.paymentMode,
    p_reference_no: params.referenceNo ?? null,
    p_notes: params.notes ?? null,
    p_idempotency_key: params.idempotencyKey ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) {
    throw new Error('Payment recording succeeded but no record was returned.')
  }

  return {
    payment_id: result.payment_id,
    receipt_no: result.receipt_no,
    amount_paid: Number(result.amount_paid),
    balance_due: Number(result.balance_due),
    computed_status: result.computed_status,
  }
}

// ============================================================================
// 3. CONVERT QUOTATION TO INVOICE
// ============================================================================

export interface ConvertQuotationParams {
  quotationId: string
  enrollmentId?: string | null
  courseTermId?: string | null
  dueDate: string // YYYY-MM-DD
  idempotencyKey?: string | null
}

export interface ConvertQuotationResult {
  invoice_id: string
  invoice_no: string
  grand_total: number
  status: string
}

/**
 * Calls the `convert_quotation_to_invoice` database RPC.
 */
export async function convertQuotationToInvoice(
  params: ConvertQuotationParams,
  client?: SupabaseClient
): Promise<ConvertQuotationResult> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase.rpc('convert_quotation_to_invoice', {
    p_quotation_id: params.quotationId,
    p_enrollment_id: params.enrollmentId ?? null,
    p_course_term_id: params.courseTermId ?? null,
    p_due_date: params.dueDate,
    p_idempotency_key: params.idempotencyKey ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) {
    throw new Error('Quotation conversion succeeded but no record was returned.')
  }

  return {
    invoice_id: result.invoice_id,
    invoice_no: result.invoice_no,
    grand_total: Number(result.grand_total),
    status: result.status,
  }
}

// ============================================================================
// 4. GENERATE PAYSLIP
// ============================================================================

export interface GeneratePayslipParams {
  facultyId: string
  month: number // 1 - 12
  year: number // e.g. 2026
  idempotencyKey?: string | null
}

export interface GeneratePayslipResult {
  payslip_id: string
  payslip_no: string
  gross_pay: number
  total_deductions: number
  net_pay: number
}

/**
 * Calls the `generate_payslip` database RPC.
 * Direct writes to payslips are blocked at the DB level.
 */
export async function generatePayslip(
  params: GeneratePayslipParams,
  client?: SupabaseClient
): Promise<GeneratePayslipResult> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase.rpc('generate_payslip', {
    p_faculty_id: params.facultyId,
    p_month: params.month,
    p_year: params.year,
    p_idempotency_key: params.idempotencyKey ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) {
    throw new Error('Payslip generation succeeded but no record was returned.')
  }

  return {
    payslip_id: result.payslip_id,
    payslip_no: result.payslip_no,
    gross_pay: Number(result.gross_pay),
    total_deductions: Number(result.total_deductions),
    net_pay: Number(result.net_pay),
  }
}

// ============================================================================
// 5. CANCEL INVOICE
// ============================================================================

export interface CancelInvoiceParams {
  invoiceId: string
  reason?: string | null
}

export interface CancelInvoiceResult {
  invoice_id: string
  status: string
}

/**
 * Calls the `cancel_invoice` database RPC.
 * Note: cancel_invoice does NOT have an idempotency key parameter in the DB design.
 */
export async function cancelInvoice(
  params: CancelInvoiceParams,
  client?: SupabaseClient
): Promise<CancelInvoiceResult> {
  const supabase = client ?? createClient()

  const { data, error } = await supabase.rpc('cancel_invoice', {
    p_invoice_id: params.invoiceId,
    p_reason: params.reason ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) {
    throw new Error('Invoice cancellation succeeded but no record was returned.')
  }

  return {
    invoice_id: result.invoice_id,
    status: result.status,
  }
}
