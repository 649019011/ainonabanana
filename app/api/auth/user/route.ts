import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export async function GET() {
  // 如果 Supabase 未配置，返回 null
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ user: null })
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ user: null })
  }

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({ user })
}
