/**
 * Creem API 客户端
 *
 * 用于与 Creem 支付平台进行交互
 */

import {
  getCreemApiKey,
  getCreemApiUrl,
  type CreateCheckoutRequest,
  type CreemCheckoutResponse,
} from './config'

/**
 * Creem API 错误类
 */
export class CreemApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'CreemApiError'
  }
}

/**
 * 创建 Creem Checkout Session
 *
 * @param request - Checkout 创建请求参数
 * @returns Checkout URL 和相关信息
 * @throws CreemApiError 如果 API 调用失败
 */
export async function createCheckoutSession(
  request: CreateCheckoutRequest
): Promise<CreemCheckoutResponse> {
  const apiKey = getCreemApiKey()

  if (!apiKey) {
    throw new CreemApiError('Creem API key is not configured')
  }

  const apiUrl = getCreemApiUrl()

  try {
    const response = await fetch(`${apiUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(request),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message =
        (data as { error?: string }).error ||
        (data as { message?: string }).message ||
        `Creem API error: ${response.status}`
      throw new CreemApiError(message, response.status, data)
    }

    return data as CreemCheckoutResponse
  } catch (error) {
    if (error instanceof CreemApiError) {
      throw error
    }

    // 网络错误或其他错误
    throw new CreemApiError(
      error instanceof Error ? error.message : 'Failed to create checkout session'
    )
  }
}

/**
 * 获取 Checkout Session 详情
 *
 * @param checkoutId - Checkout ID
 * @returns Checkout 详情
 */
export async function getCheckoutSession(checkoutId: string): Promise<CreemCheckoutResponse> {
  const apiKey = getCreemApiKey()

  if (!apiKey) {
    throw new CreemApiError('Creem API key is not configured')
  }

  const apiUrl = getCreemApiUrl()

  try {
    const response = await fetch(`${apiUrl}/checkouts/${checkoutId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message =
        (data as { error?: string }).error ||
        (data as { message?: string }).message ||
        `Creem API error: ${response.status}`
      throw new CreemApiError(message, response.status, data)
    }

    return data as CreemCheckoutResponse
  } catch (error) {
    if (error instanceof CreemApiError) {
      throw error
    }

    throw new CreemApiError(
      error instanceof Error ? error.message : 'Failed to get checkout session'
    )
  }
}
