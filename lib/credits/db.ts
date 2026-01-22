/**
 * Credits 数据库操作函数
 *
 * 用于与 Supabase 数据库交互，管理用户 credits 余额和交易记录
 */

import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabaseUrl, supabaseServiceRoleKey } from '@/lib/supabase/config'
import type {
  UserCredits,
  CreditTransaction,
  AddCreditsResult,
  DeductCreditsResult,
  TransactionType,
} from './config'

/**
 * 创建直接数据库客户端（用于 RPC 调用）
 * 使用 service_role key 以绕过 RLS 限制，确保服务端操作正常
 */
function createDirectDbClient() {
  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase is not configured. Missing SUPABASE_SERVICE_ROLE_KEY.')
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * 获取用户 credits 余额
 *
 * @param userId - 用户 ID
 * @returns 用户 credits 余额，如果用户没有记录则返回 null
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const supabase = createDirectDbClient()

  const { data, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // 如果用户没有记录，返回 null
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data
}

/**
 * 获取用户 credits 余额（如果不存在则创建）
 *
 * @param userId - 用户 ID
 * @returns 用户 credits 余额
 */
export async function getOrCreateUserCredits(userId: string): Promise<UserCredits> {
  const supabase = createDirectDbClient()

  // 首先尝试获取现有记录
  const existing = await getUserCredits(userId)
  if (existing) {
    return existing
  }

  // 如果不存在，创建新记录
  const { data, error } = await supabase
    .from('user_credits')
    .insert({ user_id: userId, balance: 0 })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * 为用户添加 credits（充值）
 *
 * 使用 Supabase RPC 调用数据库函数，确保原子性操作
 *
 * @param userId - 用户 ID
 * @param amount - 要添加的 credits 数量
 * @param type - 交易类型
 * @param options - 可选参数
 * @returns 操作结果
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: TransactionType,
  options?: {
    referenceId?: string
    description?: string
    packId?: string
    metadata?: Record<string, unknown>
  }
): Promise<AddCreditsResult> {
  const supabase = createDirectDbClient()

  try {
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_reference_id: options?.referenceId || null,
      p_description: options?.description || null,
      p_pack_id: options?.packId || null,
      p_metadata: options?.metadata || {},
    })

    if (error) {
      console.error('addCredits RPC error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    // RPC 返回的是一个表格，第一行包含结果
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    return {
      success: true,
      transactionId: result?.id,
      balance: result?.balance,
    }
  } catch (error) {
    console.error('addCredits error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 扣除用户 credits（消耗）
 *
 * 使用 Supabase RPC 调用数据库函数，确保原子性操作
 *
 * @param userId - 用户 ID
 * @param amount - 要扣除的 credits 数量
 * @param options - 可选参数
 * @returns 操作结果
 */
export async function deductCredits(
  userId: string,
  amount: number,
  options?: {
    description?: string
    metadata?: Record<string, unknown>
  }
): Promise<DeductCreditsResult> {
  const supabase = createDirectDbClient()

  try {
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_description: options?.description || null,
      p_metadata: options?.metadata || {},
    })

    if (error) {
      console.error('deductCredits RPC error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    // RPC 返回的是一个表格，第一行包含结果
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    return {
      success: true,
      transactionId: result?.id,
      balance: result?.balance,
    }
  } catch (error) {
    console.error('deductCredits error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 获取用户交易历史
 *
 * @param userId - 用户 ID
 * @param limit - 返回记录数量限制
 * @param offset - 偏移量
 * @returns 交易记录列表
 */
export async function getUserTransactions(
  userId: string,
  limit = 50,
  offset = 0
): Promise<CreditTransaction[]> {
  const supabase = createDirectDbClient()

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw error
  }

  return data || []
}

/**
 * 获取用户交易统计
 *
 * @param userId - 用户 ID
 * @returns 统计信息
 */
export async function getUserTransactionStats(userId: string): Promise<{
  totalPurchased: number
  totalUsed: number
  transactionCount: number
}> {
  const supabase = createDirectDbClient()

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('amount')
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  const transactions = data || []
  const totalPurchased = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
  const totalUsed = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return {
    totalPurchased,
    totalUsed,
    transactionCount: transactions.length,
  }
}
