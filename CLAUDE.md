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
```

详细配置说明见 `AUTH_SETUP.md`。

## 图像生成架构

本项目使用 OpenRouter API 调用 Google Gemini 2.5 Flash 模型进行 AI 图像编辑。

### 图像生成流程

```
用户上传图片 → 前端压缩并转 base64 → POST /api/generate → OpenRouter API → Gemini 2.5 Flash → 返回图片 URL → 展示在 Output Gallery
```

### API 路由（app/api/generate/route.ts）

- 接收 `image`（base64 data URL 或 URL）和 `prompt`（文本提示词）
- 调用 OpenRouter 的 `google/gemini-2.5-flash-image` 模型
- 从复杂的响应结构中提取图片 URL
- 支持多种响应格式：data URL、HTTP URL、base64 等

### 前端处理（app/page.tsx）

- 图片上传时自动压缩：最大 2048px 边长，JPEG 0.92 质量
- 支持 10MB 以内的图片文件
- 生成结果存储在本地 state 中，展示在 Output Gallery

## 目录结构

- `app/` - Next.js App Router 页面
  - `layout.tsx` - 根布局，包含字体（Geist、Geist Mono）和 Analytics
  - `page.tsx` - 主落地页（客户端组件，含图片上传 UI）
  - `globals.css` - Tailwind v4 导入和主题 CSS 自定义属性
  - `auth/` - 认证路由（signin、callback、signout）
  - `api/generate/` - 图像生成 API 路由，使用 OpenRouter 调用 Gemini 2.5 Flash

- `components/` - React 组件
  - `ui/` - shadcn/ui/Radix UI 基础组件（60+ 个组件）
  - `theme-provider.tsx` - 主题上下文提供者
  - `auth-button.tsx` - 登录/用户信息组件

- `lib/` - 工具函数
  - `utils.ts` - `cn()` 辅助函数，用于合并 Tailwind 类名
  - `supabase/` - Supabase 认证相关工具

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
