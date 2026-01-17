/**
 * PayPal API 客户端
 *
 * 用于与 PayPal 支付平台进行交互
 */

import {
  getPayPalClientSecret,
  getPayPalApiUrl,
  type CreatePayPalOrderRequest,
  type PayPalOrderResponse,
  type PayPalCaptureResponse,
} from './config'

/**
 * PayPal API 错误类
 */
export class PayPalApiError extends Error {
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
 *
 * 使用 Client ID 和 Client Secret 获取访问令牌
 */
async function getAccessToken(): Promise<string> {
  const clientSecret = getPayPalClientSecret()
  const apiUrl = getPayPalApiUrl()

  if (!clientSecret) {
    throw new PayPalApiError('PayPal Client Secret is not configured')
  }

  const auth = Buffer.from(
    `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${clientSecret}`
  ).toString('base64')

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
 * 创建 PayPal 订单
 *
 * @param request - 订单创建请求参数
 * @returns 订单 ID 和相关信息
 * @throws PayPalApiError 如果 API 调用失败
 */
export async function createPayPalOrder(
  request: CreatePayPalOrderRequest
): Promise<PayPalOrderResponse> {
  const apiUrl = getPayPalApiUrl()

  try {
    const accessToken = await getAccessToken()

    const response = await fetch(`${apiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message =
        (data as { message?: string }).message ||
        (data as { error?: string }).error ||
        `PayPal API error: ${response.status}`
      throw new PayPalApiError(message, response.status, data)
    }

    return data as PayPalOrderResponse
  } catch (error) {
    if (error instanceof PayPalApiError) {
      throw error
    }
    throw new PayPalApiError(
      error instanceof Error ? error.message : 'Failed to create PayPal order'
    )
  }
}

/**
 * 捕获 PayPal 订单支付
 *
 * @param orderId - PayPal 订单 ID
 * @returns 捕获支付结果
 * @throws PayPalApiError 如果 API 调用失败
 */
export async function capturePayPalOrder(
  orderId: string
): Promise<PayPalCaptureResponse> {
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

    return data as PayPalCaptureResponse
  } catch (error) {
    if (error instanceof PayPalApiError) {
      throw error
    }
    throw new PayPalApiError(
      error instanceof Error ? error.message : 'Failed to capture PayPal order'
    )
  }
}

/**
 * 获取 PayPal 订单详情
 *
 * @param orderId - PayPal 订单 ID
 * @returns 订单详情
 * @throws PayPalApiError 如果 API 调用失败
 */
export async function getPayPalOrder(orderId: string): Promise<PayPalOrderResponse> {
  const apiUrl = getPayPalApiUrl()

  try {
    const accessToken = await getAccessToken()

    const response = await fetch(`${apiUrl}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
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

    return data as PayPalOrderResponse
  } catch (error) {
    if (error instanceof PayPalApiError) {
      throw error
    }
    throw new PayPalApiError(
      error instanceof Error ? error.message : 'Failed to get PayPal order'
    )
  }
}
