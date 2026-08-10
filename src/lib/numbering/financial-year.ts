/**
 * Computes the Indian Financial Year label for any given date.
 * Indian Financial Year runs from April 1 to March 31.
 *
 * Examples:
 * - 2026-04-01 -> "2026-27"
 * - 2026-12-15 -> "2026-27"
 * - 2027-02-10 -> "2026-27"
 * - 2026-03-31 -> "2025-26"
 * - 2027-04-01 -> "2027-28"
 */
export function getFinancialYearLabel(dateInput: Date | string | number = new Date()): string {
  const date = new Date(dateInput)
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided to getFinancialYearLabel')
  }

  const month = date.getMonth() // 0 = Jan, 3 = April, 11 = Dec
  const fullYear = date.getFullYear()

  // If April (3) or later: FY starts in fullYear and ends in fullYear + 1
  // If March (2) or earlier: FY starts in fullYear - 1 and ends in fullYear
  const startYear = month >= 3 ? fullYear : fullYear - 1
  const endYearShort = ((startYear + 1) % 100).toString().padStart(2, '0')

  return `${startYear}-${endYearShort}`
}

/**
 * Computes the Year-Month label for monthly sequential documents (e.g. Payslips).
 * Format: "YYYY-MM" (e.g. "2026-08")
 */
export function getMonthYearLabel(dateInput: Date | string | number = new Date()): string {
  const date = new Date(dateInput)

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided to getMonthYearLabel')
  }

  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')

  return `${year}-${month}`
}
