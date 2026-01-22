'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function PaymentReturnPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handlePaymentReturn = async () => {
      const token = searchParams.get('token') // PayPal 订单 ID
      const PayerID = searchParams.get('PayerID')
      const packId = sessionStorage.getItem('pendingPackId')

      if (!token || !packId) {
        setStatus('error')
        setMessage('缺少支付信息，请重新购买')
        return
      }

      try {
        // 调用捕获订单 API
        const response = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: token,
            packId,
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setStatus('success')
          setMessage(`支付成功！已添加 ${data.credits} 积分到您的账户。当前余额：${data.newBalance} 积分`)

          // 清除 sessionStorage
          sessionStorage.removeItem('pendingPackId')
          sessionStorage.removeItem('pendingOrderId')
        } else {
          setStatus('error')
          setMessage(data.error || '支付处理失败，请联系客服')
        }
      } catch (error) {
        console.error('Payment return error:', error)
        setStatus('error')
        setMessage('支付处理过程中出现错误，请联系客服')
      }
    }

    handlePaymentReturn()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-primary" />
                <h2 className="text-2xl font-bold mb-2">处理支付中...</h2>
                <p className="text-muted-foreground">正在确认您的支付，请稍候</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-2xl font-bold mb-2">支付成功！</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <Button
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  返回首页
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
                <h2 className="text-2xl font-bold mb-2">支付失败</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/pricing')}
                    className="flex-1"
                  >
                    返回购买页
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
