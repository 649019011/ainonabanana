# Google 登录配置说明

本文档说明如何配置 Supabase Google 登录功能。

## 前置条件

1. 一个 Supabase 项目
2. 一个 Google Cloud 项目

## 步骤 1：配置 Supabase

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **Authentication** > **Providers**
4. 找到 **Google** 提供者并启用它

### 获取 Supabase 环境变量

1. 在 Supabase Dashboard 中，进入 **Settings** > **API**
2. 复制以下值：
   - `Project URL` - 作为 `SUPABASE_URL`
   - `anon public` key - 作为 `SUPABASE_ANON_KEY`

## 步骤 2：配置 Google OAuth

### 创建 Google Cloud 项目（如果还没有）

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建一个新项目或选择现有项目

### 配置 OAuth 同意屏幕

1. 在 Google Cloud Console 中，进入 **APIs & Services** > **OAuth consent screen**
2. 选择 **External** 用户类型
3. 填写应用信息：
   - 应用名称
   - 应用 logo（可选）
   - 支持邮箱
4. 添加所需的范围（Scopes）：
   - `openid`
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`

### 创建 OAuth 客户端 ID

1. 进入 **APIs & Services** > **Credentials**
2. 点击 **Create Credentials** > **OAuth client ID**
3. 选择应用类型：**Web application**
4. 配置授权来源：
   - **Authorized JavaScript origins**：
     - 开发环境：`http://localhost:3000`
     - 生产环境：`https://your-domain.com`
5. 配置授权重定向 URI：
   - 开发环境：`http://localhost:3000/auth/callback`
   - 生产环境：`https://your-domain.com/auth/callback`
   - Supabase 回调 URL（从 Supabase Dashboard 的 Google 提供者页面获取）
6. 点击创建并保存：
   - **Client ID**
   - **Client Secret**

### 在 Supabase 中配置 Google 提供者

1. 回到 Supabase Dashboard
2. 进入 **Authentication** > **Providers** > **Google**
3. 填入以下信息：
   - **Client ID**：从 Google OAuth 客户端获取
   - **Client Secret**：从 Google OAuth 客户端获取
4. 点击 **Save**

## 步骤 3：配置环境变量

1. 在项目根目录创建 `.env.local` 文件：

```bash
# 复制示例文件
cp .env.example .env.local
```

2. 编辑 `.env.local` 文件，填入实际值：

```env
# Supabase 环境变量配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 本地开发（可选）

如果需要在本地开发环境中测试 Google 登录，需要设置额外的环境变量：

```env
# Google OAuth 客户端密钥（仅本地开发需要）
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**注意**：在本地开发时，还需要在项目的 `config.toml` 文件中配置（如果使用 Supabase CLI）：

```toml
[auth.external.google]
enabled = true
client_id = "your-google-client-id"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
skip_nonce_check = false
```

## 步骤 4：启动应用

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000，点击右上角的 "Google 登录" 按钮。

## 认证流程

### 服务器端认证（当前实现）

本项目使用服务器端认证方式，具有以下优势：

1. **更安全**：密钥不会暴露在客户端
2. **更好的会话管理**：使用 HTTP-only cookies
3. **支持 SSR**：可以在服务器组件中获取用户信息

### 认证流程图

```
用户点击登录
    ↓
重定向到 /auth/signin
    ↓
Supabase 生成 Google OAuth URL
    ↓
重定向到 Google 授权页面
    ↓
用户授权
    ↓
Google 重定向到 /auth/callback
    ↓
交换 code 为 session
    ↓
session 保存到 cookie
    ↓
重定向回首页（已登录状态）
```

## 文件结构

```
├── app/
│   ├── auth/
│   │   ├── callback/
│   │   │   └── route.ts       # OAuth 回调处理
│   │   ├── signin/
│   │   │   └── route.ts       # 登录路由
│   │   └── signout/
│   │       └── route.ts       # 登出路由
├── components/
│   └── auth-button.tsx         # 登录/用户信息组件
├── lib/
│   └── supabase/
│       ├── config.ts           # Supabase 配置
│       ├── client.ts           # 客户端 Supabase 客户端
│       ├── server.ts           # 服务器端 Supabase 客户端
│       └── middleware.ts       # 会话更新中间件
└── middleware.ts               # Next.js 中间件
```

## 使用示例

### 在服务器组件中获取用户信息

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>未登录</div>
  }

  return <div>欢迎, {user.email}</div>
}
```

### 在客户端组件中获取用户信息

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function ClientComponent() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [supabase])

  if (!user) {
    return <div>未登录</div>
  }

  return <div>欢迎, {user.email}</div>
}
```

## 故障排除

### 问题：登录后重定向到错误页面

**解决方案**：
1. 检查 `.env.local` 中的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确
2. 确认 Supabase Dashboard 中 Google 提供者的 Client ID 和 Secret 正确
3. 确认 Google OAuth 客户端的重定向 URI 包含 `/auth/callback`

### 问题：CORS 错误

**解决方案**：
1. 在 Supabase Dashboard 中，进入 **Authentication** > **URL Configuration**
2. 确认你的网站 URL 已添加到 **Site URL** 和 **Redirect URLs**

### 问题：登录后没有保持登录状态

**解决方案**：
1. 检查浏览器控制台是否有错误
2. 确认 middleware.ts 正确配置
3. 清除浏览器 cookie 并重试

## 生产环境部署

在部署到生产环境前，请确保：

1. ✅ 在部署平台（如 Vercel）中配置环境变量
2. ✅ 更新 Google OAuth 客户端的重定向 URI
3. ✅ 在 Supabase Dashboard 中添加生产域名
4. ✅ 移除 `localhost` 相关的配置

## 参考文档

- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [Next.js App Router 文档](https://nextjs.org/docs/app)
