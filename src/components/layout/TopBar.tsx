'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User } from 'lucide-react'

export function TopBar() {
  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email ?? null)
        setName(user.user_metadata?.name ?? null)
      }
    }
    getUser()
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8 shadow-sm">
      <div className="flex flex-1" />
      <div className="flex items-center gap-x-6">
        <div className="flex items-center gap-x-3 text-sm font-medium text-gray-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-navy-700">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline-flex">{name || email}</span>
        </div>
        <div className="h-6 w-px bg-gray-200" aria-hidden="true" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  )
}
