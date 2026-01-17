/**
 * PayPal 支付配置
 *
 * 从环境变量读取 PayPal API 密钥
 */

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || ''
const PAYPAL_MODE = (process.env.PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live'

/**
 * 检查 PayPal 是否已配置
 */
export function isPayPalConfigured(): boolean {
  return !!PAYPAL_CLIENT_ID && !!PAYPAL_CLIENT_SECRET
}

/**
 * 获取 PayPal Client ID（前端使用）
 */
export function getPayPalClientId(): string {
  return PAYPAL_CLIENT_ID
}

/**
 * 获取 PayPal Client Secret（后端使用）
 */
export function getPayPalClientSecret(): string {
  return PAYPAL_CLIENT_SECRET
}

/**
 * 获取 PayPal 模式（sandbox 或 live）
 */
export function getPayPalMode(): 'sandbox' | 'live' {
  return PAYPAL_MODE
}

/**
 * 获取 PayPal API 基础 URL
 */
export function getPayPalApiUrl(): string {
  return PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

/**
 * Credits 包配置
 *
 * 定义不同的 credits 包及其价格
 */
export const PAYPAL_CREDITS_PACKS = {
  small: {
    name: 'Starter Pack',
    credits: 500,
    price: 9.99,
    description: '500 credits - 约 250 张图片',
  },
  medium: {
    name: 'Standard Pack',
    credits: 2000,
    price: 29.99,
    description: '2000 credits - 约 1000 张图片',
  },
  large: {
    name: 'Pro Pack',
    credits: 10000,
    price: 99.99,
    description: '10000 credits - 约 5000 张图片',
  },
  ultra: {
    name: 'Ultimate Pack',
    credits: 50000,
    price: 399.99,
    description: '50000 credits - 约 25000 张图片',
  },
} as const

export type CreditsPackId = keyof typeof PAYPAL_CREDITS_PACKS

/**
 * 根据 pack ID 获取 credits 包配置
 */
export function getCreditsPackConfig(packId: CreditsPackId) {
  return PAYPAL_CREDITS_PACKS[packId]
}

/**
 * PayPal 订单创建请求接口
 */
export interface CreatePayPalOrderRequest {
  intent: 'CAPTURE' | 'AUTHORIZE'
  purchase_units: Array<{
    reference_id?: string
    description?: string
    amount: {
      currency_code: string
      value: string
    }
    custom_id?: string
  }>
}

/**
 * PayPal 订单响应接口
 */
export interface PayPalOrderResponse {
  id: string
  status: 'CREATED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'SAVED' | 'PAYER_ACTION_REQUIRED'
  links: Array<{
    href: string
    rel: string
    method: string
  }>
  create_time: string
  update_time: string
}

/**
 * PayPal 捕获支付响应接口
 */
export interface PayPalCaptureResponse {
  id: string
  status: 'COMPLETED' | 'PENDING' | 'DECLINED'
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
    reference_id: string
  }>
}
