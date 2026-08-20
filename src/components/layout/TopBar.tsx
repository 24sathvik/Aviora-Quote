'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { LogOut, User, Shield, Menu } from 'lucide-react'

export function TopBar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const router = useRouter()
  const supabase = createClient()

  const queryClient = useQueryClient()

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    queryClient.clear()
    router.push('/login')
    router.refresh()
  }

  const displayName = userProfile?.name || userProfile?.email || 'Admin'
  const isSuperAdmin = userProfile?.role === 'super_admin'

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-8 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-navy-800 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/aviora-logo-horizontal.png"
          alt="AVIORA"
          className="md:hidden h-8 w-auto object-contain"
        />
      </div>
      <div className="flex items-center gap-x-6">
        <div className="flex items-center gap-x-3 text-sm font-medium text-gray-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-navy-700">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline-flex font-semibold text-gray-900">{displayName}</span>
          
          {/* Role Badge */}
          {userProfile && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                isSuperAdmin
                  ? 'bg-gold-500/15 text-gold-700 border border-gold-500/30 shadow-2xs'
                  : 'bg-navy-50 text-navy-700 border border-navy-200 shadow-2xs'
              }`}
            >
              {isSuperAdmin && <Shield className="w-3 h-3 text-gold-600" />}
              {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
          )}
        </div>
        <div className="h-6 w-px bg-gray-200" aria-hidden="true" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  )
}
