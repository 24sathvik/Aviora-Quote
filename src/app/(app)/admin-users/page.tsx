import React from 'react'
import { AdminUsersClient } from './AdminUsersClient'

export const metadata = {
  title: 'Administrator Accounts | AVIORA Finance',
}

export default function AdminUsersPage() {
  return (
    <div className="max-w-[1800px] w-full mx-auto py-2 sm:py-4">
      <AdminUsersClient />
    </div>
  )
}
