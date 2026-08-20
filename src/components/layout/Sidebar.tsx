'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
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
  Shield,
  CreditCard,
  ArrowUpRight,
  X,
} from 'lucide-react'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const baseNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Courses', href: '/courses', icon: GraduationCap },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: FileSpreadsheet },
  { name: 'Payments', href: '/payments', icon: IndianRupee },
  { name: 'Faculty', href: '/faculty', icon: UserCheck },
  { name: 'Payslips', href: '/payslips', icon: Receipt },
  { name: 'Operational Expenses', href: '/expenses', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

export function Sidebar({ onMobileNavigate }: { onMobileNavigate?: () => void }) {
  const pathname = usePathname()
  const supabase = createClient()

  // Fetch logged in user's profile and role
  const { data: userProfile } = useQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      let user = session?.user
      if (!user) {
        const {
          data: { user: fetchedUser },
        } = await supabase.auth.getUser()
        if (fetchedUser) user = fetchedUser
      }
      if (!user) return undefined

      const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle()

      return {
        id: user.id,
        email: user.email || '',
        name: data?.name || user.user_metadata?.name || user.email || 'Admin',
        role: data?.role || 'admin',
        created_at: data?.created_at || user.created_at,
      }
    },
    staleTime: 60 * 1000,
  })

  const isSuperAdmin = userProfile?.role === 'super_admin'

  const navItems = [
    ...baseNavItems,
    ...(isSuperAdmin
      ? [
          { name: 'Admin Users', href: '/admin-users', icon: Shield },
        ]
      : []),
  ]

  return (
    <div className="flex h-full w-full md:w-64 flex-col bg-white border-r border-gray-200 shadow-sm font-sans shrink-0">
      {/* Dark Blue Header Box with LARGE, PROMINENT Logo */}
      <div className="bg-[#0f4383] px-3.5 py-2 h-16 flex items-center justify-between shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/aviora-logo-horizontal.png"
          alt="AVIORA"
          className="w-auto h-auto max-h-12 object-contain shrink-0"
        />
        {onMobileNavigate && (
          <button
            onClick={onMobileNavigate}
            className="md:hidden p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role / Context Sub-Header */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50/60 shrink-0">
        <span>{isSuperAdmin ? 'Super Admin' : 'Finance Admin'}</span>
        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onMobileNavigate}
              className={cn(
                'group relative flex items-center rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-blue-50/80 text-[#0f4383]'
                  : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
              )}
            >
              {/* Active Left Indicator Bar */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-[#0f4383]" />
              )}
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-[#0f4383]' : 'text-slate-500 group-hover:text-slate-800'
                )}
                aria-hidden="true"
              />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
