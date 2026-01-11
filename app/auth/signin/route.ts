import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
  // 检查 Supabase 是否已配置
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.' },
      { status: 503 }
    )
  }

  const requestUrl = new URL(request.url)
  const nextParam = requestUrl.searchParams.get('next')
  const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : '/'

  const redirectTo = new URL('/auth/callback', requestUrl.origin)
  redirectTo.searchParams.set('next', nextPath)

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo.toString(),
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(data.url)
}

