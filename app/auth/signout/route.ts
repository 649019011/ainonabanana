import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config'

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const response = NextResponse.redirect(new URL('/', requestUrl.origin))

  // 如果 Supabase 未配置，直接返回重定向
  if (!isSupabaseConfigured()) {
    return response
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

  await supabase.auth.signOut()

  return response
}

export async function GET(request: NextRequest) {
  // Convenience for manual testing.
  return POST(request)
}

