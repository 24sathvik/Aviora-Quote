'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { generateInvoiceNumber } from '@/lib/numbering/generate-number'
import { getFinancialYearLabel } from '@/lib/numbering/financial-year'
import { calculateInvoiceTotals } from '@/lib/invoices/calculations'
import { formatCurrency } from '@/lib/utils/currency'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  ArrowLeft,
  User,
  GraduationCap,
  Calendar,
  Sparkles,
  Loader2,
  Receipt,
  Info,
  Layers,
} from 'lucide-react'
import type {
  Student,
  Enrollment,
  Course,
  CourseTerm,
  FeeHead,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
} from '@/types/database'

function getInitialInvoiceDates() {
  const d = new Date()
  const today = d.toISOString().split('T')[0]
  const due = new Date(d.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return { today, due }
}

const DEFAULT_INVOICE_DATES = getInitialInvoiceDates()

interface InvoiceFormProps {
  initialInvoice?: Invoice | null
  prefillQuotationId?: string | null
}

interface FormInvoiceLineItem {
  id?: string
  description: string
  quantity: number
  unit_price: number
}

export function InvoiceForm({ initialInvoice, prefillQuotationId }: InvoiceFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const isEditing = !!initialInvoice

  // Form State
  const [studentId, setStudentId] = useState<string>(initialInvoice?.student_id || '')
  const [enrollmentId, setEnrollmentId] = useState<string>(initialInvoice?.enrollment_id || '')
  const [courseTermId, setCourseTermId] = useState<string>(initialInvoice?.course_term_id || '')
  const [quotationId] = useState<string | null>(
    initialInvoice?.quotation_id || prefillQuotationId || null
  )

  const [invoiceDate, setInvoiceDate] = useState(
    initialInvoice?.invoice_date || DEFAULT_INVOICE_DATES.today
  )
  const [dueDate, setDueDate] = useState(
    initialInvoice?.due_date || DEFAULT_INVOICE_DATES.due
  )

  // Line items state
  const [items, setItems] = useState<FormInvoiceLineItem[]>(
    initialInvoice?.invoice_items?.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
    })) || [
      {
        description: '',
        quantity: 1,
        unit_price: 0,
      },
    ]
  )

  // Financial adjustment fields
  const [discountAmount, setDiscountAmount] = useState<number>(
    Number(initialInvoice?.discount_amount) || 0
  )
  const [scholarshipAmount, setScholarshipAmount] = useState<number>(
    Number(initialInvoice?.scholarship_amount) || 0
  )
  const [couponAmount, setCouponAmount] = useState<number>(
    Number(initialInvoice?.coupon_amount) || 0
  )
  const [gstPercent, setGstPercent] = useState<number>(
    initialInvoice ? Number(initialInvoice.gst_percent) : 18
  )
  const [notes, setNotes] = useState(
    initialInvoice?.notes ||
      '1. Payment must reference the tax invoice number.\n2. Invoices overdue beyond 15 days may incur late fee adjustments.'
  )

  // 1. Fetch active students
  const { data: studentsList, isLoading: loadingStudents } = useQuery({
    queryKey: ['students-for-invoice'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, admission_no, phone, email')
        .order('name', { ascending: true })
      if (error) throw error
      return (data || []) as Student[]
    },
  })

  // 2. Fetch student's enrollments when a student is selected
  const { data: studentEnrollments } = useQuery({
    queryKey: ['student-enrollments-for-invoice', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          student_id,
          course_id,
          batch_year,
          current_term,
          courses (
            id,
            name,
            duration_terms,
            course_terms (
              id,
              term_no,
              term_label,
              term_fee,
              fee_heads (
                id,
                label,
                amount
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as Array<
        Enrollment & {
          courses: Course & {
            course_terms: Array<CourseTerm & { fee_heads: FeeHead[] }>
          }
        }
      >
    },
  })

  // 3. Auto-query previous outstanding balance for this student across other active invoices
  const { data: previousOutstanding = 0 } = useQuery({
    queryKey: ['student-previous-outstanding', studentId, initialInvoice?.id],
    enabled: !!studentId,
    queryFn: async () => {
      const { data: priorInvoices, error: invErr } = await supabase
        .from('invoices')
        .select('id')
        .eq('student_id', studentId)
        .neq('status', 'cancelled')

      if (invErr) throw invErr
      if (!priorInvoices || priorInvoices.length === 0) return 0

      let priorIds = priorInvoices.map((i) => i.id)
      if (initialInvoice?.id) {
        priorIds = priorIds.filter((id) => id !== initialInvoice.id)
      }

      if (priorIds.length === 0) return 0

      const { data: priorBalances, error: balErr } = await supabase
        .from('invoice_balances')
        .select('balance_due')
        .in('invoice_id', priorIds)

      if (balErr) throw balErr

      const totalOutstanding = (priorBalances || []).reduce((sum, b) => {
        return sum + Math.max(0, Number(b.balance_due) || 0)
      }, 0)

      return totalOutstanding
    },
  })

  // Selected enrollment and course term structures
  const selectedEnrollment = studentEnrollments?.find((e) => e.id === enrollmentId)
  const availableTerms = selectedEnrollment?.courses?.course_terms || []

  // When a course term is selected, pre-fill line items
  const handleTermSelection = (termId: string) => {
    setCourseTermId(termId)
    const currentEnr = studentEnrollments?.find((e) => e.id === (enrollmentId || studentEnrollments[0]?.id))
    const terms = currentEnr?.courses?.course_terms || availableTerms
    const selectedTerm = terms.find((t) => t.id === termId)
    if (!selectedTerm) return

    const courseName = currentEnr?.courses?.name || 'Program'

    if (selectedTerm.fee_heads && selectedTerm.fee_heads.length > 0) {
      // Use fee heads breakdown
      const newItems = selectedTerm.fee_heads.map((fh: any) => ({
        description: `${courseName} - ${selectedTerm.term_label}: ${fh.label || fh.name || 'Fee Head'}`,
        quantity: 1,
        unit_price: Number(fh.amount) || 0,
      }))
      setItems(newItems)
    } else {
      // Fallback to single term fee row
      setItems([
        {
          description: `${courseName} - ${selectedTerm.term_label} Tuition Fee`,
          quantity: 1,
          unit_price: Number(selectedTerm.term_fee) || 0,
        },
      ])
    }
  }

  // Auto-populate enrollment and term structure upon student selection if empty
  useEffect(() => {
    if (studentEnrollments && studentEnrollments.length > 0 && !isEditing) {
      const targetEnr = enrollmentId
        ? studentEnrollments.find((e) => e.id === enrollmentId) || studentEnrollments[0]
        : studentEnrollments[0]

      if (!enrollmentId) {
        setEnrollmentId(targetEnr.id)
      }

      const terms = targetEnr.courses?.course_terms || []
      if (terms.length > 0 && !courseTermId) {
        const targetTerm = terms.find((t) => t.term_no === targetEnr.current_term) || terms[0]
        handleTermSelection(targetTerm.id)
      }
    }
  }, [studentEnrollments])

  // Live real-time calculations
  const totals = calculateInvoiceTotals(
    items,
    previousOutstanding,
    discountAmount,
    scholarshipAmount,
    couponAmount,
    gstPercent
  )

  // Dynamic Line Item Handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateItem = (index: number, updates: Partial<FormInvoiceLineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    )
  }

  // Save Mutation (Authoritative Server-Side Calculation)
  const saveInvoiceMutation = useMutation({
    mutationFn: async (status: InvoiceStatus) => {
      if (!studentId) {
        throw new Error('Please select a student')
      }
      if (!dueDate) {
        throw new Error('Please select an invoice payment due date')
      }
      if (items.some((it) => !it.description.trim())) {
        throw new Error('All fee line items must have a description')
      }

      // 1. Authoritative recalculation
      const serverCalculated = calculateInvoiceTotals(
        items,
        previousOutstanding,
        discountAmount,
        scholarshipAmount,
        couponAmount,
        gstPercent
      )

      const fyLabel = getFinancialYearLabel(new Date(invoiceDate))
      let invoiceId = initialInvoice?.id
      let invoiceNo = initialInvoice?.invoice_no

      if (!isEditing) {
        // 2. Generate sequential invoice number via Phase 4 atomic engine
        invoiceNo = await generateInvoiceNumber(new Date(invoiceDate), supabase)

        const { data: newInvoice, error: insertError } = await supabase
          .from('invoices')
          .insert({
            invoice_no: invoiceNo,
            fy_label: fyLabel,
            student_id: studentId,
            enrollment_id: enrollmentId || null,
            course_term_id: courseTermId || null,
            quotation_id: quotationId || null,
            invoice_date: invoiceDate,
            due_date: dueDate,
            previous_outstanding: serverCalculated.previousOutstanding,
            subtotal: serverCalculated.subtotal,
            discount_amount: serverCalculated.discountAmount,
            scholarship_amount: serverCalculated.scholarshipAmount,
            coupon_amount: serverCalculated.couponAmount,
            gst_percent: serverCalculated.gstPercent,
            gst_amount: serverCalculated.gstAmount,
            grand_total: serverCalculated.grandTotal,
            status,
            notes: notes.trim() || null,
          })
          .select('id, invoice_no')
          .single()

        if (insertError) throw insertError
        invoiceId = newInvoice.id

        // If converted from a quotation, mark quotation as converted
        if (quotationId) {
          await supabase
            .from('quotations')
            .update({ status: 'converted' })
            .eq('id', quotationId)
        }
      } else {
        // Update existing invoice
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            student_id: studentId,
            enrollment_id: enrollmentId || null,
            course_term_id: courseTermId || null,
            invoice_date: invoiceDate,
            due_date: dueDate,
            previous_outstanding: serverCalculated.previousOutstanding,
            subtotal: serverCalculated.subtotal,
            discount_amount: serverCalculated.discountAmount,
            scholarship_amount: serverCalculated.scholarshipAmount,
            coupon_amount: serverCalculated.couponAmount,
            gst_percent: serverCalculated.gstPercent,
            gst_amount: serverCalculated.gstAmount,
            grand_total: serverCalculated.grandTotal,
            status: initialInvoice.status === 'draft' ? status : initialInvoice.status,
            notes: notes.trim() || null,
          })
          .eq('id', invoiceId)

        if (updateError) throw updateError

        // Delete old items before re-inserting
        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
      }

      // 3. Insert line items
      const lineItemInserts = serverCalculated.recalculatedItems.map((it) => ({
        invoice_id: invoiceId,
        description: it.description.trim(),
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.line_total,
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(lineItemInserts)

      if (itemsError) throw itemsError

      return { id: invoiceId, invoiceNo }
    },
    onError: (err: Error) => {
      toastError('Failed to save invoice', err.message)
    },
    onSuccess: (data) => {
      success(
        isEditing
          ? `Invoice ${data.invoiceNo} updated successfully`
          : `Invoice ${data.invoiceNo} generated successfully`
      )
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', data.id] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      router.push(`/invoices/${data.id}`)
    },
  })

  if (loadingStudents) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 text-gray-400 hover:text-navy-700 hover:bg-white rounded-lg border border-gray-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Fee Management / Invoices
              </span>
              {quotationId && (
                <span className="text-2xs bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200">
                  Converted from Quotation
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
              {isEditing
                ? `Edit Tax Invoice (${initialInvoice.invoice_no})`
                : 'Create Tax Invoice'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => saveInvoiceMutation.mutate('draft')}
            disabled={saveInvoiceMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saveInvoiceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => saveInvoiceMutation.mutate('sent')}
            disabled={saveInvoiceMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saveInvoiceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save & Issue Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Student & Enrollment Term Selection */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
              <User className="w-4 h-4 text-navy-700" />
              Student & Academic Term Allocation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Enrolled Student *
                </label>
                <select
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value)
                    setEnrollmentId('')
                    setCourseTermId('')
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                >
                  <option value="">-- Choose a student --</option>
                  {studentsList?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admission_no}) — {s.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Course Enrollment Track
                </label>
                <select
                  disabled={!studentId || !studentEnrollments || studentEnrollments.length === 0}
                  value={enrollmentId}
                  onChange={(e) => {
                    setEnrollmentId(e.target.value)
                    setCourseTermId('')
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent disabled:bg-gray-100"
                >
                  <option value="">-- Choose academic program --</option>
                  {studentEnrollments?.map((enr) => (
                    <option key={enr.id} value={enr.id}>
                      {enr.courses?.name} (Batch {enr.batch_year} - Term {enr.current_term})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Billing Term Structure *
                </label>
                <select
                  disabled={!enrollmentId || availableTerms.length === 0}
                  value={courseTermId}
                  onChange={(e) => handleTermSelection(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent disabled:bg-gray-100"
                >
                  <option value="">-- Select term to bill --</option>
                  {availableTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.term_label} ({formatCurrency(t.term_fee)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Previous Outstanding (Auto-pulled)
                </label>
                <div className="w-full rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm font-mono font-bold text-amber-900 flex items-center justify-between">
                  <span>{formatCurrency(previousOutstanding)}</span>
                  <span className="text-2xs font-normal text-amber-700">From Ledger</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Itemized Fee Heads & Services */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-navy-700" />
                  Itemized Fee Heads & Tuition Charges
                </h3>
                <span className="text-2xs text-gray-400">
                  Pre-filled from course fee structure and fully customizable per student
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Fee Head
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const lineTotal = Math.max(
                  0,
                  (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
                )

                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                  >
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-12 sm:col-span-6">
                        <label className="block text-2xs font-medium text-gray-600 mb-1">
                          Description / Fee Component *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Flight Simulator & Ground Training Fee"
                          value={item.description}
                          onChange={(e) =>
                            handleUpdateItem(index, { description: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent bg-white"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-2xs font-medium text-gray-600 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          required
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              quantity: Math.max(1, parseInt(e.target.value) || 1),
                            })
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent bg-white"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-3">
                        <label className="block text-2xs font-medium text-gray-600 mb-1">
                          Amount (₹)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          required
                          value={item.unit_price}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              unit_price: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent bg-white"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-1 flex items-center justify-end pb-1">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer disabled:opacity-30"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Card 3: Notes and Payment Terms */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-navy-700" />
              Invoice Notes & Remittance Guidelines
            </h3>
            <textarea
              rows={4}
              placeholder="Enter invoice notes and payment instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3 text-xs shadow-xs focus:ring-accent focus:border-accent"
            />
          </div>
        </div>

        {/* Right Sidebar: Live Real-Time Calculated Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-6 sticky top-24">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Sparkles className="w-4 h-4 text-navy-800" />
              <h3 className="text-sm font-bold text-gray-900">Tax Invoice Summary</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Gross Term Subtotal</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>

              {previousOutstanding > 0 && (
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>Previous Outstanding</span>
                  <span>+ {formatCurrency(previousOutstanding)}</span>
                </div>
              )}

              {/* Deductions Inputs */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div>
                  <label className="block text-2xs font-medium text-gray-600 mb-1">
                    Early Bird / General Discount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={discountAmount}
                    onChange={(e) =>
                      setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-medium text-gray-600 mb-1">
                    Merit Scholarship (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={scholarshipAmount}
                    onChange={(e) =>
                      setScholarshipAmount(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-medium text-gray-600 mb-1">
                    Promotional Coupon (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={couponAmount}
                    onChange={(e) =>
                      setCouponAmount(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>

              {/* GST Percent Input */}
              <div className="space-y-1 pt-2 border-t border-gray-100">
                <label className="block text-2xs font-medium text-gray-600">
                  Applicable GST Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={gstPercent}
                  onChange={(e) =>
                    setGstPercent(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div className="flex justify-between text-gray-600 pt-1">
                <span>GST Tax Value ({totals.gstPercent}%)</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(totals.gstAmount)}
                </span>
              </div>

              {/* Net Grand Total */}
              <div className="p-4 rounded-xl bg-navy-50/70 border border-navy-100 flex items-center justify-between text-navy-950">
                <span className="text-xs font-bold uppercase tracking-wider">Grand Total</span>
                <span className="text-xl font-extrabold text-navy-900">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => saveInvoiceMutation.mutate('sent')}
                disabled={saveInvoiceMutation.isPending}
                className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saveInvoiceMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {isEditing ? 'Update & Save' : 'Generate & Issue Invoice'}
              </button>

              <button
                type="button"
                onClick={() => saveInvoiceMutation.mutate('draft')}
                disabled={saveInvoiceMutation.isPending}
                className="w-full py-2 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Save as Working Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
