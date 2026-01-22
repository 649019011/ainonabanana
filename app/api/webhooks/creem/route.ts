/**
 * Creem Webhook API 路由
 *
 * POST /api/webhooks/creem - 处理 Creem 的 webhook 通知
 */

import { NextRequest, NextResponse } from 'next/server'
import { addCredits } from '@/lib/credits/db'
import crypto from 'crypto'

/**
 * Creem Webhook 事件数据结构
 */
interface CreemWebhookData {
  checkout?: {
    id: string
    product: string
    metadata?: Record<string, string | number>
    customer?: string
  }
  subscription?: {
    id: string
    product: string
    status: string
    metadata?: Record<string, string | number>
    customer?: string
  }
  order?: {
    id: string
    amount: number
    product: string
    metadata?: Record<string, string | number>
  }
}

/**
 * 计划 credits 配置
 */
const PLAN_CREDITS: Record<string, { monthly: number; yearly: number }> = {
  basic: { monthly: 150, yearly: 1800 },
  pro: { monthly: 800, yearly: 9600 },
  max: { monthly: 4600, yearly: 55200 },
}

/**
 * 从产品 ID 或 metadata 中提取计划信息
 */
function extractPlanInfo(metadata?: Record<string, string | number>): {
  planId: string
  billingPeriod: 'monthly' | 'yearly'
} | null {
  if (!metadata) return null

  const planId = metadata.planId as string
  const billingPeriod = metadata.billingPeriod as 'monthly' | 'yearly'

  if (planId && (billingPeriod === 'monthly' || billingPeriod === 'yearly')) {
    return { planId, billingPeriod }
  }

  return null
}

/**
 * 验证 Webhook 签名
 *
 * Creem 会发送签名验证请求的真实性
 * 你需要在 Creem Dashboard 中配置 webhook 密钥
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

export async function POST(request: NextRequest) {
  try {
    // 获取原始请求体
    const rawBody = await request.text()

    // 获取签名头
    const signature = request.headers.get('x-creem-signature')
    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET

    // 如果配置了 webhook 密钥，则验证签名
    if (webhookSecret) {
      if (!signature) {
        console.error('Webhook signature missing')
        return NextResponse.json(
          { error: 'Signature missing' },
          { status: 401 }
        )
      }

      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.error('Webhook signature verification failed')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    // 解析 webhook 数据
    let webhookData: { event: string; data: CreemWebhookData }
    try {
      webhookData = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const { event, data } = webhookData

    // 处理不同类型的 webhook 事件
    switch (event) {
      case 'checkout.completed':
        // 支付完成
        await handleCheckoutCompleted(data)
        break

      case 'subscription.created':
        // 订阅创建
        await handleSubscriptionCreated(data)
        break

      case 'subscription.cancelled':
        // 订阅取消
        await handleSubscriptionCancelled(data)
        break

      case 'order.paid':
        // 订单支付成功
        await handleOrderPaid(data)
        break

      default:
        console.log(`Unhandled webhook event: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * 处理 checkout.completed 事件
 */
async function handleCheckoutCompleted(data: CreemWebhookData): Promise<void> {
  console.log('Checkout completed:', data)

  const checkout = data.checkout
  if (!checkout) return

  const planInfo = extractPlanInfo(checkout.metadata)
  if (!planInfo) {
    console.warn('No plan info found in checkout metadata')
    return
  }

  const userId = checkout.metadata?.userId as string
  if (!userId) {
    console.warn('No userId found in checkout metadata')
    return
  }

  // 计算要添加的 credits
  const creditsConfig = PLAN_CREDITS[planInfo.planId]
  if (!creditsConfig) {
    console.warn(`Unknown plan ID: ${planInfo.planId}`)
    return
  }

  const creditsToAdd = creditsConfig[planInfo.billingPeriod]

  // 添加 credits
  const result = await addCredits(userId, creditsToAdd, 'purchase', {
    referenceId: checkout.id,
    description: `${planInfo.planId} plan (${planInfo.billingPeriod})`,
    packId: `${planInfo.planId}_${planInfo.billingPeriod}`,
    metadata: {
      planId: planInfo.planId,
      billingPeriod: planInfo.billingPeriod,
      checkoutId: checkout.id,
    },
  })

  if (result.success) {
    console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`)
  } else {
    console.error(`Failed to add credits: ${result.error}`)
  }
}

/**
 * 处理 subscription.created 事件
 */
async function handleSubscriptionCreated(data: CreemWebhookData): Promise<void> {
  console.log('Subscription created:', data)
  // 订阅创建时不需要添加 credits，会在 order.paid 或 checkout.completed 时添加
}

/**
 * 处理 subscription.cancelled 事件
 */
async function handleSubscriptionCancelled(data: CreemWebhookData): Promise<void> {
  console.log('Subscription cancelled:', data)
  // TODO: 处理订阅取消，例如降低用户权限、发送通知等
}

/**
 * 处理 order.paid 事件
 */
async function handleOrderPaid(data: CreemWebhookData): Promise<void> {
  console.log('Order paid:', data)

  const order = data.order
  if (!order) return

  const planInfo = extractPlanInfo(order.metadata)
  if (!planInfo) {
    console.warn('No plan info found in order metadata')
    return
  }

  const userId = order.metadata?.userId as string
  if (!userId) {
    console.warn('No userId found in order metadata')
    return
  }

  // 计算要添加的 credits
  const creditsConfig = PLAN_CREDITS[planInfo.planId]
  if (!creditsConfig) {
    console.warn(`Unknown plan ID: ${planInfo.planId}`)
    return
  }

  const creditsToAdd = creditsConfig[planInfo.billingPeriod]

  // 添加 credits
  const result = await addCredits(userId, creditsToAdd, 'purchase', {
    referenceId: order.id,
    description: `${planInfo.planId} plan (${planInfo.billingPeriod})`,
    packId: `${planInfo.planId}_${planInfo.billingPeriod}`,
    metadata: {
      planId: planInfo.planId,
      billingPeriod: planInfo.billingPeriod,
      orderId: order.id,
    },
  })

  if (result.success) {
    console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`)
  } else {
    console.error(`Failed to add credits: ${result.error}`)
  }
}
