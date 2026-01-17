'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { AuthButton } from '@/components/auth-button'
import { useToast } from '@/hooks/use-toast'
import { isPayPalConfigured, type CreditsPackId } from '@/lib/paypal/config'
import type { User } from '@supabase/supabase-js'

interface PricingPageContentProps {
  initialUser: User | null
  isSupabaseConfigured: boolean
}

interface CreditsPack {
  id: CreditsPackId
  name: string
  description: string
  credits: number
  price: number
  images: number
  popular?: boolean
  features: string[]
}

const creditsPacks: CreditsPack[] = [
  {
    id: 'small',
    name: 'Starter Pack',
    description: 'Perfect for trying out',
    credits: 500,
    price: 9.99,
    images: 250,
    popular: true,
    features: [
      '500 high-quality credits',
      '~250 images generated',
      'All style templates included',
      'Standard generation speed',
      'Basic customer support',
      'JPG/PNG format downloads',
      'Commercial Use License',
    ],
  },
  {
    id: 'medium',
    name: 'Standard Pack',
    description: 'Best value for casual users',
    credits: 2000,
    price: 29.99,
    images: 1000,
    features: [
      '2000 high-quality credits',
      '~1000 images generated',
      'All style templates included',
      'Standard generation speed',
      'Priority customer support',
      'JPG/PNG/WebP format downloads',
      'Batch generation feature',
      'Commercial Use License',
    ],
  },
  {
    id: 'large',
    name: 'Pro Pack',
    description: 'For power users and professionals',
    credits: 10000,
    price: 99.99,
    images: 5000,
    features: [
      '10000 high-quality credits',
      '~5000 images generated',
      'Support Seedream-4 Model',
      'Support Nanobanana-Pro Model',
      'All style templates included',
      'Priority generation queue',
      'Dedicated support',
      'All format downloads',
      'Batch generation feature',
      'Commercial Use License',
    ],
  },
  {
    id: 'ultra',
    name: 'Ultimate Pack',
    description: 'Maximum value for teams',
    credits: 50000,
    price: 399.99,
    images: 25000,
    features: [
      '50000 high-quality credits',
      '~25000 images generated',
      'Support Seedream-4 Model',
      'Support Nanobanana-Pro Model',
      'All style templates included',
      'Fastest generation speed',
      'Dedicated account manager',
      'All format downloads',
      'Batch generation feature',
      'Commercial Use License',
    ],
  },
]

const faqs = [
  {
    question: 'What are credits and how do they work?',
    answer: '2 credits generate 1 high-quality image. Credits are purchased in packs and added to your account immediately after purchase. They never expire.',
  },
  {
    question: 'Do unused credits expire?',
    answer: 'No! Your purchased credits never expire. Use them whenever you want, at your own pace.',
  },
  {
    question: 'What payment methods are supported?',
    answer: 'We accept PayPal payments, including credit cards, debit cards, and PayPal balance. All payments are processed securely through PayPal.',
  },
  {
    question: 'Is it safe to buy credits?',
    answer: 'Yes! All transactions are processed securely through PayPal, one of the most trusted payment platforms worldwide.',
  },
]

