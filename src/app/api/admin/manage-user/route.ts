import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    // 1. Verify caller session using server cookie client or Authorization header
    const supabase = await createClient()
    let callerUser = null

    const authHeader = req.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      const { data: tokenData, error: tokenErr } = await supabase.auth.getUser(token)
      if (!tokenErr && tokenData?.user) {
        callerUser = tokenData.user
      }
    }

    if (!callerUser) {
      const {
        data: { user: sessionUser },
        error: authError,
      } = await supabase.auth.getUser()
      if (!authError && sessionUser) {
        callerUser = sessionUser
      }
    }

    if (!callerUser) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing' },
        { status: 500 }
      )
    }

    // 2. Server-only Auth Admin client initialization
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // 3. Authoritative server-side role check from public.users
    const { data: callerProfile, error: callerError } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (callerError || callerProfile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin privileges required' },
        { status: 403 }
      )
    }

    // 4. Parse request action
    const body = await req.json()
    const { action, targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 })
    }

    // Fetch target user profile
    const { data: targetProfile } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: 'Target admin user not found' }, { status: 404 })
    }

    // --- ACTION A: CHANGE PASSWORD ---
    if (action === 'change_password') {
      const { newPassword } = body
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        )
      }

      const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      })

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: `Password updated successfully for ${targetProfile.email}`,
      })
    }

    // --- ACTION B: TOGGLE ACTIVE / DEACTIVATE ---
    if (action === 'toggle_active') {
      const { is_active } = body // boolean: true to activate, false to deactivate

      if (targetUserId === callerUser.id && !is_active) {
        return NextResponse.json(
          { error: 'Self-deactivation error: You cannot deactivate your own Super Admin account' },
          { status: 400 }
        )
      }

      // Ban duration: '876600h' (100 years = deactivated/banned), 'none' = active
      const banDuration = is_active ? 'none' : '876600h'

      const { error: banErr } = await adminSupabase.auth.admin.updateUserById(targetUserId, {
        ban_duration: banDuration,
        user_metadata: { ...targetProfile, is_active },
      })

      if (banErr) {
        return NextResponse.json({ error: banErr.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: `User account ${targetProfile.email} is now ${is_active ? 'Active' : 'Deactivated'}`,
      })
    }

    // --- ACTION C: DELETE ADMIN ---
    if (action === 'delete_user') {
      // Safety Rule 1: Prevent self-deletion
      if (targetUserId === callerUser.id) {
        return NextResponse.json(
          { error: 'Self-deletion error: You cannot delete your own Super Admin account' },
          { status: 400 }
        )
      }

      // Safety Rule 2: Prevent deletion of last Super Admin
      if (targetProfile.role === 'super_admin') {
        const { count, error: countErr } = await adminSupabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'super_admin')

        if (!countErr && (count ?? 0) <= 1) {
          return NextResponse.json(
            { error: 'Protection rule: Cannot delete the last remaining Super Admin account' },
            { status: 400 }
          )
        }
      }

      // Delete public.users profile row first
      const { error: dbDeleteErr } = await adminSupabase
        .from('users')
        .delete()
        .eq('id', targetUserId)

      if (dbDeleteErr) {
        return NextResponse.json(
          { error: `Failed to remove user record: ${dbDeleteErr.message}` },
          { status: 500 }
        )
      }

      // Delete Auth user
      const { error: authDeleteErr } = await adminSupabase.auth.admin.deleteUser(targetUserId)

      if (authDeleteErr) {
        return NextResponse.json(
          { error: `Profile removed but auth deletion error: ${authDeleteErr.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Admin user ${targetProfile.email} deleted successfully`,
      })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
