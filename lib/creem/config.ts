/**
 * Creem 支付配置
 *
 * 从环境变量读取 Creem API 密钥
 */

const CREEM_API_KEY = process.env.CREEM_API_KEY || ''
const CREEM_API_URL = process.env.CREEM_API_URL || 'https://api.creem.io/v1'

/**
 * 检查 Creem 是否已配置
 */
export function isCreemConfigured(): boolean {
  return !!CREEM_API_KEY
}

/**
 * 获取 Creem API 密钥
 */
export function getCreemApiKey(): string {
  return CREEM_API_KEY
}

/**
 * 获取 Creem API 基础 URL
 */
export function getCreemApiUrl(): string {
  return CREEM_API_URL
}

/**
 * 产品 ID 映射
 *
 * 在 Creem Dashboard 中创建产品后，将产品 ID 更新到此处
 */
export const CREEM_PRODUCT_IDS = {
  basic_monthly: process.env.CREEM_PRODUCT_BASIC_MONTHLY || 'prod_basic_monthly',
  basic_yearly: process.env.CREEM_PRODUCT_BASIC_YEARLY || 'prod_basic_yearly',
  pro_monthly: process.env.CREEM_PRODUCT_PRO_MONTHLY || 'prod_pro_monthly',
  pro_yearly: process.env.CREEM_PRODUCT_PRO_YEARLY || 'prod_pro_yearly',
  max_monthly: process.env.CREEM_PRODUCT_MAX_MONTHLY || 'prod_max_monthly',
  max_yearly: process.env.CREEM_PRODUCT_MAX_YEARLY || 'prod_max_yearly',
} as const

/**
 * 根据计划 ID 和计费周期获取 Creem 产品 ID
 */
export function getCreemProductId(planId: string, billingPeriod: 'monthly' | 'yearly'): string {
  const key = `${planId}_${billingPeriod}` as const
  return CREEM_PRODUCT_IDS[key] || ''
}

/**
 * Creem Checkout 创建请求接口
 */
export interface CreateCheckoutRequest {
  product_id: string
  request_id?: string
  units?: number
  discount_code?: string
  customer?: {
    id?: string
    email?: string
  }
  custom_field?: Array<{
    type: 'text' | 'checkbox'
    key: string
    label: string
    optional?: boolean
    text?: {
      max_length?: number
      min_length?: number
    }
    checkbox?: {
      label?: string
    }
  }>
  success_url?: string
  metadata?: Record<string, string | number>
}

/**
 * Creem Checkout 响应接口
 */
export interface CreemCheckoutResponse {
  id: string
  mode: 'test' | 'prod' | 'sandbox'
  object: string
  status: 'pending' | 'processing' | 'completed' | 'expired'
  product: string
  request_id?: string
  units: number
  checkout_url: string
  success_url?: string
  order?: {
    id: string
    amount: number
    currency: string
    status: string
    type: 'recurring' | 'onetime'
  }
  subscription?: string
  customer?: string
  metadata?: Record<string, string | number>
}
