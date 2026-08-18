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

    // 2. Initialize Server-Only Admin Supabase client
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // 3. Authoritative server-side role check from public.users
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (userError || userData?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin privileges required' },
        { status: 403 }
      )
    }

    // 3. Parse request payload
    const body = await req.json()
    const { name, email, password } = body

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password is required and must be at least 6 characters' },
        { status: 400 }
      )
    }

    // 5. Create new auth user via Auth Admin API
    const { data: newAuthUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: name ? name.trim() : null },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (!newAuthUser.user) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
    }

    // 6. Ensure public.users entry with role = 'admin' (always regular admin)
    const { error: dbError } = await adminSupabase.from('users').upsert({
      id: newAuthUser.user.id,
      name: name ? name.trim() : null,
      email: email.trim().toLowerCase(),
      role: 'admin',
    })

    if (dbError) {
      return NextResponse.json(
        { error: `Auth created but failed to record user row: ${dbError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newAuthUser.user.id,
        email: newAuthUser.user.email,
        name: name ? name.trim() : null,
        role: 'admin',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