export function PricingPageContent({ initialUser, isSupabaseConfigured }: PricingPageContentProps) {
  const { toast } = useToast()
  const [processingPack, setProcessingPack] = useState<CreditsPackId | null>(null)
  const [isPayPalReady, setIsPayPalReady] = useState(false)
  const payPalScriptRef = useRef<HTMLScriptElement | null>(null)
  const paypalRef = useRef<any>(null)

  // 加载 PayPal JS SDK
  useEffect(() => {
    if (!isPayPalConfigured()) {
      return
    }

    // 避免重复加载
    if (document.querySelector('script[src*="paypal.com/sdk/js"]')) {
      setIsPayPalReady(true)
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD`
    script.async = true
    script.onload = () => {
      setIsPayPalReady(true)
      payPalScriptRef.current = script
    }
    script.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'PayPal 加载失败',
        description: '无法加载 PayPal 支付组件，请刷新页面重试',
      })
    }
    document.body.appendChild(script)

    return () => {
      if (payPalScriptRef.current && payPalScriptRef.current.parentNode) {
        payPalScriptRef.current.parentNode.removeChild(payPalScriptRef.current)
      }
    }
  }, [toast])

  const handlePurchase = async (packId: CreditsPackId) => {
    // 如果用户未登录，提示先登录
    if (!initialUser) {
      toast({
        variant: 'destructive',
        title: '请先登录',
        description: '购买前需要先登录账户',
      })
      return
    }

    setProcessingPack(packId)

    try {
      // 创建 PayPal 订单
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packId,
          userId: initialUser.id,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order')
      }

      // 使用 PayPal JS SDK 渲染支付按钮
      if (window.paypal) {
        window.paypal
          .Buttons({
            createOrder: () => {
              return data.orderId
            },
            onApprove: async (data: any) => {
              try {
                // 捕获支付
                const captureResponse = await fetch('/api/paypal/capture-order', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    orderId: data.orderID,
                  }),
                })

                const captureData = await captureResponse.json()

                if (!captureResponse.ok || !captureData.success) {
                  throw new Error(captureData.error || 'Payment capture failed')
                }

                toast({
                  title: '购买成功！',
                  description: `已成功购买 ${captureData.credits || creditsPacks.find(p => p.id === packId)?.credits} credits，当前余额：${captureData.newBalance || 0}`,
                })

                // 刷新 credits 显示
                if (typeof window !== 'undefined' && (window as any).refreshCreditsDisplay) {
                  ;(window as any).refreshCreditsDisplay()
                }
              } catch (error) {
                console.error('Capture error:', error)
                toast({
                  variant: 'destructive',
                  title: '支付失败',
                  description: error instanceof Error ? error.message : '请稍后重试',
                })
              } finally {
                setProcessingPack(null)
              }
            },
            onError: (err: any) => {
              console.error('PayPal error:', err)
              toast({
                variant: 'destructive',
                title: 'PayPal 错误',
                description: '支付过程中出现错误，请稍后重试',
              })
              setProcessingPack(null)
            },
            onCancel: () => {
              toast({
                title: '支付已取消',
                description: '您已取消支付',
              })
              setProcessingPack(null)
            },
          })
          .render('#paypal-button-container')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      toast({
        variant: 'destructive',
        title: '创建订单失败',
        description: error instanceof Error ? error.message : '请稍后重试',
      })
      setProcessingPack(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a href="/" className="flex items-center gap-2">
                <div className="text-3xl">🍌</div>
                <h1 className="text-2xl font-bold">Nano Banana</h1>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <AuthButton initialUser={initialUser} isSupabaseConfigured={isSupabaseConfigured} />
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <a href="/">Try Now</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm text-muted-foreground mb-4">Nano Banana is an independent product and is not affiliated with Google or other AI model providers. We provide access to AI models through our custom interface.</p>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full border border-border mb-6">
              <span>🍌</span>
              <span className="font-semibold">No Expiration:</span>
              <span>Credits never expire!</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-4">Buy Credits, Create Forever</h2>
            <p className="text-xl text-muted-foreground">One-time purchase, unlimited creativity</p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {creditsPacks.map((pack) => (
              <Card
                key={pack.id}
                className={`relative border-2 transition-all hover:shadow-lg ${
                  pack.popular ? 'border-primary scale-105' : ''
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">{pack.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{pack.description}</p>

                    <div className="mb-2">
                      <span className="text-4xl font-bold">
                        ${pack.price.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-primary mb-1">
                      {pack.credits.toLocaleString()} credits
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ~{pack.images.toLocaleString()} images
                    </p>
                  </div>

                  {!isPayPalConfigured() && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-center text-sm text-destructive">
                      PayPal not configured
                    </div>
                  )}

                  {isPayPalConfigured() && !isPayPalReady && (
                    <Button
                      className="w-full mb-6"
                      disabled
                    >
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading PayPal...
                    </Button>
                  )}

                  {isPayPalConfigured() && isPayPalReady && (
                    <Button
                      className={`w-full mb-6 ${
                        pack.popular
                          ? 'bg-[#FFC439] text-[#000000] hover:bg-[#FFB02E]'
                          : 'bg-[#FFC439] text-[#000000] hover:bg-[#FFB02E]'
                      }`}
                      onClick={() => handlePurchase(pack.id)}
                      disabled={processingPack === pack.id}
                    >
                      {processingPack === pack.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Buy Now'
                      )}
                    </Button>
                  )}

                  <ul className="space-y-3">
                    {pack.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* PayPal 隐藏容器 */}
          <div id="paypal-button-container" className="hidden" />
        </div>
      </section>

      {/* Disclaimer */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs text-muted-foreground">
              imgeditor.co is an independent product and is not affiliate with Google or any of its brands
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-accent/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index + 1}`} className="border rounded-lg px-6 bg-card">
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    <span className="font-semibold">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-muted-foreground">Have more questions? We're here to help</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-accent/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🍌</span>
              <span className="text-xl font-bold">Nano Banana</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground">
                © 2026 Nano Banana. AI-powered image editing for everyone.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
