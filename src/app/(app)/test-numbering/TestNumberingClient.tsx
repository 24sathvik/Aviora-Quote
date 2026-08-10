'use client'

import React, { useState } from 'react'
import {
  generateQuotationNumber,
  generateInvoiceNumber,
  generateReceiptNumber,
  generatePayslipNumber,
  getFinancialYearLabel,
  NUMBERING_CONFIG,
} from '@/lib/numbering/generate-number'
import {
  Binary,
  CheckCircle2,
  AlertTriangle,
  Play,
  Calendar,
  Layers,
  FileText,
  Receipt,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface ConcurrencyResult {
  docType: string
  numbers: string[]
  uniqueCount: number
  hasDuplicates: boolean
  durationMs: number
}

interface BoundaryTestResult {
  date: string
  label: string
  expected: string
  passed: boolean
}

export function TestNumberingClient() {
  const [isRunning, setIsRunning] = useState(false)
  const [quotationResults, setQuotationResults] = useState<ConcurrencyResult | null>(null)
  const [invoiceResults, setInvoiceResults] = useState<ConcurrencyResult | null>(null)
  const [receiptResults, setReceiptResults] = useState<ConcurrencyResult | null>(null)
  const [payslipResults, setPayslipResults] = useState<ConcurrencyResult | null>(null)
  const [boundaryResults, setBoundaryResults] = useState<BoundaryTestResult[]>([])

  const runAllTests = async () => {
    setIsRunning(true)

    // 1. Boundary tests for Indian Financial Year
    const testCases = [
      { date: '2026-03-31', expected: '2025-26', note: 'Last day of FY 2025-26' },
      { date: '2026-04-01', expected: '2026-27', note: 'First day of FY 2026-27' },
      { date: '2026-08-15', expected: '2026-27', note: 'Mid FY 2026-27' },
      { date: '2027-01-10', expected: '2026-27', note: 'Q4 of FY 2026-27' },
      { date: '2027-03-31', expected: '2026-27', note: 'Last day of FY 2026-27' },
      { date: '2027-04-01', expected: '2027-28', note: 'First day of FY 2027-28' },
    ]

    const boundaries = testCases.map((tc) => {
      const label = getFinancialYearLabel(tc.date)
      return {
        date: tc.date,
        label,
        expected: tc.expected,
        passed: label === tc.expected,
      }
    })
    setBoundaryResults(boundaries)

    // 2. 20 Concurrent Quotation Generation Calls
    const t0 = performance.now()
    const quotePromises = Array.from({ length: 20 }, () => generateQuotationNumber())
    const quotes = await Promise.all(quotePromises)
    const quoteTime = Math.round(performance.now() - t0)
    const uniqueQuotes = new Set(quotes)
    setQuotationResults({
      docType: 'Quotations',
      numbers: quotes,
      uniqueCount: uniqueQuotes.size,
      hasDuplicates: uniqueQuotes.size !== quotes.length,
      durationMs: quoteTime,
    })

    // 3. 20 Concurrent Invoice Generation Calls
    const t1 = performance.now()
    const invoicePromises = Array.from({ length: 20 }, () => generateInvoiceNumber(new Date()))
    const invoices = await Promise.all(invoicePromises)
    const invoiceTime = Math.round(performance.now() - t1)
    const uniqueInvoices = new Set(invoices)
    setInvoiceResults({
      docType: 'Invoices (2026-27)',
      numbers: invoices,
      uniqueCount: uniqueInvoices.size,
      hasDuplicates: uniqueInvoices.size !== invoices.length,
      durationMs: invoiceTime,
    })

    // 4. 20 Concurrent Receipt Generation Calls
    const t2 = performance.now()
    const receiptPromises = Array.from({ length: 20 }, () => generateReceiptNumber(new Date()))
    const receipts = await Promise.all(receiptPromises)
    const receiptTime = Math.round(performance.now() - t2)
    const uniqueReceipts = new Set(receipts)
    setReceiptResults({
      docType: 'Receipts (2026-27)',
      numbers: receipts,
      uniqueCount: uniqueReceipts.size,
      hasDuplicates: uniqueReceipts.size !== receipts.length,
      durationMs: receiptTime,
    })

    // 5. 20 Concurrent Payslip Calls
    const t3 = performance.now()
    const payslipPromises = Array.from({ length: 20 }, (_, idx) =>
      generatePayslipNumber(new Date(), `FAC${(idx + 1).toString().padStart(3, '0')}`)
    )
    const payslips = await Promise.all(payslipPromises)
    const payslipTime = Math.round(performance.now() - t3)
    const uniquePayslips = new Set(payslips)
    setPayslipResults({
      docType: 'Payslips',
      numbers: payslips,
      uniqueCount: uniquePayslips.size,
      hasDuplicates: uniquePayslips.size !== payslips.length,
      durationMs: payslipTime,
    })

    setIsRunning(false)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-navy-800 text-white flex items-center justify-center font-bold">
            <Binary className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-navy-50 text-navy-800 px-2 py-0.5 rounded font-semibold">
                Phase 4 Test Harness
              </span>
              <span className="text-xs text-gray-500 font-medium">Dev-Only Verification</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight mt-0.5">
              Atomic Numbering Engine Verification
            </h1>
          </div>
        </div>

        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running 20 Concurrent Calls...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Concurrency & Edge-Case Test
            </>
          )}
        </button>
      </div>

      {/* Prefix Configuration Overview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-navy-700" />
          Configured Formatting Standards (src/lib/numbering/config.ts)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="text-gray-500 block">Quotation Format:</span>
            <span className="font-mono font-bold text-navy-900 mt-1 block">
              {NUMBERING_CONFIG.DOC_PREFIX}/{NUMBERING_CONFIG.DOC_TYPES.QUOTATION}/00001
            </span>
            <span className="text-2xs text-gray-400 mt-0.5 block">Continuously increments</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="text-gray-500 block">Invoice Format:</span>
            <span className="font-mono font-bold text-navy-900 mt-1 block">
              {NUMBERING_CONFIG.DOC_PREFIX}/{NUMBERING_CONFIG.DOC_TYPES.INVOICE}/2026-27/00001
            </span>
            <span className="text-2xs text-gray-400 mt-0.5 block">Resets each Indian FY</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="text-gray-500 block">Receipt Format:</span>
            <span className="font-mono font-bold text-navy-900 mt-1 block">
              {NUMBERING_CONFIG.DOC_PREFIX}/{NUMBERING_CONFIG.DOC_TYPES.RECEIPT}/2026-27/00001
            </span>
            <span className="text-2xs text-gray-400 mt-0.5 block">Resets each Indian FY</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="text-gray-500 block">Payslip Format:</span>
            <span className="font-mono font-bold text-navy-900 mt-1 block">
              {NUMBERING_CONFIG.DOC_PREFIX}/{NUMBERING_CONFIG.DOC_TYPES.PAYSLIP}/2026-08/FAC012
            </span>
            <span className="text-2xs text-gray-400 mt-0.5 block">Monthly sequence + faculty</span>
          </div>
        </div>
      </div>

      {/* Financial Year Boundary Tests */}
      {boundaryResults.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-navy-700" />
            Indian Financial Year Boundary Calculations (April 1 – March 31)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {boundaryResults.map((res, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  res.passed
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div>
                  <span className="font-medium block">Date: {res.date}</span>
                  <span className="text-2xs text-gray-600">Calculated FY: {res.label}</span>
                </div>
                {res.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 20 Concurrent Calls Results */}
      {(quotationResults || invoiceResults || receiptResults || payslipResults) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quotations Result */}
          {quotationResults && (
            <ResultCard
              title="Quotations (20 Concurrent Calls)"
              icon={FileText}
              result={quotationResults}
            />
          )}

          {/* Invoices Result */}
          {invoiceResults && (
            <ResultCard
              title="Invoices (20 Concurrent Calls)"
              icon={FileSpreadsheet}
              result={invoiceResults}
            />
          )}

          {/* Receipts Result */}
          {receiptResults && (
            <ResultCard
              title="Receipts (20 Concurrent Calls)"
              icon={Receipt}
              result={receiptResults}
            />
          )}

          {/* Payslips Result */}
          {payslipResults && (
            <ResultCard
              title="Payslips (20 Concurrent Calls)"
              icon={RefreshCw}
              result={payslipResults}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ResultCard({
  title,
  icon: Icon,
  result,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  result: ConcurrencyResult
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-navy-700" />
          <h4 className="text-sm font-bold text-gray-900">{title}</h4>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full ${
            !result.hasDuplicates
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {!result.hasDuplicates ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              0 Duplicates ({result.uniqueCount}/20 Unique)
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              Duplicates Detected!
            </>
          )}
        </span>
      </div>

      <div className="text-xs text-gray-500">
        Executed 20 parallel async RPC calls in <strong className="text-gray-800">{result.durationMs}ms</strong>.
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 font-mono text-2xs space-y-1 max-h-40 overflow-y-auto">
        {result.numbers.map((num, i) => (
          <div key={i} className="flex items-center justify-between text-gray-700">
            <span>#{i + 1}</span>
            <span className="font-semibold text-navy-900">{num}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
