'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function SubscriptionReturnContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleSubscriptionReturn = async () => {
      const token = searchParams.get('token') // PayPal 订单 ID
      const PayerID = searchParams.get('PayerID')
      const planId = sessionStorage.getItem('pendingPlanId')
      const billingCycle = sessionStorage.getItem('pendingBillingCycle')

      if (!token || !planId || !billingCycle) {
        setStatus('error')
        setMessage('缺少支付信息，请重新订阅')
        return
      }

      try {
        // 调用捕获订阅订单 API
        const response = await fetch('/api/subscription/capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: token,
            planId,
            billingCycle,
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setStatus('success')
          setMessage(`订阅成功！已添加 ${data.credits} credits 到您的账户。当前余额：${data.newBalance} credits`)

          // 清除 sessionStorage
          sessionStorage.removeItem('pendingPlanId')
          sessionStorage.removeItem('pendingBillingCycle')
          sessionStorage.removeItem('pendingOrderId')
        } else {
          setStatus('error')
          setMessage(data.error || '订阅处理失败，请联系客服')
        }
      } catch (error) {
        console.error('Subscription return error:', error)
        setStatus('error')
        setMessage('订阅处理过程中出现错误，请联系客服')
      }
    }

    handleSubscriptionReturn()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-primary" />
                <h2 className="text-2xl font-bold mb-2">处理订阅中...</h2>
                <p className="text-muted-foreground">正在确认您的订阅，请稍候</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-2xl font-bold mb-2">订阅成功！</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <Button
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  开始使用
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
                <h2 className="text-2xl font-bold mb-2">订阅失败</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/subscription-pricing')}
                    className="flex-1"
                  >
                    返回订阅页
                  </Button>
                  <Button
                    onClick={() => router.push('/')}
                    className="flex-1"
                  >
                    返回首页
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
