# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

**重要说明：请始终使用中文与用户交互，所有回复、解释和沟通都应使用中文。**

## 项目概述

这是一个 "Nano Banana" AI 图像编辑服务的 Next.js 16 营销网站。项目使用：
- Next.js 16 with App Router（app 目录结构）
- React 19
- TypeScript（启用严格模式）
- Tailwind CSS v4 with PostCSS
- Radix UI 组件库（components/ui/ 中的完整组件集）
- shadcn/ui 设计模式
- Vercel Analytics 集成
- Supabase 服务器端认证（Google OAuth）
- PayPal 支付集成（一次性购买 credits 包）
- Credits 系统（用户余额和交易管理）

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm run start

# 运行代码检查
npm run lint
```

## Supabase 认证架构

本项目使用 Supabase 实现服务器端 Google OAuth 认证。认证流程使用 PKCE (Proof Key for Code Exchange) 确保安全性。

### 认证流程

```
用户点击登录 → /auth/signin → Google OAuth → /auth/callback → 交换 code 为 session → 保存到 cookie → 重定向回应用
```

### 认证相关文件

**Supabase 客户端创建（lib/supabase/）：**
- `config.ts` - 从环境变量读取 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
- `client.ts` - 客户端浏览器客户端（`createBrowserClient`），用于客户端组件
- `server.ts` - 服务器端客户端（`createServerClient`），用于服务器组件，cookies 只读
- `middleware.ts` - 会话更新中间件，在每次请求时刷新过期的令牌

**认证路由（app/auth/）：**
- `signin/route.ts` - 发起 Google OAuth 登录，重定向到 Google
- `callback/route.ts` - 处理 OAuth 回调，交换 code 为 session 并保存到 cookie
- `signout/route.ts` - 登出功能，清除 session

**UI 组件：**
- `components/auth-button.tsx` - 智能登录按钮，根据认证状态显示登录按钮或用户信息下拉菜单

### 使用认证

**服务器组件中获取用户：**
```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  // user 为 null 表示未登录
}
```

**客户端组件中获取用户：**
```typescript
import { createSupabaseClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export default function ClientComponent() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [supabase])
}
```

**环境变量（.env.local）：**
```env
# Supabase 认证
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# OpenRouter AI 图像生成
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_SITE_URL=http://localhost:3000  # 或生产环境 URL
OPENROUTER_SITE_NAME=Nano Banana

# PayPal 支付
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_PayPal_Client_ID
PAYPAL_CLIENT_SECRET=your_PayPal_Client_Secret
PAYPAL_MODE=sandbox  # sandbox（测试）或 live（生产）

