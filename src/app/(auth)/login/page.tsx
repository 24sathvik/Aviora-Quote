'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  FileText,
  CreditCard,
  BarChart3,
  CheckCircle2,
  SlidersHorizontal,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-50 font-sans">
      {/* LEFT PANEL: Clean, Premium Corporate Blue Brand Showcase */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-6 flex-col justify-between p-10 xl:p-14 bg-[#0f4383] text-white relative overflow-hidden">
        {/* Top Header Badge */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            FINANCE &amp; FEE MANAGEMENT PLATFORM
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
              Aviora Finance Portal
            </h1>
            <p className="text-sm text-blue-100/90 leading-relaxed font-normal max-w-lg">
              Enterprise financial infrastructure engineered for student fee ledgers, automated tax invoicing, faculty payroll, and real-time revenue analytics.
            </p>
          </div>
        </div>

        {/* 3 Clean Feature Highlight Blocks */}
        <div className="relative z-10 my-6 space-y-6 max-w-lg">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Quotations &amp; Tax Invoicing</h3>
              <p className="text-xs text-blue-100/80 mt-0.5 leading-normal">
                Professional GST tax invoices and quotations generated and tracked automatically.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Fee Collection &amp; Ledger</h3>
              <p className="text-xs text-blue-100/80 mt-0.5 leading-normal">
                Accurate, real-time student balance tracking, receipt generation, and fee schedule ledgers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Payroll &amp; Analytics</h3>
              <p className="text-xs text-blue-100/80 mt-0.5 leading-normal">
                Faculty salary structures, monthly payslips, and executive revenue reports in one place.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-2xs text-blue-100/80">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">Encrypted &amp; Audit-Ready Financial System</span>
          </div>
          <span className="font-medium">Aviora Finance System</span>
        </div>
      </div>

      {/* RIGHT PANEL: Sign In Card Container */}
      <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-slate-50 overflow-y-auto lg:overflow-hidden h-full">
        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          {/* Logo Header */}
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/aviora-logo.png"
              alt="AVIORA AVIATION ACADEMY"
              className="h-32 mx-auto object-contain shrink-0"
            />
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase text-center mt-2">
              Finance Portal Sign In
            </p>
          </div>

          {/* Floating White Card Container */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8 space-y-5">
            {/* Error Warning Banner */}
            {error && (
              <div className="bg-amber-50/90 border border-amber-200 text-amber-900 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email-address" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm font-sans placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0f4383] focus:border-[#0f4383] shadow-2xs transition-colors"
                    placeholder="student@aviora.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      className="w-full rounded-lg border border-gray-200 pl-3.5 pr-10 py-2.5 text-sm font-sans placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0f4383] focus:border-[#0f4383] shadow-2xs transition-colors"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#13325b] hover:bg-[#0b2240] transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Sign In'}
              </button>
            </form>

            <p className="text-2xs font-semibold text-gray-400 text-center pt-1">
              Having trouble? <span className="text-gray-500 hover:underline cursor-pointer">Contact your administrator</span>
            </p>
          </div>

          {/* Right Panel Attribution Footer (Properly Sized ZYXEN Logo) */}
          <div className="text-center space-y-1.5 pt-2">
            <p className="text-2xs font-bold text-gray-700">© AVIORA · Aviation Training Portal</p>
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <span>Developed &amp; maintained by</span>
              <a
                href="https://zyxen.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-gray-900 hover:text-[#0f4383] transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/zyxen-logo.png"
                  alt="ZYXEN"
                  className="h-5 w-auto object-contain bg-black px-1.5 py-0.5 rounded shrink-0 shadow-2xs"
                />
                <span className="font-extrabold text-xs">ZYXEN</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
