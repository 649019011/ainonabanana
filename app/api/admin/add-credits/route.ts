/**
 * 临时管理 API：手动添加 credits
 *
 * 仅用于开发测试，生产环境请删除此文件
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
  try {
    // 创建 Supabase 客户端（使用 service_role key 会更好，但这里用 anon key）
    const supabase = createClient(
      supabaseUrl!,
      supabaseAnonKey!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 用户 ID
    const userId = '975cdbce-11c4-4c25-a393-1f0d1d8da902'
    const creditsToAdd = 10

    console.log('[Admin Add Credits] 开始为用户添加 credits...')
    console.log('[Admin Add Credits] 用户 ID:', userId)
    console.log('[Admin Add Credits] 添加数量:', creditsToAdd)

    // 调用数据库函数添加 credits
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: creditsToAdd,
      p_type: 'bonus',
      p_description: '手动充值 - 管理员添加',
      p_reference_id: null,
      p_metadata: { source: 'admin_manual', email: 'langshi1030@gmail.com' }
    })

    if (error) {
      console.error('[Admin Add Credits] 错误:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      })
    }

    console.log('[Admin Add Credits] 成功！返回数据:', data)

    // 获取当前余额
    const { data: creditsData } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single()

    return NextResponse.json({
      success: true,
      message: `成功为用户 langshi1030@gmail.com 添加 ${creditsToAdd} credits`,
      transaction: data,
      currentBalance: creditsData?.balance
    })
  } catch (error) {
    console.error('[Admin Add Credits] 异常:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
