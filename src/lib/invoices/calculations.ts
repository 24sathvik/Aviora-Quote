import { roundCurrency } from '@/lib/utils/currency'
import type { InvoiceItem } from '@/types/database'

export interface CalculatedInvoiceTotals {
  subtotal: number
  previousOutstanding: number
  discountAmount: number
  scholarshipAmount: number
  couponAmount: number
  totalDeductions: number
  gstPercent: number
  gstAmount: number
  grandTotal: number
  recalculatedItems: Array<InvoiceItem & { line_total: number }>
}

/**
 * Authoritative recalculation function used both in real-time on the client
 * and enforced server-side before writing invoices to the database.
 */
export function calculateInvoiceTotals(
  items: Array<{
    id?: string
    description: string
    quantity: number | string
    unit_price: number | string
  }>,
  previousOutstanding: number | string = 0,
  discountAmount: number | string = 0,
  scholarshipAmount: number | string = 0,
  couponAmount: number | string = 0,
  gstPercent: number | string = 0
): CalculatedInvoiceTotals {
  const parsedPrevOutstanding = roundCurrency(previousOutstanding)
  const parsedDiscount = roundCurrency(discountAmount)
  const parsedScholarship = roundCurrency(scholarshipAmount)
  const parsedCoupon = roundCurrency(couponAmount)
  const parsedGstPercent = Math.max(0, Number(gstPercent) || 0)

  let subtotal = 0

  const recalculatedItems = items.map((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0)
    const unitPrice = Math.max(0, Number(item.unit_price) || 0)
    const lineTotal = roundCurrency(qty * unitPrice)

    subtotal = roundCurrency(subtotal + lineTotal)

    return {
      ...item,
      quantity: qty,
      unit_price: unitPrice,
      line_total: lineTotal,
    } as InvoiceItem & { line_total: number }
  })

  const totalDeductions = roundCurrency(parsedDiscount + parsedScholarship + parsedCoupon)
  const taxableAmount = Math.max(0, roundCurrency(subtotal - totalDeductions))
  const gstAmount = roundCurrency(taxableAmount * (parsedGstPercent / 100))
  const grandTotal = roundCurrency(
    subtotal + parsedPrevOutstanding - totalDeductions + gstAmount
  )

  return {
    subtotal,
    previousOutstanding: parsedPrevOutstanding,
    discountAmount: parsedDiscount,
    scholarshipAmount: parsedScholarship,
    couponAmount: parsedCoupon,
    totalDeductions,
    gstPercent: parsedGstPercent,
    gstAmount,
    grandTotal,
    recalculatedItems,
  }
}
