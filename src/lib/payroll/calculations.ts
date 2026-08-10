import { roundCurrency } from '@/lib/utils/currency'
import type { FacultySalaryStructure, PayslipStructureSnapshot } from '@/types/database'

export interface CalculatedPayrollTotals {
  basic: number
  hra: number
  otherAllowances: number
  grossPay: number
  pfDeduction: number
  ptDeduction: number
  tdsDeduction: number
  otherDeductions: number
  totalDeductions: number
  netPay: number
  snapshot: PayslipStructureSnapshot
}

export function calculatePayrollTotals(
  structure?: Partial<FacultySalaryStructure> | null
): CalculatedPayrollTotals {
  const basic = Math.max(0, roundCurrency(structure?.basic || 0))
  const hra = Math.max(0, roundCurrency(structure?.hra || 0))
  const otherAllowances = Math.max(0, roundCurrency(structure?.other_allowances || 0))

  const grossPay = roundCurrency(basic + hra + otherAllowances)

  const pfDeduction = Math.max(0, roundCurrency(structure?.pf_deduction || 0))
  const ptDeduction = Math.max(0, roundCurrency(structure?.pt_deduction || 0))
  const tdsDeduction = Math.max(0, roundCurrency(structure?.tds_deduction || 0))
  const otherDeductions = Math.max(0, roundCurrency(structure?.other_deductions || 0))

  const totalDeductions = roundCurrency(
    pfDeduction + ptDeduction + tdsDeduction + otherDeductions
  )
  const netPay = roundCurrency(grossPay - totalDeductions)

  const snapshot: PayslipStructureSnapshot = {
    basic,
    hra,
    other_allowances: otherAllowances,
    pf_deduction: pfDeduction,
    pt_deduction: ptDeduction,
    tds_deduction: tdsDeduction,
    other_deductions: otherDeductions,
    effective_from: structure?.effective_from || new Date().toISOString().split('T')[0],
    gross_pay: grossPay,
    total_deductions: totalDeductions,
    net_pay: netPay,
  }

  return {
    basic,
    hra,
    otherAllowances,
    grossPay,
    pfDeduction,
    ptDeduction,
    tdsDeduction,
    otherDeductions,
    totalDeductions,
    netPay,
    snapshot,
  }
}
