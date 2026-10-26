'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  createCompanyInvoice,
  updateCompanyInvoice,
  type CreateCompanyInvoiceItemInput,
} from '@/lib/company-invoices/actions'
import { queryKeys } from '@/lib/query-keys'
import {
  CURRENCY_CONFIG,
  formatCurrencyWithSymbol,
  getCurrencySymbol,
  type SupportedCurrency,
} from '@/lib/utils/currency'
import { useToast } from '@/components/ui/Toast'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import {
  CompanyDetailsPanel,
  CompanyDetailsChangePayload,
  saveCompanySettings,
} from '@/components/shared/CompanyDetailsPanel'
import {
  Building2,
  Phone,
  MapPin,
  FileText,
  Hash,
  Calendar,
  Plus,
  Trash2,
  DollarSign,
  Layers,
  ArrowLeft,
  Loader2,
  Percent,
  CheckCircle2,
  Globe2,
  Receipt,
  Info,
  Sparkles,
} from 'lucide-react'
import type { CompanyInvoice, CompanyInvoiceStatus } from '@/types/database'

function getInitialInvoiceDates() {
  const d = new Date()
  const today = d.toISOString().split('T')[0]
  const due = new Date(d.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return { today, due }
}

const DEFAULT_INVOICE_DATES = getInitialInvoiceDates()
const CURRENCIES: SupportedCurrency[] = ['INR', 'USD', 'NZD', 'PHP']

interface CompanyInvoiceFormProps {
  initialInvoice?: CompanyInvoice | null
}

export function CompanyInvoiceForm({ initialInvoice }: CompanyInvoiceFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const isEditing = !!initialInvoice

  const [formError, setFormError] = useState<string | null>(null)

  // Company Details
  const [companyName, setCompanyName] = useState(initialInvoice?.company_name || '')
  const [companyPhone, setCompanyPhone] = useState(initialInvoice?.company_phone || '')
  const [companyAddress, setCompanyAddress] = useState(initialInvoice?.company_address || '')
  const [companyGstin, setCompanyGstin] = useState(initialInvoice?.company_gstin || '')
  const [companyCin, setCompanyCin] = useState(initialInvoice?.company_cin || '')

  // Invoice Meta
  const [currency, setCurrency] = useState<SupportedCurrency>(initialInvoice?.currency || 'INR')
  const [invoiceDate, setInvoiceDate] = useState(initialInvoice?.invoice_date || DEFAULT_INVOICE_DATES.today)
  const [dueDate, setDueDate] = useState(initialInvoice?.due_date || DEFAULT_INVOICE_DATES.due)
  const [manualInvoiceNo, setManualInvoiceNo] = useState('')

  // Line items (Student Name / Description, Fee / Amount)
  const [items, setItems] = useState<CreateCompanyInvoiceItemInput[]>(
    initialInvoice?.company_invoice_items && initialInvoice.company_invoice_items.length > 0
      ? initialInvoice.company_invoice_items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
        }))
      : [
          {
            description: '',
            quantity: 1,
            unit_price: 0,
          },
        ]
  )

  // Adjustments & GST (GST is Optional)
  const [discountAmount, setDiscountAmount] = useState<number>(
    Number(initialInvoice?.discount_amount) || 0
  )
  const [applyGst, setApplyGst] = useState<boolean>(
    initialInvoice ? Number(initialInvoice.gst_percent) > 0 : false
  )
  const [gstPercent, setGstPercent] = useState<number>(
    initialInvoice && Number(initialInvoice.gst_percent) > 0 ? Number(initialInvoice.gst_percent) : 18
  )
  const [notes, setNotes] = useState(
    initialInvoice?.notes ||
      '1. Payment must reference this company invoice number.\n2. Invoices overdue beyond 15 days may incur finance service fees.\n3. Bank account remittance details provided below.'
  )

  const [companyDetails, setCompanyDetails] = useState<CompanyDetailsChangePayload | null>(null)

  // Real-time calculations
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    return sum + qty * price
  }, 0)

  const sanitizedDiscount = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0))
  const taxableAmount = Math.max(0, subtotal - sanitizedDiscount)
  const calculatedGst = applyGst ? (taxableAmount * (Number(gstPercent) || 0)) / 100 : 0
  const grandTotal = taxableAmount + calculatedGst

  const currentCurrencySymbol = getCurrencySymbol(currency)

  // Line Item Handlers
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

  const handleUpdateItem = (
    index: number,
    field: keyof CreateCompanyInvoiceItemInput,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return {
          ...item,
          [field]: field === 'description' ? value : Number(value) || 0,
        }
      })
    )
  }

  // Mutation to Create or Update
  const saveMutation = useMutation({
    mutationFn: async (saveAsDraft: boolean) => {
      setFormError(null)

      if (!companyName.trim()) {
        throw new Error('Please enter the recipient Company Name')
      }
      if (!companyPhone.trim()) {
        throw new Error('Please enter the company Mobile / Phone Number')
      }
      if (!dueDate) {
        throw new Error('Please enter the payment due date')
      }
      if (items.length === 0 || items.some((it) => !it.description.trim())) {
        throw new Error('Please provide a valid Student Name / Description for all fee items')
      }
      if (items.some((it) => (Number(it.quantity) || 0) <= 0)) {
        throw new Error('All item quantities must be greater than zero')
      }
      if (items.some((it) => (Number(it.unit_price) || 0) < 0)) {
        throw new Error('Item Fee / Amount cannot be negative')
      }

      // Save updated company & document settings if modified by user
      if (companyDetails?.isDirty) {
        try {
          await saveCompanySettings(supabase, companyDetails.values)
        } catch (csErr: any) {
          console.warn('Company settings update warning:', csErr?.message || csErr)
          toastError(
            'Settings Save Notice',
            'Invoice will be generated, but company default settings could not be updated.'
          )
        }
      }

      if (isEditing && initialInvoice) {
        return await updateCompanyInvoice({
          id: initialInvoice.id,
          companyName,
          companyPhone,
          companyAddress,
          companyGstin,
          companyCin,
          currency,
          invoiceDate,
          dueDate,
          items,
          discountAmount: sanitizedDiscount,
          applyGst,
          gstPercent: applyGst ? Number(gstPercent) || 18 : 0,
          notes,
          saveAsDraft,
          manualInvoiceNo: manualInvoiceNo.trim() || null,
        })
      } else {
        return await createCompanyInvoice({
          companyName,
          companyPhone,
          companyAddress,
          companyGstin,
          companyCin,
          currency,
          invoiceDate,
          dueDate,
          items,
          discountAmount: sanitizedDiscount,
          applyGst,
          gstPercent: applyGst ? Number(gstPercent) || 18 : 0,
          notes,
          saveAsDraft,
          manualInvoiceNo: manualInvoiceNo.trim() || null,
        })
      }
    },
    onError: (err: Error) => {
      setFormError(err.message)
      toastError(
        isEditing ? 'Invoice Update Failed' : 'Company Invoice Creation Failed',
        err.message
      )
    },
    onSuccess: async (result) => {
      success(
        isEditing
          ? `Company Invoice ${result.invoice_no} updated successfully`
          : result.status === 'draft'
          ? `Draft Company Invoice ${result.invoice_no} saved successfully`
          : `Company Invoice ${result.invoice_no} issued successfully`
      )
      await queryClient.invalidateQueries({ queryKey: queryKeys.companyInvoices.all })
      router.push(`/invoices/company/${result.invoice_id}`)
    },
  })

  return (
    <div className="space-y-8">
      {/* Top Header - Exact match with Student Invoice layout */}
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
                Corporate Billing / Company Invoices
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
              {isEditing
                ? `Edit Company Invoice (${initialInvoice.invoice_no})`
                : 'Create Company Invoice'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => saveMutation.mutate(true)}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => saveMutation.mutate(false)}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update & Save' : 'Save & Issue Invoice'}
          </button>
        </div>
      </div>

      {/* Error Banner for Unmasked Exceptions */}
      {formError && (
        <ErrorBanner
          error={formError}
          title={isEditing ? 'Unable to Update Invoice' : 'Unable to Create Company Invoice'}
          onDismiss={() => setFormError(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Recipient Company & Invoice Allocation */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
              <Building2 className="w-4 h-4 text-navy-700" />
              Recipient Company &amp; Invoicing Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Recipient Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Aviation Pvt. Ltd. / Global Aerospace Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mobile Number / Phone *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 shadow-xs focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Billing Currency *
                </label>
                <div className="relative">
                  <Globe2 className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 shadow-xs focus:ring-accent focus:border-accent cursor-pointer font-medium bg-white"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {CURRENCY_CONFIG[c].label} - {CURRENCY_CONFIG[c].name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  GST Number (Optional)
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. 36AABCU9603R1ZM"
                    value={companyGstin}
                    onChange={(e) => setCompanyGstin(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 shadow-xs focus:ring-accent focus:border-accent uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Company Identification Number (CIN) (Optional)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. U74999TG2020PTC123456"
                    value={companyCin}
                    onChange={(e) => setCompanyCin(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 shadow-xs focus:ring-accent focus:border-accent uppercase font-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Registered / Billing Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Suite, Street Address, City, State, PIN / Postal Code, Country"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 shadow-xs focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
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

              {!isEditing && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Invoice Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if left blank"
                    value={manualInvoiceNo}
                    onChange={(e) => setManualInvoiceNo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Itemized Fee Heads & Tuition Charges */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-navy-700" />
                  Itemized Fee Heads &amp; Tuition Charges
                </h3>
                <span className="text-2xs text-gray-400">
                  Customizable line items per student or corporate description (Active Currency: {currency})
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
                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                  >
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-12 sm:col-span-6">
                        <label className="block text-2xs font-medium text-gray-600 mb-1">
                          Student Name / Description *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma - Commercial Pilot License Module 1"
                          value={item.description}
                          onChange={(e) =>
                            handleUpdateItem(index, 'description', e.target.value)
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
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            handleUpdateItem(
                              index,
                              'quantity',
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent bg-white"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-3">
                        <label className="block text-2xs font-medium text-gray-600 mb-1">
                          Fee / Amount ({currentCurrencySymbol}) *
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          required
                          placeholder="Enter amount"
                          value={item.unit_price === 0 ? '' : item.unit_price}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            handleUpdateItem(
                              index,
                              'unit_price',
                              e.target.value === ''
                                ? 0
                                : Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent bg-white font-mono"
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
              Invoice Notes &amp; Remittance Guidelines
            </h3>
            <textarea
              rows={4}
              placeholder="Enter invoice notes and payment instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3 text-xs shadow-xs focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Card 4: Company & Document Details (Editable Panel - Same as Student Invoices) */}
          <CompanyDetailsPanel onChange={setCompanyDetails} initialCollapsed={true} />
        </div>

        {/* Right Sidebar: Live Calculated Summary Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-6 sticky top-24">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Sparkles className="w-4 h-4 text-navy-800" />
              <h3 className="text-sm font-bold text-gray-900">Tax Invoice Summary</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Gross Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {formatCurrencyWithSymbol(subtotal, currency)}
                </span>
              </div>

              {/* Deductions Inputs */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div>
                  <label className="block text-2xs font-medium text-gray-600 mb-1">
                    General / Corporate Discount ({currentCurrencySymbol})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Enter discount amount"
                    value={discountAmount === 0 ? '' : discountAmount}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                      setDiscountAmount(
                        e.target.value === ''
                          ? 0
                          : Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent font-mono"
                  />
                </div>
              </div>

              {/* Optional GST Section */}
              <div className="space-y-2.5 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="apply-gst-toggle"
                    className="text-xs font-semibold text-gray-900 cursor-pointer"
                  >
                    Apply GST (Optional)
                  </label>
                  <input
                    id="apply-gst-toggle"
                    type="checkbox"
                    checked={applyGst}
                    onChange={(e) => setApplyGst(e.target.checked)}
                    className="w-4 h-4 text-navy-800 rounded border-gray-300 focus:ring-accent cursor-pointer"
                  />
                </div>

                {applyGst && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-2xs font-medium text-gray-600">
                      Applicable GST Rate (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder="Enter GST rate %"
                      value={gstPercent === 0 ? '' : gstPercent}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) =>
                        setGstPercent(
                          e.target.value === ''
                            ? 0
                            : Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-xs focus:ring-accent focus:border-accent font-mono"
                    />
                  </div>
                )}

                <div className="flex justify-between text-gray-600 pt-1">
                  <span>GST Tax Value {applyGst ? `(${gstPercent}%)` : '(Optional - Disabled)'}</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    {applyGst ? `+ ${formatCurrencyWithSymbol(calculatedGst, currency)}` : '0.00'}
                  </span>
                </div>
              </div>

              {/* Net Grand Total Card */}
              <div className="p-4 rounded-xl bg-navy-50/70 border border-navy-100 flex items-center justify-between text-navy-950">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">Grand Total</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    Currency: {currency} ({currentCurrencySymbol})
                  </span>
                </div>
                <span className="text-xl font-extrabold text-navy-900 font-mono">
                  {formatCurrencyWithSymbol(grandTotal, currency)}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => saveMutation.mutate(false)}
                disabled={saveMutation.isPending}
                className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saveMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {isEditing ? 'Update & Save' : 'Generate & Issue Invoice'}
              </button>

              <button
                type="button"
                onClick={() => saveMutation.mutate(true)}
                disabled={saveMutation.isPending}
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
