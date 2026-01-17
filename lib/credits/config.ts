/**
 * Credits 系统配置
 */

/**
 * 每次图像生成消耗的 credits 数量
 */
export const CREDITS_PER_IMAGE = 2

/**
 * 交易类型
 */
export type TransactionType = 'purchase' | 'usage' | 'refund' | 'bonus'

/**
 * Credits 包 ID
 */
export type CreditsPackId = 'small' | 'medium' | 'large' | 'ultra'

/**
 * 用户 credits 余额
 */
export interface UserCredits {
  id: string
  user_id: string
  balance: number
  created_at: string
  updated_at: string
}

/**
 * Credits 交易记录
 */
export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  balance_after: number
  type: TransactionType
  reference_id: string | null
  description: string | null
  pack_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/**
 * Credits 包信息
 */
export interface CreditsPack {
  id: CreditsPackId
  name: string
  description: string
  credits: number
  price: number
  images: number
}

/**
 * 添加 credits 结果
 */
export interface AddCreditsResult {
  success: boolean
  transactionId?: string
  balance?: number
  error?: string
}

/**
 * 扣除 credits 结果
 */
export interface DeductCreditsResult {
  success: boolean
  transactionId?: string
  balance?: number
  error?: string
}
