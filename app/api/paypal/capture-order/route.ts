/**
 * PayPal 捕获订单 API 路由
 *
 * POST /api/paypal/capture-order - 捕获（完成）PayPal 订单支付并添加 credits
 */

import { NextRequest, NextResponse } from 'next/server'
import { isPayPalConfigured, getCreditsPackConfig } from '@/lib/paypal/config'
import { capturePayPalOrder, PayPalApiError } from '@/lib/paypal/client'
import { addCredits } from '@/lib/credits/db'

export async function POST(request: NextRequest) {
  let orderId = ''
  let userId = ''
  let packId = ''

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
    ;({ orderId } = body)

    console.log('PayPal capture-order request:', { orderId, body })

    // 验证必需参数
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required parameter: orderId' },
        { status: 400 }
      )
    }

    // 捕获 PayPal 订单
    const captureResponse = await capturePayPalOrder(orderId)

    console.log('PayPal capture-order response:', JSON.stringify(captureResponse, null, 2))

    // 检查捕获状态
    if (captureResponse.status !== 'COMPLETED') {
      return NextResponse.json(
        {
          error: 'Payment not completed',
          status: captureResponse.status,
        },
        { status: 400 }
      )
    }

    // 提取支付信息
    const capture = captureResponse.purchase_units[0]?.payments?.captures?.[0]
    if (!capture) {
      return NextResponse.json(
        { error: 'No capture data found' },
        { status: 400 }
      )
    }

    // 从 custom_id 中获取用户 ID
    // 注意：custom_id 可能在两个位置：
    // 1. purchase_units[0].custom_id (我们设置的位置)
    // 2. purchase_units[0].payments.captures[0].custom_id (PayPal 可能返回的位置)
    userId = captureResponse.purchase_units[0]?.custom_id ||
             captureResponse.purchase_units[0]?.payments?.captures?.[0]?.custom_id || ''

    const referenceId = captureResponse.purchase_units[0]?.reference_id || ''
    packId = referenceId.split('-')[0]

    console.log('Extracted from order:', { userId, referenceId, packId })

    // 验证用户 ID
    if (!userId) {
      console.error('No userId found in order. Full purchase_units:', captureResponse.purchase_units[0])
      return NextResponse.json(
        { error: 'No user ID found in order' },
        { status: 400 }
      )
    }

    // 验证 packId
    const validPackIds = ['small', 'medium', 'large', 'ultra']
    if (!validPackIds.includes(packId)) {
      return NextResponse.json(
        { error: `Invalid packId: ${packId}` },
        { status: 400 }
      )
    }

    // 获取 credits 包配置
    const packConfig = getCreditsPackConfig(packId as any)

    // 添加 credits 到用户账户
    const creditsResult = await addCredits(
      userId,
      packConfig.credits,
      'purchase',
      {
        referenceId: captureResponse.id,
        description: `Purchased ${packConfig.name}`,
        packId,
        metadata: {
          paypalOrderId: captureResponse.id,
          paypalCaptureId: capture.id,
          amount: capture.amount.value,
          currency: capture.amount.currency_code,
        },
      }
    )

    if (!creditsResult.success) {
      console.error('Failed to add credits:', creditsResult.error)
      return NextResponse.json(
        { error: 'Payment successful but failed to add credits. Please contact support.' },
        { status: 500 }
      )
    }

    // 返回支付成功信息
    return NextResponse.json({
      success: true,
      orderId: captureResponse.id,
      captureId: capture.id,
      packId,
      userId,
      credits: packConfig.credits,
      newBalance: creditsResult.balance,
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
      status: capture.status,
    })
  } catch (error) {
    console.error('PayPal order capture error:', {
      orderId,
      userId,
      packId,
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
        error: 'Failed to capture PayPal order',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
