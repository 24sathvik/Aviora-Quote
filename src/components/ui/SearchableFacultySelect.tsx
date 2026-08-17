'use client'

import React, { useState, useRef, useEffect, useId } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'

export interface FacultyOption {
  id: string
  name: string
  designation?: string | null
  department?: string | null
}

export interface SearchableFacultySelectProps {
  faculty: FacultyOption[]
  value: string
  onChange: (facultyId: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function SearchableFacultySelect({
  faculty = [],
  value,
  onChange,
  placeholder = '-- Select a faculty member --',
  disabled = false,
  className = '',
  id,
}: SearchableFacultySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const optionListRef = useRef<HTMLUListElement>(null)
  const generatedId = useId()
  const inputId = id || generatedId

  // Find currently selected faculty object
  const selectedFaculty = faculty.find((f) => f.id === value)

  // Filter faculty by name, designation, or department
  const filteredFaculty = faculty.filter((f) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      f.name?.toLowerCase().includes(q) ||
      f.designation?.toLowerCase().includes(q) ||
      f.department?.toLowerCase().includes(q)
    )
  })

  // Reset highlighted index when search query or open state changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [searchQuery, isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredFaculty.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredFaculty.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (filteredFaculty[highlightedIndex]) {
          handleSelect(filteredFaculty[highlightedIndex].id)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && optionListRef.current) {
      const highlightedEl = optionListRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  const handleSelect = (facultyId: string) => {
    onChange(facultyId)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearchQuery('')
    setIsOpen(false)
  }

  const formatFacultyLabel = (f: FacultyOption) => {
    const details = [f.designation, f.department].filter(Boolean).join(' — ')
    return details ? `${f.name} (${details})` : f.name
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button (Visually matches form input) */}
      <button
        id={inputId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`block truncate ${selectedFaculty ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
          {selectedFaculty ? formatFacultyLabel(selectedFaculty) : placeholder}
        </span>
        <div className="flex items-center gap-1 text-gray-400 pl-2">
          {selectedFaculty && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 hover:text-gray-600 rounded transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white p-2 shadow-lg border border-gray-200 text-sm space-y-2 animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Search Input Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by faculty name, designation, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-gray-200 pl-8 pr-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Faculty List Options */}
          <ul
            ref={optionListRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto space-y-0.5"
          >
            {/* Option to clear selection if selected */}
            <li
              role="option"
              aria-selected={value === ''}
              onClick={() => handleSelect('')}
              onMouseEnter={() => setHighlightedIndex(0)}
              className={`px-3 py-2 rounded-lg cursor-pointer text-xs text-gray-500 hover:bg-gray-50 ${
                value === '' ? 'font-semibold text-accent' : ''
              }`}
            >
              {placeholder}
            </li>

            {filteredFaculty.length > 0 ? (
              filteredFaculty.map((f, idx) => {
                const isSelected = f.id === value
                const isHighlighted = idx === highlightedIndex

                return (
                  <li
                    key={f.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(f.id)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      isHighlighted ? 'bg-navy-50 text-navy-900 font-medium' : 'text-gray-800 hover:bg-gray-50'
                    } ${isSelected ? 'font-semibold text-navy-900 bg-navy-50/70' : ''}`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-gray-900">{f.name}</span>
                      {(f.designation || f.department) && (
                        <span className="text-gray-500">
                          {' '}
                          ({[f.designation, f.department].filter(Boolean).join(' — ')})
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                  </li>
                )
              })
            ) : (
              <li className="px-3 py-4 text-center text-xs text-gray-400">
                No faculty members found matching "{searchQuery}"
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
