import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export async function GET() {
  // 调试打印
  console.log('[API /api/auth/user] === 开始获取用户信息 ===')

  // 如果 Supabase 未配置，返回 null
  if (!isSupabaseConfigured()) {
    console.log('[API /api/auth/user] Supabase 未配置')
    return NextResponse.json({ user: null })
  }

  const cookieStore = await cookies()
  console.log('[API /api/auth/user] Cookies 数量:', cookieStore.getAll().length)
  console.log('[API /api/auth/user] 所有 Cookies:', cookieStore.getAll().map(c => ({ name: c.name, value: c.value?.substring(0, 20) + '...' })))

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('[API /api/auth/user] 获取用户失败:', error)
    return NextResponse.json({ user: null })
  }

  console.log('[API /api/auth/user] 用户:', user ? `${user.id} - ${user.email}` : 'null')
  console.log('[API /api/auth/user] === 获取用户信息结束 ===')

  return NextResponse.json({ user })
}
