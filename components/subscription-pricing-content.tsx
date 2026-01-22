'use client'

/**
 * 订阅制定价页面组件
 *
 * 参考：https://imgeditor.co/pricing
 */

import { useState, useEffect } from 'react'
import { Check, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { AuthButton } from '@/components/auth-button'
import { useToast } from '@/hooks/use-toast'
import type { User } from '@supabase/supabase-js'
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId, type BillingCycle, getPlanPrice, getPlanCredits } from '@/lib/subscription/config'

interface SubscriptionPricingContentProps {
  initialUser: User | null
  isSupabaseConfigured: boolean
  isPayPalConfigured: boolean
}

// 从环境变量获取 PayPal Client ID
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''

const faqs = [
  {
    question: 'What are credits and how do they work?',
    answer: '2 credits generate 1 high-quality image. Credits are automatically refilled at the start of each billing cycle - monthly for monthly plans, all at once for yearly plans.',
  },
  {
    question: 'Can I change my plan anytime?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades take effect at the next billing cycle.',
  },
  {
    question: 'Do unused credits roll over?',
    answer: 'Monthly plan credits do not roll over to the next month. Yearly plan credits are valid for the entire subscription period. We recommend choosing a plan based on your actual usage needs.',
  },
  {
    question: 'What payment methods are supported?',
    answer: 'We support credit cards, debit cards, Alipay, WeChat Pay, and various other payment methods. All payments are processed through secure third-party payment platforms.',
  },
]

export function SubscriptionPricingContent({
  initialUser,
  isSupabaseConfigured,
  isPayPalConfigured,
}: SubscriptionPricingContentProps) {
  const { toast } = useToast()
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly')
  const [processingPlan, setProcessingPlan] = useState<SubscriptionPlanId | null>(null)
  const [paypalLoaded, setPaypalLoaded] = useState(false)

  // 动态加载 PayPal SDK
  useEffect(() => {
    if (PAYPAL_CLIENT_ID && !paypalLoaded) {
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true`
      script.addEventListener('load', () => setPaypalLoaded(true))
      document.body.appendChild(script)

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [paypalLoaded])

  const handleSubscribe = async (planId: SubscriptionPlanId) => {
    // 如果用户未登录，提示先登录
    if (!initialUser) {
      toast({
        variant: 'destructive',
        title: 'Please login first',
        description: 'You need to login before subscribing',
      })
      return
    }

    if (!isPayPalConfigured) {
      toast({
        variant: 'destructive',
        title: 'Payment service is not configured',
        description: 'Please contact the administrator to configure payment service',
      })
      return
    }

    setProcessingPlan(planId)

    try {
      // 调用订阅 API 创建订单
      const response = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          userId: initialUser.id,
          userEmail: initialUser.email,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create subscription order')
      }

      // 保存信息到 sessionStorage
      sessionStorage.setItem('pendingPlanId', planId)
      sessionStorage.setItem('pendingBillingCycle', billingCycle)
      sessionStorage.setItem('pendingOrderId', data.orderId)

      // 重定向到 PayPal
      window.location.href = data.approveUrl
    } catch (error) {
      console.error('Subscription error:', error)
      toast({
        variant: 'destructive',
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Please try again later',
      })
      setProcessingPlan(null)
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
            <p className="text-sm text-muted-foreground mb-4">NanoBanana is an independent product and is not affiliated with Google or other AI model providers. We provide access to AI models through our custom interface.</p>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full border border-border mb-6">
              <span className="font-semibold">🍌 Limited Time:</span>
              <span>Save 20% with Annual Billing</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-4">Choose Your Perfect Plan</h2>
            <p className="text-xl text-muted-foreground">Unlimited creativity starts here</p>

            {/* Billing Toggle */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                  billingCycle === 'yearly'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly
                <span className="ml-2 text-xs bg-primary-foreground/20 px-2 py-1 rounded">Save 20%</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
              const planId = plan.id as SubscriptionPlanId
              const price = billingCycle === 'monthly' ? plan.monthly.price : plan.yearly.price
              const originalPrice = billingCycle === 'monthly' ? plan.monthly.originalPrice : plan.yearly.originalPrice
              const credits = billingCycle === 'monthly' ? plan.monthly.credits : plan.yearly.credits
              const discount = billingCycle === 'monthly' ? 0 : plan.yearly.discount
              const hasDiscount = discount > 0

              return (
                <Card
                  key={planId}
                  className={`relative border-2 transition-all hover:shadow-lg ${
                    plan.popular || plan.bestValue ? 'border-primary scale-105' : 'border-border'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {plan.bestValue && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                        Best Value
                      </span>
                    </div>
                  )}

                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                      {/* Price Display */}
                      <div className="mb-2">
                        {hasDiscount && (
                          <div className="text-sm text-muted-foreground line-through mb-1">
                            ${originalPrice.toFixed(2)}/{billingCycle === 'monthly' ? 'mo' : 'year'}
                          </div>
                        )}
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold">
                            ${price.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'mo' : 'year'}</span>
                        </div>
                        {hasDiscount && (
                          <p className="text-xs text-green-600 font-semibold mt-1">
                            ⚡ SAVE {discount}%
                          </p>
                        )}
                      </div>

                      {/* Credits Display */}
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-accent rounded-full border border-border mb-3">
                        <span className="text-sm font-semibold text-primary">
                          {credits.toLocaleString()} credits/{billingCycle === 'monthly' ? 'year' : 'year'}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        ~{plan.imagesPerMonth} images/month
                      </p>
                    </div>

                    {!isPayPalConfigured && (
                      <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-center text-sm text-destructive">
                        Payment not configured
                      </div>
                    )}

                    <Button
                      className={`w-full mb-6 ${
                        plan.popular || plan.bestValue
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                      onClick={() => handleSubscribe(planId)}
                      disabled={processingPlan === planId || !initialUser}
                    >
                      {processingPlan === planId ? (
                        <>Processing...</>
                      ) : !initialUser ? (
                        'Login to Subscribe'
                      ) : (
                        'Get Started'
                      )}
                    </Button>

                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
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
