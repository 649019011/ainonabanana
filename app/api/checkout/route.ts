/**
 * Creem Checkout API 路由
 *
 * POST /api/checkout - 创建一个新的 Checkout Session
 */

import { NextRequest, NextResponse } from 'next/server'
import { isCreemConfigured, getCreemProductId } from '@/lib/creem/config'
import { createCheckoutSession, CreemApiError } from '@/lib/creem/client'

/**
 * 生成唯一的请求 ID
 */
function generateRequestId(): string {
  return `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

export async function POST(request: NextRequest) {
  let productId = ''
  let planId = ''
  let billingPeriod = ''
  let userEmail: string | undefined = undefined
  let metadata: Record<string, unknown> | undefined = undefined

  try {
    // 检查 Creem 是否已配置
    if (!isCreemConfigured()) {
      return NextResponse.json(
        { error: 'Payment service is not configured' },
        { status: 503 }
      )
    }

    // 解析请求体
    const body = await request.json().catch(() => ({}))
    ;({ planId, billingPeriod = 'yearly', userEmail, metadata } = body)

    // 验证必需参数
    if (!planId) {
      return NextResponse.json(
        { error: 'Missing required parameter: planId' },
        { status: 400 }
      )
    }

    if (billingPeriod !== 'monthly' && billingPeriod !== 'yearly') {
      return NextResponse.json(
        { error: 'Invalid billingPeriod. Must be "monthly" or "yearly"' },
        { status: 400 }
      )
    }

    // 获取对应的产品 ID
    productId = getCreemProductId(planId, billingPeriod)
    if (!productId) {
      return NextResponse.json(
        { error: `No product configured for plan: ${planId} (${billingPeriod})` },
        { status: 400 }
      )
    }

    // 构建 success_url（支付成功后的重定向 URL）
    const url = request.nextUrl
    const successUrl = `${url.protocol}//${url.host}/pricing?success=true&session={checkout_id}`

    // 创建 Checkout Session
    const checkoutResponse = await createCheckoutSession({
      product_id: productId,
      request_id: generateRequestId(),
      units: 1,
      customer: userEmail ? { email: userEmail } : undefined,
      success_url: successUrl,
      metadata: {
        planId,
        billingPeriod,
        ...metadata,
      },
    })

    // 返回 checkout URL
    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutResponse.checkout_url,
      checkoutId: checkoutResponse.id,
    })
  } catch (error) {
    console.error('Checkout creation error:', error)

    if (error instanceof CreemApiError) {
      // 如果是 403 错误，提供更友好的提示
      if (error.statusCode === 403) {
        return NextResponse.json(
          {
            error: '支付服务配置错误：产品 ID 无效。请在 Creem Dashboard 中创建产品并更新环境变量。',
            productId,
            planId,
            billingPeriod,
            details: error.details,
          },
          { status: 403 }
        )
      }

      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
