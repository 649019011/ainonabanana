/**
 * 获取用户 Credits 余额 API
 *
 * GET /api/credits/balance - 获取当前登录用户的 credits 余额
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOrCreateUserCredits } from '@/lib/credits/db'

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 获取用户 credits 余额
    const credits = await getOrCreateUserCredits(user.id)

    return NextResponse.json({
      success: true,
      balance: credits.balance,
      userId: user.id,
    })
  } catch (error) {
    console.error('Get balance error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get balance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
