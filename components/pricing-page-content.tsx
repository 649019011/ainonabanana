'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { AuthButton } from '@/components/auth-button'
import { useToast } from '@/hooks/use-toast'
import type { User } from '@supabase/supabase-js'

interface PricingPageContentProps {
  initialUser: User | null
  isSupabaseConfigured: boolean
}

type BillingPeriod = 'monthly' | 'yearly'

interface CheckoutResponse {
  success: boolean
  checkoutUrl?: string
  checkoutId?: string
  error?: string
}

interface Plan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  creditsPerYear: number
  imagesPerMonth: number
  features: string[]
  popular?: boolean
  yearlyDiscount?: string
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for individuals and light users',
    monthlyPrice: 9,
    yearlyPrice: 86.4,
    creditsPerYear: 1800,
    imagesPerMonth: 75,
    features: [
      '75 high-quality images/month',
      'All style templates included',
      'Standard generation speed',
      'Basic customer support',
      'JPG/PNG format downloads',
      'Commercial Use License',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For professional creators and teams',
    monthlyPrice: 19.9,
    yearlyPrice: 191.04,
    creditsPerYear: 9600,
    imagesPerMonth: 400,
    features: [
      '400 high-quality images/month',
      'Support Seedream-4 Model',
      'Support Nanobanana-Pro Model',
      'All style templates included',
      'Priority generation queue',
      'Priority customer support',
      'JPG/PNG/WebP format downloads',
      'Batch generation feature',
      'Image editing tools (Coming soon)',
      'Commercial Use License',
    ],
    popular: true,
    yearlyDiscount: 'SAVE 20%',
  },
  {
    id: 'max',
    name: 'Max',
    description: 'Designed for large enterprises and professional studios',
    monthlyPrice: 89.9,
    yearlyPrice: 863.04,
    creditsPerYear: 55200,
    imagesPerMonth: 2300,
    features: [
      '2300 high-quality images/month',
      'Support Seedream-4 Model',
      'Support Nanobanana-Pro Model',
      'All style templates included',
      'Fastest generation speed',
      'Dedicated account manager',
      'All format downloads',
      'Batch generation feature',
      'Professional editing suite (Coming soon)',
      'Commercial Use License',
    ],
    yearlyDiscount: 'SAVE 20%',
  },
]

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

export function PricingPageContent({ initialUser, isSupabaseConfigured }: PricingPageContentProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly')
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

  const handleSelectPlan = async (planId: string) => {
    // 如果用户未登录，提示先登录
    if (!initialUser) {
      toast({
        variant: 'destructive',
        title: '请先登录',
        description: '订阅前需要先登录账户',
      })
      return
    }

    setProcessingPlan(planId)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingPeriod,
          userEmail: initialUser.email,
          metadata: {
            userId: initialUser.id,
          },
        }),
      })

      const data: CheckoutResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // 重定向到 Creem 支付页面
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        variant: 'destructive',
        title: '创建支付会话失败',
        description: error instanceof Error ? error.message : '请稍后重试',
      })
    } finally {
      setProcessingPlan(null)
    }
  }

  const getDisplayPrice = (plan: Plan) => {
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice / 12
  }

  const getYearlyPrice = (plan: Plan) => {
    return billingPeriod === 'monthly' ? plan.monthlyPrice * 12 : plan.yearlyPrice
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
              <span className="font-semibold">Limited Time:</span>
              <span>Save 20% with Annual Billing</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-4">Choose Your Perfect Plan</h2>
            <p className="text-xl text-muted-foreground">Unlimited creativity starts here</p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  billingPeriod === 'yearly' ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`text-sm font-medium transition-colors ${
                  billingPeriod === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative border-2 transition-all hover:shadow-lg ${
                  plan.popular ? 'border-primary scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                    <div className="mb-2">
                      <span className="text-4xl font-bold">
                        ${getDisplayPrice(plan).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>

                    {billingPeriod === 'yearly' && plan.yearlyDiscount && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through">
                          ${plan.yearlyPrice * 2}
                        </span>
                        <span className="text-primary font-semibold">
                          ${plan.yearlyPrice}/year
                        </span>
                        <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded">
                          {plan.yearlyDiscount}
                        </span>
                      </div>
                    )}

                    {billingPeriod === 'monthly' && (
                      <div className="text-sm text-muted-foreground">
                        ${getYearlyPrice(plan)}/year
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      {plan.creditsPerYear} credits/year
                    </p>
                  </div>

                  <Button
                    className={`w-full mb-6 ${
                      plan.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={processingPlan === plan.id}
                  >
                    {processingPlan === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
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
            ))}
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
