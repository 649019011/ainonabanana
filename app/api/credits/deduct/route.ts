/**
 * 扣除 Credits API
 *
 * POST /api/credits/deduct - 扣除用户 credits（用于图像生成等消耗）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserCredits, deductCredits } from '@/lib/credits/db'

export async function POST(request: NextRequest) {
  let userId = ''
  let amount = 0

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

    userId = user.id

    // 解析请求体
    const body = await request.json().catch(() => ({}))
    ;({ amount } = body)

    // 验证参数
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      )
    }

    // 获取当前余额（检查是否有足够余额）
    const credits = await getUserCredits(userId)
    if (!credits || credits.balance < amount) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          currentBalance: credits?.balance || 0,
          required: amount,
        },
        { status: 400 }
      )
    }

    // 扣除 credits
    const result = await deductCredits(
      userId,
      amount,
      {
        description: 'Image generation',
        metadata: {
          source: 'web',
        },
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to deduct credits' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      balance: result.balance,
      deducted: amount,
    })
  } catch (error) {
    console.error('Deduct credits error:', {
      userId,
      amount,
      error,
    })
    return NextResponse.json(
      {
        error: 'Failed to deduct credits',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
