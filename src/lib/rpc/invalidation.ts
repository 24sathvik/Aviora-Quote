/**
 * AVIORA Finance & Fee Management System
 * Cache Invalidation Matrix
 *
 * Implements targeted, precise React Query cache invalidation helpers for
 * financial mutations.
 *
 * DESIGN GOALS:
 * - Minimum required network traffic: invalidates only queries whose displayed
 *   data is actually altered by the mutation.
 * - Single source of truth: all mutations in Phases B-F call these centralized helpers.
 * - Future optimization note: Where an RPC return already contains the updated record,
 *   future phases can optionally call `queryClient.setQueryData` to seed the cache directly.
 */

import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

/**
 * Invalidates queries affected when a new invoice is created.
 */
export async function invalidateAfterInvoiceCreated(
  queryClient: QueryClient,
  { studentId }: { studentId?: string | null } = {}
): Promise<void> {
  const promises: Promise<void>[] = [
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.summaryMetrics, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard('all_time'), refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard('this_month'), refetchType: 'all' }),
  ]

  if (studentId) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.studentLedger(studentId), refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.openForStudent(studentId), refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.studentOutstanding(studentId), refetchType: 'all' })
    )
  }

  await Promise.all(promises)
}

/**
 * Invalidates queries affected when a payment is recorded.
 */
export async function invalidateAfterPaymentRecorded(
  queryClient: QueryClient,
  { invoiceId, studentId }: { invoiceId?: string; studentId?: string | null } = {}
): Promise<void> {
  const promises: Promise<void>[] = [
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.all, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.summaryMetrics, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard('all_time'), refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard('this_month'), refetchType: 'all' }),
  ]

  if (invoiceId) {
    promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId), refetchType: 'all' }))
  }

  if (studentId) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.studentLedger(studentId), refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.openForStudent(studentId), refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.studentOutstanding(studentId), refetchType: 'all' })
    )
  }

  await Promise.all(promises)
}

/**
 * Invalidates queries affected when a quotation is converted into an invoice.
 */
export async function invalidateAfterQuotationConverted(
  queryClient: QueryClient,
  { quotationId, studentId }: { quotationId?: string; studentId?: string | null } = {}
): Promise<void> {
  const promises: Promise<void>[] = [
    queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.summaryMetrics, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard('all_time'), refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard('this_month'), refetchType: 'all' }),
  ]

  if (quotationId) {
    promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(quotationId), refetchType: 'all' }))
  }

  if (studentId) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.studentLedger(studentId), refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.openForStudent(studentId), refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.studentOutstanding(studentId), refetchType: 'all' })
    )
  }

  await Promise.all(promises)
}

/**
 * Invalidates queries affected when a payslip is generated.
 */
export async function invalidateAfterPayslipGenerated(
  queryClient: QueryClient,
  { facultyId }: { facultyId?: string | null } = {}
): Promise<void> {
  const promises: Promise<void>[] = [
    queryClient.invalidateQueries({ queryKey: queryKeys.payslips.all, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard('all_time'), refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard('this_month'), refetchType: 'all' }),
  ]

  if (facultyId) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.detail(facultyId), refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.payslipHistory(facultyId), refetchType: 'all' })
    )
  }

  await Promise.all(promises)
}

/**
 * Invalidates queries affected when an invoice is cancelled.
 */
export async function invalidateAfterInvoiceCancelled(
  queryClient: QueryClient,
  { invoiceId, studentId }: { invoiceId?: string; studentId?: string | null } = {}
): Promise<void> {
  const promises: Promise<void>[] = [
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.summaryMetrics, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard('all_time'), refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard('this_month'), refetchType: 'all' }),
  ]

  if (invoiceId) {
    promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId), refetchType: 'all' }))
  }

  if (studentId) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.studentLedger(studentId), refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.openForStudent(studentId), refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.studentOutstanding(studentId), refetchType: 'all' })
    )
  }

  await Promise.all(promises)
}
