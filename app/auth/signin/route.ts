import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
  // 检查 Supabase 是否已配置
  if (!isSupabaseConfigured()) {
    console.error('[Google Signin] Supabase is not configured')
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

  // 调试打印
  console.log('[Google Signin] === Google OAuth 登录开始 ===')
  console.log('[Google Signin] 请求 URL:', requestUrl.href)
  console.log('[Google Signin] 原始域名:', requestUrl.origin)
  console.log('[Google Signin] next 参数:', nextParam)
  console.log('[Google Signin] next 路径:', nextPath)
  console.log('[Google Signin] 完整的 redirectTo:', redirectTo.toString())
  console.log('[Google Signin] Supabase URL:', supabaseUrl)

  const cookieStore = await cookies()

  // 创建一个临时的 redirect response，用于捕获 cookies
  let oauthUrl = ''
  const response = NextResponse.redirect(new URL(request.url))

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        console.log('[Google Signin] 设置 Cookies 数量:', cookiesToSet.length)
        console.log('[Google Signin] 设置的 Cookie:', cookiesToSet.map(c => ({ name: c.name, value: c.value?.substring(0, 30) })))
        // 将 cookies 设置到 response 中
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo.toString(),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    console.error('[Google Signin] OAuth 错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  oauthUrl = data.url

  // 调试打印：解析 Google OAuth URL 中的 redirect_uri 参数
  const googleOAuthUrl = new URL(oauthUrl)
  const redirectUri = googleOAuthUrl.searchParams.get('redirect_uri')
  console.log('[Google Signin] Google OAuth URL:', oauthUrl)
  console.log('[Google Signin] Google redirect_uri 参数:', redirectUri)
  console.log('[Google Signin] Response Cookies 数量:', response.cookies.getAll().length)
  console.log('[Google Signin] === Google OAuth 登录结束，重定向到 Google ===')

  // 直接修改 response 的 Location header，保留已设置的 cookies
  response.headers.set('Location', oauthUrl)

  return response
}

