import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config'

export async function updateSupabaseSession(request: NextRequest) {
  // If Supabase is not configured, skip session update
  if (!isSupabaseConfigured()) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 调试打印
  if (process.env.NODE_ENV === 'development') {
    const cookies = request.cookies.getAll()
    console.log('[Middleware] 请求路径:', request.nextUrl.pathname)
    console.log('[Middleware] 请求 Cookies 数量:', cookies.length)
    console.log('[Middleware] 请求 Cookie 名称:', cookies.map(c => c.name))
  }

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        // 调试打印
        if (process.env.NODE_ENV === 'development') {
          console.log('[Middleware] 设置 Cookies:', cookiesToSet.map(c => ({ name: c.name, value: c.value?.substring(0, 20) })))
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Refreshes the auth token if needed.
  const { data } = await supabase.auth.getUser()

  // 调试打印
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware] 用户:', data.user ? `${data.user.id} - ${data.user.email}` : 'null')
  }

  return response
}

