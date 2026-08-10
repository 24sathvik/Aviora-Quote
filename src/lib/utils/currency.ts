/**
 * Formats a given number into Indian Rupees (INR) with the correct comma grouping.
 * E.g., 123456 -> ₹1,23,456.00
 * 
 * Note: As per project rules, all money values should be formatted using this utility.
 * In the database, money columns must be numeric(12,2).
 */
export function formatCurrency(amount: number): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Standard rounding helper for monetary calculations (2 decimal places).
 * Ensures consistency across calculations throughout the entire system.
 */
export function roundCurrency(amount: number | string): number {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0
  return Math.round(num * 100) / 100
}
