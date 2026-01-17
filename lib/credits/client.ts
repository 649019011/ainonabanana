/**
 * Credits 客户端工具函数
 *
 * 用于前端调用 credits 相关 API
 */

import type { AddCreditsResult, DeductCreditsResult } from './config'

/**
 * 获取用户 credits 余额（客户端）
 *
 * @returns 用户 credits 余额
 */
export async function fetchUserBalance(): Promise<{
  success: boolean
  balance?: number
  error?: string
}> {
  try {
    const response = await fetch('/api/credits/balance')

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return {
        success: false,
        error: data.error || 'Failed to fetch balance',
      }
    }

    const data = await response.json()
    return {
      success: true,
      balance: data.balance,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 扣除 credits 用于图像生成（客户端）
 *
 * @param amount - 要扣除的 credits 数量
 * @returns 操作结果
 */
export async function deductCreditsForGeneration(amount: number): Promise<DeductCreditsResult> {
  try {
    const response = await fetch('/api/credits/deduct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return {
        success: false,
        error: data.error || 'Failed to deduct credits',
      }
    }

    const data = await response.json()
    return {
      success: data.success,
      transactionId: data.transactionId,
      balance: data.balance,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 获取用户交易历史（客户端）
 *
 * @param limit - 返回记录数量限制
 * @returns 交易记录列表
 */
export async function fetchUserTransactions(limit = 50): Promise<{
  success: boolean
  transactions?: Array<{
    id: string
    amount: number
    balanceAfter: number
    type: string
    description: string | null
    createdAt: string
  }>
  error?: string
}> {
  try {
    const response = await fetch(`/api/credits/transactions?limit=${limit}`)

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return {
        success: false,
        error: data.error || 'Failed to fetch transactions',
      }
    }

    const data = await response.json()
    return {
      success: true,
      transactions: data.transactions,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
