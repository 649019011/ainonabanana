/**
 * Creem Webhook API 路由
 *
 * POST /api/webhooks/creem - 处理 Creem 的 webhook 通知
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCreemApiKey } from '@/lib/creem/config'
import crypto from 'crypto'

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
    let webhookData
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
async function handleCheckoutCompleted(data: unknown): Promise<void> {
  console.log('Checkout completed:', data)
  // TODO: 根据你的业务逻辑处理支付完成后的操作
  // 例如：更新用户订阅状态、发送确认邮件等
}

/**
 * 处理 subscription.created 事件
 */
async function handleSubscriptionCreated(data: unknown): Promise<void> {
  console.log('Subscription created:', data)
  // TODO: 处理订阅创建
}

/**
 * 处理 subscription.cancelled 事件
 */
async function handleSubscriptionCancelled(data: unknown): Promise<void> {
  console.log('Subscription cancelled:', data)
  // TODO: 处理订阅取消
}

/**
 * 处理 order.paid 事件
 */
async function handleOrderPaid(data: unknown): Promise<void> {
  console.log('Order paid:', data)
  // TODO: 处理订单支付
}
