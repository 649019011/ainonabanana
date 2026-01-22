import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config'
import { getOrCreateUserCredits, addCredits, getUserTransactions } from '@/lib/credits/db'

// 首次登录赠送的免费 credits 数量
const FREE_CREDITS_ON_SIGNUP = 10

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // 调试打印
  console.log('[Google Callback] === Google OAuth 回调开始 ===')
  console.log('[Google Callback] 请求 URL:', requestUrl.href)
  console.log('[Google Callback] 原始域名:', requestUrl.origin)
  console.log('[Google Callback] code 参数:', code ? '存在' : '不存在')
  console.log('[Google Callback] error 参数:', error)
  console.log('[Google Callback] error_description:', errorDescription)

  const nextParam = requestUrl.searchParams.get('next')
  const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : '/'
  const nextUrl = new URL(nextPath, requestUrl.origin)

  console.log('[Google Callback] next 参数:', nextParam)
  console.log('[Google Callback] next 路径:', nextPath)
  console.log('[Google Callback] 最终重定向 URL:', nextUrl.href)

  const response = NextResponse.redirect(nextUrl)

  // 处理 Google OAuth 错误（如 redirect_uri_mismatch）
  if (error) {
    console.error('[Google Callback] Google OAuth 返回错误:', error)
    console.error('[Google Callback] 错误描述:', errorDescription)

    const errorUrl = new URL('/', requestUrl.origin)
    errorUrl.searchParams.set('auth', 'google_error')
    errorUrl.searchParams.set('error', error)
    errorUrl.searchParams.set('message', errorDescription || 'Unknown error')
    return NextResponse.redirect(errorUrl)
  }

  if (!code) {
    console.error('[Google Callback] 缺少 code 参数')
    return response
  }

  // 检查 Supabase 是否已配置
  if (!isSupabaseConfigured()) {
    console.error('[Google Callback] Supabase 未配置')
    const errorUrl = new URL('/', requestUrl.origin)
    errorUrl.searchParams.set('auth', 'error')
    errorUrl.searchParams.set('message', 'Supabase is not configured')
    return NextResponse.redirect(errorUrl)
  }

  console.log('[Google Callback] 开始交换 code 为 session...')

  const cookieStore = await cookies()
  console.log('[Google Callback] 当前 Cookies 数量:', cookieStore.getAll().length)
  console.log('[Google Callback] 当前 Cookie 名称:', cookieStore.getAll().map(c => c.name))

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        console.log('[Google Callback] 设置 Cookies 数量:', cookiesToSet.length)
        console.log('[Google Callback] 设置的 Cookie:', cookiesToSet.map(c => ({
          name: c.name,
          value: c.value?.substring(0, 30) + '...',
          options: c.options
        })))
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        console.log('[Google Callback] Response Cookies 设置后:', response.cookies.getAll().map(c => c.name))
      },
    },
  })

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[Google Callback] 交换 code 失败:', exchangeError)
    console.error('[Google Callback] 错误消息:', exchangeError.message)
    const errorUrl = new URL('/', requestUrl.origin)
    errorUrl.searchParams.set('auth', 'error')
    errorUrl.searchParams.set('message', exchangeError.message)
    return NextResponse.redirect(errorUrl)
  }

  console.log('[Google Callback] Session 交换成功')
  console.log('[Google Callback] 用户 ID:', data.user?.id)
  console.log('[Google Callback] 用户邮箱:', data.user?.email)

  // 为新用户赠送免费 credits
  if (data.user?.id) {
    try {
      console.log('[Google Callback] 检查用户 credits...')
      const userCredits = await getOrCreateUserCredits(data.user.id)
      console.log('[Google Callback] 用户当前余额:', userCredits.balance)

      // 检查用户是否已经获得过注册赠送
      const transactions = await getUserTransactions(data.user.id, 10, 0)
      const hasReceivedSignupBonus = transactions.some(
        (t) => t.type === 'bonus' && t.metadata?.source === 'signup_bonus'
      )

      if (!hasReceivedSignupBonus) {
        console.log('[Google Callback] 用户未获得过注册赠送，赠送', FREE_CREDITS_ON_SIGNUP, '免费 credits')
        const addResult = await addCredits(
          data.user.id,
          FREE_CREDITS_ON_SIGNUP,
          'bonus',
          {
            description: '欢迎赠送 - 注册时获得',
            metadata: {
              source: 'signup_bonus',
              email: data.user.email,
            },
          }
        )

        if (addResult.success) {
          console.log('[Google Callback] 免费 credits 添加成功，余额:', addResult.balance)
        } else {
          console.error('[Google Callback] 免费 credits 添加失败:', addResult.error)
        }
      } else {
        console.log('[Google Callback] 用户已获得过注册赠送，跳过')
      }
    } catch (error) {
      // 不阻断登录流程，只记录错误
      console.error('[Google Callback] Credits 处理错误:', error)
    }
  }

  console.log('[Google Callback] === Google OAuth 回调结束 ===')

  // 返回已设置 cookies 的 response，而不是创建新的
  return response
}

