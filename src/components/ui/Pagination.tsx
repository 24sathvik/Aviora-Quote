'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PaginationProps {
  totalCount: number
  currentPage: number // 0-based index
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  itemLabel?: string
  isLoading?: boolean
}

export function Pagination({
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50],
  itemLabel = 'Records',
  isLoading = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentOneBased = currentPage + 1

  // Generate page numbers array (smart windowing)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      let start = Math.max(1, currentOneBased - 1)
      let end = Math.min(totalPages, currentOneBased + 1)

      if (currentOneBased <= 3) {
        start = 1
        end = 4
      } else if (currentOneBased >= totalPages - 2) {
        start = totalPages - 3
        end = totalPages
      }

      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push('ellipsis')
      }

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i)
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('ellipsis')
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="bg-white px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-gray-700 shrink-0">
      {/* Left: Total Count Label */}
      <div className="font-semibold text-gray-900 whitespace-nowrap">
        Total {itemLabel}: <span className="font-bold text-navy-800">{totalCount}</span>
      </div>

      {/* Center: Numbered Navigation Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0 || isLoading}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Buttons */}
        {pageNumbers.map((p, idx) => {
          if (p === 'ellipsis') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400">
                •••
              </span>
            )
          }

          const pageIdx = p - 1
          const isActive = pageIdx === currentPage

          return (
            <button
              key={p}
              onClick={() => onPageChange(pageIdx)}
              disabled={isLoading}
              className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-navy-800 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {p}
            </button>
          )
        })}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
          disabled={currentPage >= totalPages - 1 || isLoading}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Show Per Page Selector */}
      {onPageSizeChange ? (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-gray-600 font-normal">Show per Page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value))
              onPageChange(0) // Reset to page 1 when page size changes
            }}
            className="text-xs font-semibold rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent shadow-2xs cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="w-1" />
      )}
    </div>
  )
}
