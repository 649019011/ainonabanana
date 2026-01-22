/**
 * 订阅制配置
 *
 * 定义不同的订阅套餐及其价格、credits 配额
 */

/**
 * 订阅套餐配置
 */
export const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for individuals and light users',
    monthly: {
      price: 12,
      credits: 150, // 每月 150 credits = 75 张图片
      originalPrice: 12,
    },
    yearly: {
      price: 144,
      credits: 1800, // 每年 1800 credits = 900 张图片
      originalPrice: 180, // 原价 $180，现在 $144，节省 20%
      discount: 20,
    },
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
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For professional creators and teams',
    popular: true,
    monthly: {
      price: 19.5,
      credits: 800, // 每月 800 credits = 400 张图片
      originalPrice: 19.5,
    },
    yearly: {
      price: 234,
      credits: 9600, // 每年 9600 credits = 4800 张图片
      originalPrice: 468, // 原价 $468，现在 $234，节省 50%
      discount: 50,
    },
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
  },
  max: {
    id: 'max',
    name: 'Max',
    description: 'Designed for large enterprises and professional studios',
    bestValue: true,
    monthly: {
      price: 80,
      credits: 4600, // 每月 4600 credits = 2300 张图片
      originalPrice: 80,
    },
    yearly: {
      price: 960,
      credits: 55200, // 每年 55200 credits = 27600 张图片
      originalPrice: 1920, // 原价 $1920，现在 $960，节省 50%
      discount: 50,
    },
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
  },
} as const

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS
export type BillingCycle = 'monthly' | 'yearly'

/**
 * 获取订阅套餐配置
 */
export function getSubscriptionPlan(planId: SubscriptionPlanId) {
  return SUBSCRIPTION_PLANS[planId]
}

/**
 * 获取套餐价格（根据计费周期）
 */
export function getPlanPrice(planId: SubscriptionPlanId, billingCycle: BillingCycle): number {
  const plan = SUBSCRIPTION_PLANS[planId]
  return billingCycle === 'monthly' ? plan.monthly.price : plan.yearly.price
}

/**
 * 获取套餐 credits（根据计费周期）
 */
export function getPlanCredits(planId: SubscriptionPlanId, billingCycle: BillingCycle): number {
  const plan = SUBSCRIPTION_PLANS[planId]
  return billingCycle === 'monthly' ? plan.monthly.credits : plan.yearly.credits
}

/**
 * PayPal 产品 ID 配置
 *
 * 注意：这些 ID 需要在 PayPal Developer Dashboard 中创建订阅产品后获取
 * 创建地址：https://developer.paypal.com/dashboard/applications/live
 */
export const PAYPAL_PRODUCT_IDS = {
  basic: {
    monthly: process.env.PAYPAL_PRODUCT_BASIC_MONTHLY || '',
    yearly: process.env.PAYPAL_PRODUCT_BASIC_YEARLY || '',
  },
  pro: {
    monthly: process.env.PAYPAL_PRODUCT_PRO_MONTHLY || '',
    yearly: process.env.PAYPAL_PRODUCT_PRO_YEARLY || '',
  },
  max: {
    monthly: process.env.PAYPAL_PRODUCT_MAX_MONTHLY || '',
    yearly: process.env.PAYPAL_PRODUCT_MAX_YEARLY || '',
  },
} as const
