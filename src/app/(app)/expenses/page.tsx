import React from 'react'
import { ExpenseList } from './ExpenseList'

export const metadata = {
  title: 'Operational Expenses | AVIORA Finance',
}

export default function ExpensesPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <ExpenseList />
    </div>
  )
}
