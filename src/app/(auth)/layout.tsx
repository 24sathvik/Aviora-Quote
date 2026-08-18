import React from 'react'

export const metadata = {
  title: 'Sign In | AVIORA Finance & Fee Management System',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-navy-950 text-gray-900 antialiased selection:bg-gold-500 selection:text-white">
      {children}
    </div>
  )
}
