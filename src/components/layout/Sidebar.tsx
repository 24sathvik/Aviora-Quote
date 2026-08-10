'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileText,
  FileSpreadsheet,
  IndianRupee,
  UserCheck,
  Receipt,
  BarChart3,
  Settings,
} from 'lucide-react'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Courses', href: '/courses', icon: GraduationCap },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: FileSpreadsheet },
  { name: 'Payments', href: '/payments', icon: IndianRupee },
  { name: 'Faculty', href: '/faculty', icon: UserCheck },
  { name: 'Payslips', href: '/payslips', icon: Receipt },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-navy-900 text-white shadow-xl">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold tracking-tight text-white">Aviora Finance</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                isActive
                  ? 'bg-navy-800 text-white'
                  : 'text-navy-100 hover:bg-navy-800 hover:text-white',
                'group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors'
              )}
            >
              <item.icon
                className={cn(
                  isActive ? 'text-white' : 'text-navy-200 group-hover:text-white',
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
