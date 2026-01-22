# Supabase Google OAuth 设置检查清单

## 步骤 1: Supabase 项目设置

### 1.1 在 Supabase Dashboard 中启用 Google Provider

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 导航到 **Authentication → Providers**
4. 找到 **Google** 并点击进入
5. 确保 **Enable Google provider** 已开启
6. **重要**：记下以下信息：
   - **Callback URL**（会在页面上显示）
   - 格式通常是：`https://[your-project-ref].supabase.co/auth/v1/callback`

### 1.2 配置 Redirect URLs

1. 在 Supabase Dashboard 中，导航到 **Authentication → URL Configuration**
2. 在 **Redirect URLs** 部分，确保添加了以下 URL：

```
http://localhost:3000/auth/callback
```

3. 如果有生产环境域名，也要添加：

```
https://your-domain.com/auth/callback
```

---

## 步骤 2: Google Cloud Console 设置

### 2.1 获取 OAuth 2.0 客户端 ID

1. 登录 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择您的项目（或创建新项目）
3. 导航到 **APIs & Services → Credentials**
4. 点击 **+ CREATE CREDENTIALS**
5. 选择 **OAuth 2.0 Client ID**
6. 如果提示配置同意屏幕，先配置：
   - **OAuth consent screen** → 选择 **External** → 填写应用信息
7. 创建 **OAuth 2.0 Client ID**：
   - **Application type**: Web application
   - **Name**: Nano Banana (或任意名称)

### 2.2 配置 Authorized redirect URIs

在创建 OAuth 2.0 Client ID 时，在 **Authorized redirect URIs** 部分添加：

```
https://[your-project-ref].supabase.co/auth/v1/callback
```

**注意**：
- 这个 URL 必须与 Supabase Dashboard 中显示的 Callback URL 完全一致
- 必须以 `/auth/v1/callback` 结尾
- 不要有尾部斜杠
- 使用 `https://` 不是 `http://`

### 2.3 获取客户端凭据

创建完成后，您会看到：
- **Client ID**: 以 `.apps.googleusercontent.com` 结尾
- **Client Secret**: 一串随机字符

### 2.4 将凭据添加到 Supabase

1. 返回 Supabase Dashboard
2. 导航到 **Authentication → Providers → Google**
3. 填写以下信息：
   - **Client ID**: 粘贴 Google 的 Client ID
   - **Client Secret**: 粘贴 Google 的 Client Secret
4. 点击 **Save**

---

## 步骤 3: 本地环境变量配置

检查 `.env.local` 文件（位于项目根目录）：

```env
# Supabase 配置
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# 注意：
# 1. SUPABASE_URL 不要以 / 结尾
# 2. SUPABASE_ANON_KEY 可以在 Supabase Dashboard → Settings → API 找到
```

### 如何获取 ANON KEY

1. 在 Supabase Dashboard 中，导航到 **Settings → API**
2. 复制 **anon public** 密钥

---

## 步骤 4: 验证配置

### 4.1 检查 Supabase URL 配置正确

在浏览器中访问（替换 your-project-ref）：

```
https://your-project-ref.supabase.co/auth/v1/user
```

如果返回以下内容，说明 URL 正确：
```json
{"code":"missing_api_key","message":"API key missing..."}
```

### 4.2 检查环境变量是否被正确读取

在项目根目录运行：

```bash
# Windows (PowerShell)
$env:SUPABASE_URL
$env:SUPABASE_ANON_KEY

# Windows (CMD)
echo %SUPABASE_URL%
echo %SUPABASE_ANON_KEY%

# Mac/Linux
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

---

## 步骤 5: 测试登录流程

### 5.1 清除浏览器数据

在测试前：
1. 清除浏览器 Cookies
2. 或者使用无痕/隐私模式

### 5.2 查看服务器日志

在终端运行开发服务器：

```bash
npm run dev
```

### 5.3 尝试登录并观察日志

点击 **Sign in with Google**，服务器端应该显示：

```
[Google Signin] === Google OAuth 登录开始 ===
[Google Signin] 请求 URL: http://localhost:3000/auth/signin
[Google Signin] 原始域名: http://localhost:3000
[Google Signin] 完整的 redirectTo: http://localhost:3000/auth/callback?next=/
[Google Signin] Supabase URL: https://your-project-ref.supabase.co
[Google Signin] Google redirect_uri 参数: https://your-project-ref.supabase.co/auth/v1/callback
[Google Signin] === Google OAuth 登录结束，重定向到 Google ===
```

然后在 Google 授权后：

```
[Google Callback] === Google OAuth 回调开始 ===
[Google Callback] 请求 URL: http://localhost:3000/auth/callback?code=...&next=/
[Google Callback] code 参数: 存在
[Google Callback] 开始交换 code 为 session...
[Google Callback] 设置 Cookies 数量: 2
[Google Callback] Session 交换成功
[Google Callback] 用户 ID: xxx-xxx-xxx
[Google Callback] 用户邮箱: [email protected]
[Google Callback] === Google OAuth 回调结束 ===
```

---

## 常见问题排查

### 问题 1: redirect_uri_mismatch (错误 400)

**原因**: Google Cloud Console 中的 redirect URI 与实际请求的不匹配

**解决**:
1. 检查服务器日志中的 `[Google Signin] Google redirect_uri 参数:`
2. 确保这个 URL 完全添加在 Google Cloud Console 的 **Authorized redirect URIs** 中

### 问题 2: Code verifier 相关错误

**原因**: Supabase PKCE 配置问题

**解决**:
1. 确保 Supabase 项目是最新版本
2. 清除浏览器 Cookies 和本地存储
3. 重新尝试登录

### 问题 3: 环境变量未加载

**原因**: `.env.local` 文件位置错误或未重启服务器

**解决**:
1. 确保 `.env.local` 在项目根目录（与 `package.json` 同级）
2. 重启开发服务器：`npm run dev`
3. 检查服务器日志中的 `[Supabase Server Client] Cookies 数量`

### 问题 4: 登录成功但按钮不变

**原因**: 客户端状态未更新

**解决**:
1. 查看浏览器控制台是否有 `[AuthButton]` 日志
2. 检查是否有 `[API /api/auth/user]` 日志显示用户信息
3. 刷新页面（F5）

---

## 完整的 URL 列表对照表

| 用途 | URL |
|------|-----|
| Supabase 项目 URL | `https://your-project-ref.supabase.co` |
| Google OAuth 回调 (在 Google Console 配置) | `https://your-project-ref.supabase.co/auth/v1/callback` |
| 应用回调 (在 Supabase Dashboard 配置) | `http://localhost:3000/auth/callback` |
| 登录入口 | `http://localhost:3000/auth/signin` |
| 回调处理 | `http://localhost:3000/auth/callback` |

---

## 快速检查命令

在浏览器控制台运行以下命令检查配置：

```javascript
// 检查是否能访问 Supabase API
fetch('https://your-project-ref.supabase.co/auth/v1/user')
  .then(r => r.json())
  .then(console.log)

// 检查本地 API 是否能获取用户
fetch('/api/auth/user')
  .then(r => r.json())
  .then(console.log)
```
