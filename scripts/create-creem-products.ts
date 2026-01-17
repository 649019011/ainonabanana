/**
 * Creem 产品创建脚本
 *
 * 此脚本通过 Creem API 创建 Nano Banana 的订阅产品
 * 运行：npx tsx scripts/create-creem-products.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// 读取 .env.local 文件
function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), '.env.local')
  try {
    const content = readFileSync(envPath, 'utf-8')
    const lines = content.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=').trim()
        if (value) {
          process.env[key] = value
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  警告: 无法加载 .env.local 文件')
    console.warn('   将使用系统环境变量')
  }
}

// 加载环境变量
loadEnvFile()

interface CreemProduct {
  name: string
  description: string
  price: number
  currency: string
  billing_type: 'recurring' | 'one-time'
  billing_period: 'every-month' | 'every-year'
  tax_mode: 'exclusive' | 'inclusive'
  tax_category: string
}

interface CreateProductResponse {
  id: string
  name: string
  price: number
  currency: string
  billing_type: string
  billing_period: string
  status: string
}

// 产品配置
const products: CreemProduct[] = [
  // Basic 计划
  {
    name: 'Nano Banana - Basic Monthly',
    description: 'Basic Plan - Monthly subscription for Nano Banana AI Image Editor',
    price: 1200, // $12.00 in cents
    currency: 'USD',
    billing_type: 'recurring',
    billing_period: 'every-month',
    tax_mode: 'exclusive',
    tax_category: 'saas',
  },
  {
    name: 'Nano Banana - Basic Yearly',
    description: 'Basic Plan - Yearly subscription for Nano Banana AI Image Editor',
    price: 14400, // $144.00 in cents
    currency: 'USD',
    billing_type: 'recurring',
    billing_period: 'every-year',
    tax_mode: 'exclusive',
    tax_category: 'saas',
  },
  // Pro 计划
  {
    name: 'Nano Banana - Pro Monthly',
    description: 'Pro Plan - Monthly subscription for Nano Banana AI Image Editor',
    price: 1950, // $19.50 in cents
    currency: 'USD',
    billing_type: 'recurring',
    billing_period: 'every-month',
    tax_mode: 'exclusive',
    tax_category: 'saas',
  },
  {
    name: 'Nano Banana - Pro Yearly',
    description: 'Pro Plan - Yearly subscription for Nano Banana AI Image Editor',
    price: 23400, // $234.00 in cents
    currency: 'USD',
    billing_type: 'recurring',
    billing_period: 'every-year',
    tax_mode: 'exclusive',
    tax_category: 'saas',
  },
  // Max 计划
  {
    name: 'Nano Banana - Max Monthly',
    description: 'Max Plan - Monthly subscription for Nano Banana AI Image Editor',
    price: 8000, // $80.00 in cents
    currency: 'USD',
    billing_type: 'recurring',
    billing_period: 'every-month',
    tax_mode: 'exclusive',
    tax_category: 'saas',
  },
  {
    name: 'Nano Banana - Max Yearly',
    description: 'Max Plan - Yearly subscription for Nano Banana AI Image Editor',
    price: 96000, // $960.00 in cents
    currency: 'USD',
    billing_type: 'recurring',
    billing_period: 'every-year',
    tax_mode: 'exclusive',
    tax_category: 'saas',
  },
]

// 环境变量映射
const envVarMapping: Record<string, string> = {
  'Nano Banana - Basic Monthly': 'CREEM_PRODUCT_BASIC_MONTHLY',
  'Nano Banana - Basic Yearly': 'CREEM_PRODUCT_BASIC_YEARLY',
  'Nano Banana - Pro Monthly': 'CREEM_PRODUCT_PRO_MONTHLY',
  'Nano Banana - Pro Yearly': 'CREEM_PRODUCT_PRO_YEARLY',
  'Nano Banana - Max Monthly': 'CREEM_PRODUCT_MAX_MONTHLY',
  'Nano Banana - Max Yearly': 'CREEM_PRODUCT_MAX_YEARLY',
}

async function createProduct(product: CreemProduct, apiKey: string, isTestMode: boolean): Promise<CreateProductResponse> {
  const apiUrl = isTestMode ? 'https://test-api.creem.io/v1/products' : 'https://api.creem.io/v1/products'

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(product),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create product "${product.name}": ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  return data as CreateProductResponse
}

async function main() {
  // 从环境变量获取 API Key
  const apiKey = process.env.CREEM_API_KEY
  if (!apiKey) {
    console.error('❌ 错误: CREEM_API_KEY 环境变量未设置')
    console.log('请在 .env.local 文件中设置 CREEM_API_KEY')
    process.exit(1)
  }

  // 判断是否使用测试模式
  const isTestMode = apiKey.startsWith('creem_test_')
  console.log(`🔧 使用${isTestMode ? '测试' : '生产'}模式`)
  console.log(`📡 API URL: ${isTestMode ? 'https://test-api.creem.io' : 'https://api.creem.io'}`)
  console.log('')

  const results: { name: string; id: string; envVar: string }[] = []

  console.log(`🚀 开始创建 ${products.length} 个产品...`)
  console.log('')

  for (const product of products) {
    try {
      console.log(`⏳ 创建产品: ${product.name}`)
      const result = await createProduct(product, apiKey, isTestMode)
      console.log(`✅ 成功! 产品 ID: ${result.id}`)
      console.log(`   - 价格: $${(result.price / 100).toFixed(2)}`)
      console.log(`   - 计费周期: ${result.billing_period}`)
      console.log('')

      results.push({
        name: product.name,
        id: result.id,
        envVar: envVarMapping[product.name],
      })
    } catch (error) {
      console.error(`❌ 创建失败: ${product.name}`)
      if (error instanceof Error) {
        console.error(`   错误: ${error.message}`)
      }
      console.log('')
    }
  }

  // 输出环境变量配置
  console.log('='.repeat(60))
  console.log('📝 环境变量配置')
  console.log('='.repeat(60))
  console.log('')
  console.log('请将以下内容添加到你的 .env.local 文件中:')
  console.log('')

  for (const result of results) {
    console.log(`${result.envVar}=${result.id}`)
  }

  console.log('')
  console.log('='.repeat(60))
  console.log(`✨ 完成! 成功创建 ${results.length}/${products.length} 个产品`)
  console.log('='.repeat(60))
}

// 运行脚本
main().catch((error) => {
  console.error('❌ 脚本执行失败:', error)
  process.exit(1)
})
