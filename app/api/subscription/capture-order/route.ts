/**
 * PayPal 订阅订单捕获 API 路由
 *
 * POST /api/subscription/capture-order - 捕获订阅订单支付并添加 credits
 */

import { NextRequest, NextResponse } from 'next/server'
import { isPayPalConfigured, getPayPalApiUrl } from '@/lib/paypal/config'
import { addCredits } from '@/lib/credits/db'
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId, type BillingCycle } from '@/lib/subscription/config'

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
 * 捕获 PayPal 订单支付
 */
async function capturePayPalOrder(orderId: string): Promise<{
  id: string
  status: string
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string
        status: string
        amount: {
          currency_code: string
          value: string
        }
      }>
    }
    custom_id: string
    reference_id: string
  }>
}> {
  const apiUrl = getPayPalApiUrl()

  try {
    const accessToken = await getAccessToken()

    const response = await fetch(`${apiUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message =
        (data as { message?: string }).message ||
        (data as { error?: string }).error ||
        `PayPal API error: ${response.status}`
      throw new PayPalApiError(message, response.status, data)
    }

    return data as any
  } catch (error) {
    if (error instanceof PayPalApiError) {
      throw error
    }
    throw new PayPalApiError(
      error instanceof Error ? error.message : 'Failed to capture PayPal order'
    )
  }
}

export async function POST(request: NextRequest) {
  let orderId = ''
  let planId = ''
  let billingCycle = ''

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
    ;({ orderId, planId, billingCycle } = body)

    console.log('Subscription capture-order request:', { orderId, planId, billingCycle })

    // 验证必需参数
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required parameter: orderId' },
        { status: 400 }
      )
    }

    if (!planId || !billingCycle) {
      return NextResponse.json(
        { error: 'Missing required parameters: planId or billingCycle' },
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

    // 从 capture.custom_id 中解析用户信息
    let userId = ''
    try {
      const customData = JSON.parse(capture.custom_id || '{}')
      userId = customData.userId
    } catch (e) {
      // 如果无法解析 custom_id，记录错误
      console.error('Failed to parse custom_id:', e)
    }

    if (!userId) {
      console.error('No userId found in order. Full purchase_units:', captureResponse.purchase_units[0])
      return NextResponse.json(
        { error: 'No user ID found in order' },
        { status: 400 }
      )
    }

    // 验证 planId 和 billingCycle
    const validPlanIds = ['basic', 'pro', 'max']
    if (!validPlanIds.includes(planId)) {
      return NextResponse.json(
        { error: `Invalid planId: ${planId}` },
        { status: 400 }
      )
    }

    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return NextResponse.json(
        { error: `Invalid billingCycle: ${billingCycle}` },
        { status: 400 }
      )
    }

    // 获取订阅套餐配置
    const plan = SUBSCRIPTION_PLANS[planId as SubscriptionPlanId]
    const credits = billingCycle === 'monthly' ? plan.monthly.credits : plan.yearly.credits

    // 添加 credits 到用户账户
    const creditsResult = await addCredits(
      userId,
      credits,
      'purchase',
      {
        referenceId: captureResponse.id,
        description: `Subscribed to ${plan.name} Plan (${billingCycle})`,
        metadata: {
          type: 'subscription',
          planId,
          billingCycle,
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
      planId,
      billingCycle,
      userId,
      credits,
      newBalance: creditsResult.balance,
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
      status: capture.status,
    })
  } catch (error) {
    console.error('Subscription order capture error:', {
      orderId,
      planId,
      billingCycle,
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
        error: 'Failed to capture subscription order',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
