import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config'

// For Server Components: cookies are read-only, so avoid writing in `setAll.
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured: missing SUPABASE_URL or SUPABASE_ANON_KEY')
  }

  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  // 调试打印 - 只在开发环境打印
  if (process.env.NODE_ENV === 'development') {
    console.log('[Supabase Server Client] Cookies 数量:', allCookies.length)
    console.log('[Supabase Server Client] Cookie 名称:', allCookies.map(c => c.name))
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => allCookies,
      setAll: () => {},
    },
  })
}

