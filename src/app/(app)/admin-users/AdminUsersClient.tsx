'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { Modal } from '@/components/ui/Modal'
import {
  Shield,
  UserPlus,
  Users,
  Mail,
  Lock,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'

export function AdminUsersClient() {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  // Create Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Modals & Action State
  const [pwdUser, setPwdUser] = useState<any | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)

  const [deleteUser, setDeleteUser] = useState<any | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // 1. Fetch current logged-in user profile to verify super_admin role
  const { data: currentUserProfile, isLoading: loadingProfile } = useQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      return data
    },
    staleTime: 5 * 60 * 1000,
  })

  // 2. Fetch list of all registered users from public.users
  const { data: usersList = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users-list'],
    enabled: currentUserProfile?.role === 'super_admin',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
  })

  // 3. Mutation to call protected Server Route Handler (/api/admin/create-user)
  const createAdminMutation = useMutation({
    mutationFn: async () => {
      setFormError(null)

      if (!email.trim()) {
        throw new Error('Email address is required')
      }
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create admin user account')
      }

      return data
    },
    onError: (err: Error) => {
      setFormError(err.message)
      toastError('Admin creation failed', err.message)
    },
    onSuccess: (data) => {
      success('Admin Account Created', `New administrator account created for ${data.user.email}`)
      setName('')
      setEmail('')
      setPassword('')
      setFormError(null)
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] })
    },
  })

  // 4. Mutation to call /api/admin/manage-user (Change Password, Toggle Active, Delete)
  const manageUserMutation = useMutation({
    mutationFn: async (payload: { action: string; targetUserId: string; [key: string]: any }) => {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Operation failed')
      }
      return data
    },
    onError: (err: Error) => {
      toastError('Action Failed', err.message)
    },
    onSuccess: (data, variables) => {
      success('Success', data.message || 'Action completed successfully')
      if (variables.action === 'change_password') {
        setPwdUser(null)
        setNewPassword('')
        setPwdError(null)
      } else if (variables.action === 'delete_user') {
        setDeleteUser(null)
        setDeleteError(null)
      }
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] })
    },
  })

  // Redirect non-super_admin users immediately
  if (!loadingProfile && (!currentUserProfile || currentUserProfile.role !== 'super_admin')) {
    router.push('/dashboard')
    return (
      <div className="bg-white p-8 text-center rounded-xl border border-gray-200 shadow-xs max-w-lg mx-auto space-y-4 my-12">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Access Restricted</h3>
        <p className="text-xs text-gray-500">
          The Admin User Management module is reserved exclusively for Super Administrators.
          Redirecting to dashboard...
        </p>
      </div>
    )
  }

  if (loadingProfile || loadingUsers) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Super Admin Console
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-1 flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            Administrator Account Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage system access, provision new staff administrator accounts, reset passwords, and update access permissions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2 Cols): Existing Admins Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-navy-700" />
              <h2 className="text-base font-bold text-gray-900">System Users ({usersList.length})</h2>
            </div>
            <span className="text-2xs text-gray-400 font-mono">Live RLS-Protected Ledger</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider text-2xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Administrator</th>
                  <th className="px-6 py-3">Email Address</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {usersList.map((usr: any) => {
                  const isSuper = usr.role === 'super_admin'
                  const isSelf = usr.id === currentUserProfile?.id

                  return (
                    <tr key={usr.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-navy-100 text-navy-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {(usr.name || usr.email || 'A').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{usr.name || <span className="text-gray-400 italic">No name</span>}</span>
                            {isSelf && (
                              <span className="text-2xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-700">{usr.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isSuper
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {isSuper && <Shield className="w-3 h-3 text-purple-600" />}
                          {isSuper ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Change Password Button */}
                          <button
                            onClick={() => {
                              setPwdUser(usr)
                              setNewPassword('')
                              setPwdError(null)
                            }}
                            title="Change Password"
                            className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Delete Admin Button (Self Protection) */}
                          <button
                            disabled={isSelf}
                            onClick={() => {
                              if (!isSelf) {
                                setDeleteUser(usr)
                                setDeleteError(null)
                              }
                            }}
                            title={isSelf ? 'Cannot delete your own account' : 'Delete Admin User'}
                            className={`p-1.5 rounded-md transition-colors ${
                              isSelf
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1 Col): Provision New Admin Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-600" />
              Provision New Admin
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Creates a secure login account via server-side Auth Admin API with default role = <strong className="text-gray-700">admin</strong>.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              createAdminMutation.mutate()
            }}
            className="space-y-4"
          >
            {formError && <ErrorBanner title="Provisioning Error" error={formError} />}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Priya Nair"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="admin@aviora.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Account Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
                />
              </div>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg text-2xs text-purple-900 space-y-1">
              <span className="font-bold flex items-center gap-1 text-purple-950">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
                Secure Server-Side Auth API
              </span>
              <p>
                Service-role client executes exclusively inside protected Next.js route handler. Role is hardcoded to standard Admin.
              </p>
            </div>

            <button
              type="submit"
              disabled={createAdminMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {createAdminMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Admin Account
            </button>
          </form>
        </div>
      </div>

      {/* Modal: Change Password */}
      {pwdUser && (
        <Modal
          isOpen={!!pwdUser}
          onClose={() => setPwdUser(null)}
          title={`Change Password for ${pwdUser.name || pwdUser.email}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!newPassword || newPassword.length < 6) {
                setPwdError('Password must be at least 6 characters')
                return
              }
              manageUserMutation.mutate({
                action: 'change_password',
                targetUserId: pwdUser.id,
                newPassword,
              })
            }}
            className="space-y-4 pt-2"
          >
            {pwdError && <ErrorBanner title="Validation Error" error={pwdError} />}
            <p className="text-xs text-gray-500">
              Enter a new password for <strong>{pwdUser.email}</strong>. This update will take effect immediately upon save.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-accent focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPwdUser(null)}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={manageUserMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {manageUserMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save New Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Delete User Confirmation */}
      {deleteUser && (
        <Modal
          isOpen={!!deleteUser}
          onClose={() => setDeleteUser(null)}
          title="Confirm Account Deletion"
        >
          <div className="space-y-4 pt-2">
            {deleteError && <ErrorBanner title="Deletion Error" error={deleteError} />}

            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 space-y-1">
                <strong className="font-bold block">Permanent Action Warning</strong>
                <p>
                  Are you sure you want to delete administrator account{' '}
                  <strong className="font-mono text-rose-950">{deleteUser.email}</strong>?
                </p>
                <p className="text-2xs text-rose-700 mt-1">
                  This will delete the login user profile. All historical financial records (invoices, receipts, payments) created by this user will remain preserved for audit compliance.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={manageUserMutation.isPending}
                onClick={() => {
                  manageUserMutation.mutate({
                    action: 'delete_user',
                    targetUserId: deleteUser.id,
                  })
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {manageUserMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete Administrator Account
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
