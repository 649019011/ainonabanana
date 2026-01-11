import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  const nextParam = requestUrl.searchParams.get('next')
  const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : '/'
  const nextUrl = new URL(nextPath, requestUrl.origin)

  const response = NextResponse.redirect(nextUrl)

  if (!code) {
    return response
  }

  // 检查 Supabase 是否已配置
  if (!isSupabaseConfigured()) {
    const errorUrl = new URL('/', requestUrl.origin)
    errorUrl.searchParams.set('auth', 'error')
    errorUrl.searchParams.set('message', 'Supabase is not configured')
    return NextResponse.redirect(errorUrl)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const errorUrl = new URL('/', requestUrl.origin)
    errorUrl.searchParams.set('auth', 'error')
    errorUrl.searchParams.set('message', error.message)
    return NextResponse.redirect(errorUrl)
  }

  return response
}

