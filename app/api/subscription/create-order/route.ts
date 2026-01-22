/**
 * PayPal 订阅订单创建 API 路由
 *
 * POST /api/subscription/create-order - 创建一个新的 PayPal 订阅订单
 */

import { NextRequest, NextResponse } from 'next/server'
import { isPayPalConfigured, getPayPalApiUrl } from '@/lib/paypal/config'
import { SUBSCRIPTION_PLANS, getPlanPrice, getPlanCredits, type SubscriptionPlanId, type BillingCycle } from '@/lib/subscription/config'

/**
 * PayPal API 错误类
 */
class PayPalApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'PayPalApiError'
  }
}

/**
 * 获取 PayPal Access Token
 */
async function getAccessToken(): Promise<string> {
  const apiUrl = getPayPalApiUrl()
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new PayPalApiError('PayPal credentials are not configured')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  try {
    const response = await fetch(`${apiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new PayPalApiError(
        `Failed to get access token: ${response.status}`,
        response.status,
        data
      )
    }

    return (data as { access_token: string }).access_token
  } catch (error) {
    if (error instanceof PayPalApiError) {
      throw error
    }
    throw new PayPalApiError(
      error instanceof Error ? error.message : 'Failed to get access token'
    )
  }
}

/**
 * 创建 PayPal 订阅订单
 *
 * 使用 PayPal Orders API 创建一次性订单来处理订阅
 */
async function createSubscriptionOrder(
  planId: SubscriptionPlanId,
  billingCycle: BillingCycle,
  userId: string
): Promise<{ id: string; approveUrl: string }> {
  const apiUrl = getPayPalApiUrl()
  const plan = SUBSCRIPTION_PLANS[planId]
  const price = billingCycle === 'monthly' ? plan.monthly.price : plan.yearly.price
  const credits = billingCycle === 'monthly' ? plan.monthly.credits : plan.yearly.credits

  const accessToken = await getAccessToken()

  // 构建订单描述
  const description = `${plan.name} Plan (${billingCycle}) - ${credits} credits`

  // 构建返回 URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const returnUrl = `${appUrl}/subscription/return`
  const cancelUrl = `${appUrl}/subscription-pricing`

  try {
    const response = await fetch(`${apiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: `${planId}-${billingCycle}-${Date.now()}`,
            description,
            custom_id: JSON.stringify({ userId, planId, billingCycle }),
            amount: {
              currency_code: 'USD',
              value: price.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: 'Nano Banana',
          user_action: 'PAY_NOW',
          landing_page: 'BILLING',
        },
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message =
        (data as { message?: string }).message ||
        (data as { error?: string }).error ||
        `PayPal API error: ${response.status}`
      throw new PayPalApiError(message, response.status, data)
    }

    const order = data as { id: string; links: Array<{ rel: string; href: string; method: string }> }

    // 查找批准链接
    const approveLink = order.links.find((link) => link.rel === 'approve')
    if (!approveLink) {
      throw new Error('No approve link found in PayPal order response')
    }

    return {
      id: order.id,
      approveUrl: approveLink.href,
    }
  } catch (error) {
    if (error instanceof PayPalApiError) {
      throw error
    }
    throw new PayPalApiError(
      error instanceof Error ? error.message : 'Failed to create PayPal order'
    )
  }
}

export async function POST(request: NextRequest) {
  let planId: SubscriptionPlanId | string = ''
  let billingCycle: BillingCycle | string = 'yearly'
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
    ;({ planId, billingCycle = 'yearly', userId } = body)

    console.log('Subscription create-order request:', { planId, billingCycle, userId })

    // 验证必需参数
    if (!planId) {
      return NextResponse.json(
        { error: 'Missing required parameter: planId' },
        { status: 400 }
      )
    }

    // 验证用户 ID
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId. Please login first.' },
        { status: 401 }
      )
    }

    // 验证 planId 是否有效
    const validPlanIds = ['basic', 'pro', 'max']
    if (!validPlanIds.includes(planId)) {
      return NextResponse.json(
        { error: `Invalid planId. Must be one of: ${validPlanIds.join(', ')}` },
        { status: 400 }
      )
    }

    // 验证 billingCycle
    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return NextResponse.json(
        { error: 'Invalid billingCycle. Must be "monthly" or "yearly"' },
        { status: 400 }
      )
    }

    // 创建 PayPal 订单
    const order = await createSubscriptionOrder(planId as SubscriptionPlanId, billingCycle as BillingCycle, userId)

    // 返回订单 ID 和批准链接
    return NextResponse.json({
      success: true,
      orderId: order.id,
      approveUrl: order.approveUrl,
      planId,
      billingCycle,
      price: getPlanPrice(planId as SubscriptionPlanId, billingCycle as BillingCycle),
      credits: getPlanCredits(planId as SubscriptionPlanId, billingCycle as BillingCycle),
    })
  } catch (error) {
    console.error('Subscription order creation error:', {
      planId,
      billingCycle,
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
        error: 'Failed to create subscription order',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
