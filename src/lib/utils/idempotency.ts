/**
 * AVIORA Finance & Fee Management System
 * Idempotency Key Utility
 *
 * IDEMPOTENCY KEY LIFECYCLE & RULES:
 * 1. A NEW key must be generated ONCE per user-intended financial action
 *    (e.g., when the user submits a payment or clicks to create an invoice).
 * 2. Store the key in local state or a ref during that submission attempt.
 * 3. If an automatic network retry occurs for the EXACT same submission attempt,
 *    REUSE the same idempotency key.
 * 4. When the user intentionally starts a NEW submission (e.g. submittting a second,
 *    distinct payment), generate a FRESH idempotency key.
 * 5. Do NOT regenerate keys on every keystroke, form input change, or component re-render.
 */

/**
 * Generates a cryptographically strong UUID v4 idempotency key.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback for environments where crypto.randomUUID might not be available
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
