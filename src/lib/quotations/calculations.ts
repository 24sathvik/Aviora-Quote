import { roundCurrency } from '@/lib/utils/currency'
import type { QuotationItem } from '@/types/database'

export interface CalculatedQuotationTotals {
  subtotal: number
  discountAmount: number
  gstPercent: number
  gstAmount: number
  total: number
  recalculatedItems: Array<QuotationItem & { line_total: number }>
}

/**
 * Authoritative recalculation function used both in real-time on the client
 * and enforced server-side before writing quotations to the database.
 */
export function calculateQuotationTotals(
  items: Array<{
    id?: string
    description: string
    quantity: number | string
    unit_price: number | string
    discount_amount?: number | string
  }>,
  overallDiscount: number | string = 0,
  gstPercent: number | string = 0
): CalculatedQuotationTotals {
  const parsedOverallDiscount = roundCurrency(overallDiscount)
  const parsedGstPercent = Math.max(0, Number(gstPercent) || 0)

  let subtotal = 0

  const recalculatedItems = items.map((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0)
    const unitPrice = Math.max(0, Number(item.unit_price) || 0)
    const lineDiscount = roundCurrency(item.discount_amount || 0)

    const rawLineTotal = Math.max(0, qty * unitPrice - lineDiscount)
    const lineTotal = roundCurrency(rawLineTotal)

    subtotal = roundCurrency(subtotal + lineTotal)

    return {
      ...item,
      quantity: qty,
      unit_price: unitPrice,
      discount_amount: lineDiscount,
      line_total: lineTotal,
    } as QuotationItem & { line_total: number }
  })

  const taxableAmount = Math.max(0, roundCurrency(subtotal - parsedOverallDiscount))
  const gstAmount = roundCurrency(taxableAmount * (parsedGstPercent / 100))
  const total = roundCurrency(taxableAmount + gstAmount)

  return {
    subtotal,
    discountAmount: parsedOverallDiscount,
    gstPercent: parsedGstPercent,
    gstAmount,
    total,
    recalculatedItems,
  }
}
