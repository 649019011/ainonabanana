/**
 * 获取用户交易历史 API
 *
 * GET /api/credits/transactions - 获取当前登录用户的交易历史
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserTransactions } from '@/lib/credits/db'

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

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 获取交易历史
    const transactions = await getUserTransactions(user.id, limit, offset)

    return NextResponse.json({
      success: true,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        balanceAfter: t.balance_after,
        type: t.type,
        description: t.description,
        packId: t.pack_id,
        createdAt: t.created_at,
      })),
      count: transactions.length,
    })
  } catch (error) {
    console.error('Get transactions error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
