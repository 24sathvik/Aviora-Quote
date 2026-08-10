'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { generatePayslipNumber } from '@/lib/numbering/generate-number'
import { calculatePayrollTotals } from '@/lib/payroll/calculations'
import { formatCurrency } from '@/lib/utils/currency'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  FileText,
  ArrowLeft,
  User,
  Calendar,
  AlertTriangle,
  Sparkles,
  Loader2,
  CheckCircle2,
  Banknote,
  MinusCircle,
  PlusCircle,
} from 'lucide-react'
import type { Faculty, FacultySalaryStructure } from '@/types/database'

const MONTHS = [
  { value: 1, name: 'January' },
  { value: 2, name: 'February' },
  { value: 3, name: 'March' },
  { value: 4, name: 'April' },
  { value: 5, name: 'May' },
  { value: 6, name: 'June' },
  { value: 7, name: 'July' },
  { value: 8, name: 'August' },
  { value: 9, name: 'September' },
  { value: 10, name: 'October' },
  { value: 11, name: 'November' },
  { value: 12, name: 'December' },
]

interface PayslipFormProps {
  prefillFacultyId?: string | null
}

export function PayslipForm({ prefillFacultyId }: PayslipFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const today = new Date()
  const [facultyId, setFacultyId] = useState<string>(prefillFacultyId || '')
  const [month, setMonth] = useState<number>(today.getMonth() + 1)
  const [year, setYear] = useState<number>(today.getFullYear())

  // 1. Fetch active faculty directory
  const { data: facultyList, isLoading: loadingFaculty } = useQuery({
    queryKey: ['faculty-for-payslip'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty')
        .select('id, name, designation, department')
        .eq('active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return (data || []) as Faculty[]
    },
  })

  // End date of the payslip month (e.g. 2026-08-31)
  const lastDay = new Date(year, month, 0).getDate()
  const monthEndDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // 2. Fetch the effective salary structure for this faculty member as of selected month
  const { data: effectiveStructure, isLoading: loadingStructure } = useQuery({
    queryKey: ['effective-salary-structure', facultyId, monthEndDate],
    enabled: !!facultyId,
    queryFn: async () => {
      // 1st try: effective_from <= monthEndDate
      const { data, error } = await supabase
        .from('faculty_salary_structures')
        .select('*')
        .eq('faculty_id', facultyId)
        .lte('effective_from', monthEndDate)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (data) return data as FacultySalaryStructure

      // Fallback: latest structure overall for this faculty member
      const { data: latestData } = await supabase
        .from('faculty_salary_structures')
        .select('*')
        .eq('faculty_id', facultyId)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle()

      return (latestData || null) as FacultySalaryStructure | null
    },
  })

  // 3. Check if a payslip for this (faculty_id, month, year) already exists
  const { data: existingPayslip } = useQuery({
    queryKey: ['check-duplicate-payslip', facultyId, month, year],
    enabled: !!facultyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('id, payslip_no, generated_at')
        .eq('faculty_id', facultyId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle()

      if (error) throw error
      return data || null
    },
  })

  // Compute live payroll totals using calculations engine
  const totals = calculatePayrollTotals(effectiveStructure)
  const isDuplicate = !!existingPayslip

  // Generate Payslip Mutation
  const generatePayslipMutation = useMutation({
    mutationFn: async () => {
      if (!facultyId) throw new Error('Please select a faculty member')
      if (isDuplicate) {
        const monthName = MONTHS.find((m) => m.value === month)?.name || month
        throw new Error(`A payslip for this faculty member for ${monthName} ${year} has already been generated. Duplicate payslips are blocked.`)
      }
      if (!effectiveStructure) {
        throw new Error('No effective salary structure found for this faculty member. Please configure salary structure first.')
      }

      const payDate = new Date(year, month - 1, 1)
      const payslipNo = await generatePayslipNumber(payDate, supabase)

      const { data: newPayslip, error } = await supabase
        .from('payslips')
        .insert({
          payslip_no: payslipNo,
          faculty_id: facultyId,
          month,
          year,
          gross_pay: totals.grossPay,
          total_deductions: totals.totalDeductions,
          net_pay: totals.netPay,
          salary_structure_snapshot: totals.snapshot,
        })
        .select('id, payslip_no')
        .single()

      if (error) {
        if (error.code === '23505') {
          const monthName = MONTHS.find((m) => m.value === month)?.name || month
          throw new Error(`A payslip for this faculty member for ${monthName} ${year} has already been generated. Duplicate payslips are blocked.`)
        }
        throw error
      }
      return newPayslip
    },
    onError: (err: Error) => {
      toastError('Failed to generate payslip', err.message)
    },
    onSuccess: (newPayslip) => {
      success(`Payslip ${newPayslip.payslip_no} generated successfully`)
      queryClient.invalidateQueries({ queryKey: ['payslips'] })
      queryClient.invalidateQueries({ queryKey: ['faculty-payslips', facultyId] })
      queryClient.invalidateQueries({ queryKey: ['faculty-payslip-history', facultyId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-payroll-summary'] })
      router.push(`/faculty/${facultyId}`)
    },
  })

  if (loadingFaculty) {
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
            href="/payslips"
            className="p-2 text-gray-400 hover:text-navy-700 hover:bg-white rounded-lg border border-gray-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Faculty Payroll / Payslips
            </span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
              Generate Monthly Faculty Payslip
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Faculty & Period Selector */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
              <User className="w-4 h-4 text-navy-700" />
              Faculty Member & Payroll Month
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Faculty Member *
                </label>
                <select
                  required
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                >
                  <option value="">-- Choose faculty --</option>
                  {facultyList?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.designation || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payroll Month *
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payroll Year *
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                >
                  {[2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Warning Banners */}
            {isDuplicate && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Payslip Already Generated</strong>
                  <span>
                    A payslip (<code className="font-mono font-bold">{existingPayslip.payslip_no}</code>) has already been generated for this faculty member for {MONTHS.find((m) => m.value === month)?.name} {year}. Duplicate payslips are blocked to maintain payroll integrity.
                  </span>
                </div>
              </div>
            )}

            {facultyId && !loadingStructure && !effectiveStructure && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">No Effective Salary Structure Found</strong>
                  <span>
                    No salary structure configured for this faculty member effective on or before {monthEndDate}. Please configure a salary structure on the faculty profile first.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Live Structure Breakdown */}
          {facultyId && effectiveStructure && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-navy-700" />
                  Effective Salary Structure Snapshot
                </h3>
                <span className="text-2xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  Effective From: {effectiveStructure.effective_from}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gross Earnings Table */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" /> Gross Earnings
                  </span>
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Basic Pay</span>
                      <span className="font-mono font-semibold">{formatCurrency(totals.basic)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">House Rent Allowance (HRA)</span>
                      <span className="font-mono font-semibold">{formatCurrency(totals.hra)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Special & Flight Allowances</span>
                      <span className="font-mono font-semibold">{formatCurrency(totals.otherAllowances)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-900 pt-2 border-t border-emerald-200 text-sm">
                      <span>Total Gross Pay</span>
                      <span className="font-mono">{formatCurrency(totals.grossPay)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                    <MinusCircle className="w-3.5 h-3.5 text-rose-600" /> Statutory Deductions
                  </span>
                  <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Provident Fund (PF)</span>
                      <span className="font-mono font-semibold text-rose-700">{formatCurrency(totals.pfDeduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Professional Tax (PT)</span>
                      <span className="font-mono font-semibold text-rose-700">{formatCurrency(totals.ptDeduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Income Tax (TDS)</span>
                      <span className="font-mono font-semibold text-rose-700">{formatCurrency(totals.tdsDeduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Other Deductions</span>
                      <span className="font-mono font-semibold text-rose-700">{formatCurrency(totals.otherDeductions)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-950 pt-2 border-t border-rose-200 text-sm">
                      <span>Total Deductions</span>
                      <span className="font-mono">{formatCurrency(totals.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Live Net Payable Calculation */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-6 sticky top-24">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Sparkles className="w-4 h-4 text-navy-800" />
              <h3 className="text-sm font-bold text-gray-900">Payslip Summary</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Gross Monthly Earnings</span>
                <span className="font-mono font-semibold text-gray-900">
                  {formatCurrency(totals.grossPay)}
                </span>
              </div>

              <div className="flex justify-between text-rose-700">
                <span>Total Statutory Deductions</span>
                <span className="font-mono font-semibold">
                  - {formatCurrency(totals.totalDeductions)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-navy-900 text-white space-y-1">
                <span className="text-2xs font-bold uppercase tracking-wider text-sky-400 block">
                  Net Salary Payable
                </span>
                <div className="text-2xl font-extrabold font-mono text-white">
                  {formatCurrency(totals.netPay)}
                </div>
                <span className="text-2xs text-gray-300 block">
                  Frozen copy will be stored in payslip snapshot
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => generatePayslipMutation.mutate()}
              disabled={
                generatePayslipMutation.isPending ||
                !facultyId ||
                !effectiveStructure ||
                isDuplicate
              }
              className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generatePayslipMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Generate Faculty Payslip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
