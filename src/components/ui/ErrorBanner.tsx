'use client'

import React from 'react'
import { AlertCircle, X } from 'lucide-react'

interface ErrorBannerProps {
  error: Error | string | null | undefined
  title?: string
  onDismiss?: () => void
  className?: string
}

/**
 * Reusable error banner component for displaying raw, unmasked database/RPC error messages.
 */
export function ErrorBanner({
  error,
  title = 'Action Failed',
  onDismiss,
  className = '',
}: ErrorBannerProps) {
  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : error.message

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 shadow-sm transition-all ${className}`}
    >
      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold text-rose-900">{title}</p>}
        <p className="text-xs text-rose-700 mt-0.5 break-words font-medium">{errorMessage}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-rose-400 hover:text-rose-600 p-1 rounded-md transition-colors"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
