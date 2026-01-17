/**
 * PayPal 创建订单 API 路由
 *
 * POST /api/paypal/create-order - 创建一个新的 PayPal 订单
 */

import { NextRequest, NextResponse } from 'next/server'
import { isPayPalConfigured, getCreditsPackConfig, type CreditsPackId } from '@/lib/paypal/config'
import { createPayPalOrder, PayPalApiError } from '@/lib/paypal/client'

export async function POST(request: NextRequest) {
  let packId: CreditsPackId | string = ''
  let userId: string | undefined = undefined

  try {
    // 检查 PayPal 是否已配置
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: 'PayPal is not configured' },
        { status: 503 }
      )
    }

    // 解析请求体
    const body = await request.json().catch(() => ({}))
    ;({ packId, userId } = body)

    // 验证必需参数
    if (!packId) {
      return NextResponse.json(
        { error: 'Missing required parameter: packId' },
        { status: 400 }
      )
    }

    // 验证 packId 是否有效
    const validPackIds = ['small', 'medium', 'large', 'ultra']
    if (!validPackIds.includes(packId)) {
      return NextResponse.json(
        { error: `Invalid packId. Must be one of: ${validPackIds.join(', ')}` },
        { status: 400 }
      )
    }

    // 获取 credits 包配置
    const packConfig = getCreditsPackConfig(packId as CreditsPackId)

    // 构建 PayPal 订单请求
    const orderRequest = {
      intent: 'CAPTURE' as const,
      purchase_units: [
        {
          reference_id: `${packId}-${Date.now()}`,
          description: packConfig.description,
          custom_id: userId || '',
          amount: {
            currency_code: 'USD',
            value: packConfig.price.toFixed(2),
          },
        },
      ],
    }

    // 创建 PayPal 订单
    const orderResponse = await createPayPalOrder(orderRequest)

    // 返回订单 ID
    return NextResponse.json({
      success: true,
      orderId: orderResponse.id,
      packId,
      credits: packConfig.credits,
      amount: packConfig.price,
    })
  } catch (error) {
    console.error('PayPal order creation error:', {
      packId,
      userId,
      error,
      errorDetails: error instanceof PayPalApiError ? error.details : undefined,
    })

    if (error instanceof PayPalApiError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create PayPal order',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