# Creem 支付（保留但已弃用，使用 PayPal 替代）
CREEM_API_KEY=your_creem_api_key_here
CREEM_API_URL=https://api.creem.io/v1
CREEM_WEBHOOK_SECRET=your_webhook_secret_here
CREEM_PRODUCT_BASIC_MONTHLY=prod_xxx_basic_monthly
CREEM_PRODUCT_BASIC_YEARLY=prod_xxx_basic_yearly
CREEM_PRODUCT_PRO_MONTHLY=prod_xxx_pro_monthly
CREEM_PRODUCT_PRO_YEARLY=prod_xxx_pro_yearly
CREEM_PRODUCT_MAX_MONTHLY=prod_xxx_max_monthly
CREEM_PRODUCT_MAX_YEARLY=prod_xxx_max_yearly
```

详细配置说明见 `AUTH_SETUP.md`、`PAYPAL_SETUP.md` 和 `CREDITS_SETUP.md`。

## 图像生成架构

本项目使用 OpenRouter API 调用 Google Gemini 2.5 Flash 模型进行 AI 图像编辑。

### 图像生成流程

```
用户上传图片 → 前端压缩并转 base64 → 检查 credits 余额 → 扣除 2 credits → POST /api/generate → OpenRouter API → Gemini 2.5 Flash → 返回图片 URL → 展示在 Output Gallery
```

### API 路由（app/api/generate/route.ts）

- 接收 `image`（base64 data URL 或 URL）和 `prompt`（文本提示词）
- 调用 OpenRouter 的 `google/gemini-2.5-flash-image` 模型
- 从复杂的响应结构中提取图片 URL
- 支持多种响应格式：data URL、HTTP URL、base64 等

### 前端处理（components/home-page-content.tsx）

- 图片上传时自动压缩：最大 2048px 边长，JPEG 0.92 质量
- 支持 10MB 以内的图片文件
- 生成前检查用户 credits 余额（需要 2 credits）
- 生成结果存储在本地 state 中，展示在 Output Gallery

## 目录结构

- `app/` - Next.js App Router 页面
  - `layout.tsx` - 根布局，包含字体（Geist、Geist Mono）和 Analytics
  - `page.tsx` - 主落地页（服务器组件，渲染 home-page-content）
  - `pricing/page.tsx` - Pricing 页面（购买 credits 包）
  - `api-docs/page.tsx` - API 文档页面
  - `quick-start/page.tsx` - 快速入门指南页面
  - `payment/return/page.tsx` - PayPal 支付返回页面
  - `globals.css` - Tailwind v4 导入和主题 CSS 自定义属性
  - `auth/` - 认证路由（signin、callback、signout）
  - `api/generate/` - 图像生成 API 路由，使用 OpenRouter 调用 Gemini 2.5 Flash
  - `api/paypal/create-order/` - PayPal 创建订单 API
  - `api/paypal/capture-order/` - PayPal 捕获支付 API
  - `api/credits/balance/` - 获取用户 credits 余额 API
  - `api/credits/deduct/` - 扣除 credits API
  - `api/credits/transactions/` - 获取交易历史 API
  - `api/checkout/` - Creem 支付会话创建 API（已弃用）
  - `api/webhooks/creem/` - Creem webhook 处理（已弃用）

- `components/` - React 组件
  - `ui/` - shadcn/ui/Radix UI 基础组件（60+ 个组件）
  - `theme-provider.tsx` - 主题上下文提供者
  - `auth-button.tsx` - 登录/用户信息组件
  - `credits-display.tsx` - Credits 余额显示组件
  - `pricing-page-content.tsx` - Pricing 页面客户端组件
  - `home-page-content.tsx` - 主页客户端组件

- `lib/` - 工具函数
  - `utils.ts` - `cn()` 辅助函数，用于合并 Tailwind 类名
  - `supabase/` - Supabase 认证相关工具（config.ts、client.ts、server.ts、middleware.ts）
  - `paypal/` - PayPal 支付相关工具（config.ts、client.ts）
  - `credits/` - Credits 系统工具（config.ts、db.ts、client.ts）
  - `creem/` - Creem 支付相关工具（已弃用，保留用于兼容）

- `hooks/` - 自定义 React hooks
  - `use-mobile.ts` - 移动端检测
  - `use-toast.ts` - 提示通知

- `middleware.ts` - Next.js 中间件，调用 Supabase 会话更新

### 关键模式

**组件导入：** 所有 UI 组件使用 `@/` 路径别名（在 tsconfig.json 中配置为映射到根目录）。

**主题：** 应用使用 CSS 自定义属性和 OKLCH 色彩空间支持亮色/暗色模式。主题值在 `globals.css` 中定义，通过 Tailwind 的 `@theme inline` 引用。

**样式：** Tailwind v4 配合 `@import "tailwindcss"` 和 `tw-animate-css` 自定义动画。`cn()` 工具函数结合 clsx 和 tailwind-merge 处理条件类名。

**客户端组件：** 主页面是客户端组件（使用 `"use client"` 指令），通过 hooks 管理图片上传状态和提示输入。

## 配置说明

- **TypeScript：** 在 `next.config.mjs` 中忽略构建错误（`ignoreBuildErrors: true`）
- **图片：** Next.js 配置中未优化（`unoptimized: true`）
- **路径别名：** `@/*` 映射到项目根目录用于导入
- **CSS：** 使用 Tailwind PostCSS 插件，定义了自定义暗色模式变体

## UI 组件

`components/ui/` 目录包含遵循 shadcn/ui 约定的预构建 Radix UI 组件。这些组件都有完整的类型定义，可直接使用。常用组件包括 Button、Card、Dialog、Accordion、Input、Textarea、Avatar、DropdownMenu 等。

## Credits 系统

本项目使用 Credits 系统来管理用户的图像生成配额。

### Credits 流程

```
用户注册 → 获得 10 免费 credits → 生成图像时扣除 2 credits → 余额不足时购买 credits 包 → PayPal 支付成功 → 添加 credits 到账户
```

### Credits 配置（lib/credits/config.ts）

- `CREDITS_PER_IMAGE = 2` - 每次图像生成消耗 2 credits
- 新用户注册获得 10 免费 credits

### Credits 相关文件

**Credits 工具（lib/credits/）：**
- `config.ts` - Credits 系统配置和类型定义
- `db.ts` - 数据库操作函数（getOrCreateUserCredits、addCredits、deductCredits）
- `client.ts` - 客户端 API 调用函数

**API 路由：**
- `app/api/credits/balance/route.ts` - 获取用户 credits 余额
- `app/api/credits/deduct/route.ts` - 扣除 credits（用于图像生成）
- `app/api/credits/transactions/route.ts` - 获取用户交易历史

### 数据库表

- `user_credits` - 存储用户 credits 余额
- `credit_transactions` - 记录所有 credits 交易（purchase/usage/refund/bonus）

详细配置说明见 `CREDITS_SETUP.md`。

## PayPal 支付架构

本项目使用 PayPal 进行一次性付款，用户可以购买不同大小的 credits 包。

### 支付流程

```
用户点击 "Buy Now" → 调用 /api/paypal/create-order → 返回 PayPal Order ID → 使用 PayPal JS SDK 打开支付窗口 → 用户完成支付 → 调用 /api/paypal/capture-order → 添加 credits 到账户
```

### PayPal 相关文件

**PayPal 客户端工具（lib/paypal/）：**
- `config.ts` - 从环境变量读取 PayPal API 密钥和 credits 包配置
- `client.ts` - PayPal API 客户端，包含 `createPayPalOrder` 和 `capturePayPalOrder` 函数

**API 路由：**
- `app/api/paypal/create-order/route.ts` - 创建 PayPal 订单
- `app/api/paypal/capture-order/route.ts` - 捕获 PayPal 支付并添加 credits

### Credits 包配置

| 包名 | Credits | 价格 | 大约图片数 |
|------|---------|------|------------|
| Starter Pack | 500 | $9.99 | ~250 |
| Standard Pack | 2,000 | $29.99 | ~1,000 |
| Pro Pack | 10,000 | $99.99 | ~5,000 |
| Ultimate Pack | 50,000 | $399.99 | ~25,000 |

详细配置说明见 `PAYPAL_SETUP.md`。

## Creem 支付架构（已弃用）

项目之前使用 Creem 作为支付平台，现已迁移到 PayPal。相关文件已保留但不再使用。

### 已弃用的文件

- `lib/creem/` - Creem 支付相关工具
- `app/api/checkout/` - Creem 支付会话创建 API
- `app/api/webhooks/creem/` - Creem webhook 处理

## 其他页面

- `/` - 主页，图像生成界面
- `/pricing` - 定价页面，购买 credits 包
- `/api-docs` - API 文档页面
- `/quick-start` - 快速入门指南

## Google 登录调试

如果遇到 `redirect_uri_mismatch` 错误（错误 400），请检查：

1. **Supabase 项目设置中的重定向 URL 配置：**
   - 登录 Supabase Dashboard
   - 导航到 Authentication → URL Configuration
   - 在 Redirect URLs 中添加：
     - 开发环境：`http://localhost:3000/auth/callback`
     - 生产环境：`https://your-domain.com/auth/callback`

2. **Google Cloud Console 配置：**
   - 登录 Google Cloud Console
   - 导航到 API & Services → Credentials
   - 找到 OAuth 2.0 客户端 ID
   - 在 Authorized redirect URIs 中添加：
     - 开发环境：`https://your-project-ref.supabase.co/auth/v1/callback`
     - 生产环境：`https://your-project-ref.supabase.co/auth/v1/callback`

3. **调试打印：**
   查看 `app/auth/signin/route.ts` 和 `app/auth/callback/route.ts` 中的日志输出，确保：
   - `redirectTo` 参数正确传递
   - Google OAuth URL 中的 `redirect_uri` 参数与配置一致
