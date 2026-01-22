# Creem 支付集成指南

本文档介绍如何在 Nano Banana 项目中配置和使用 Creem 支付平台。

## 目录

- [概述](#概述)
- [注册 Creem 账户](#注册-creem-账户)
- [创建产品](#创建产品)
- [配置环境变量](#配置环境变量)
- [配置 Webhook](#配置-webhook)
- [测试支付](#测试支付)
- [生产环境部署](#生产环境部署)

---

## 概述

Creem 是一个支付基础设施平台，作为 Merchant of Record 为你处理：
- 全球税务合规（VAT、GST、销售税）
- 支付处理
- 订阅管理
- 退款处理

本项目使用 Creem 来处理订阅支付，支持以下套餐：
- **Basic** - $12/月 或 $144/年（1800 credits/年）
- **Pro** - $19.50/月 或 $234/年（9600 credits/年）
- **Max** - $80/月 或 $960/年（55200 credits/年）

---

## 注册 Creem 账户

1. 访问 [Creem官网](https://creem.io) 注册账户
2. 完成邮箱验证
3. 在 Dashboard 中完成商家设置

---

## 创建产品

在 Creem Dashboard 中创建 6 个产品（每个套餐的月付和年付版本）：

### Basic 套餐

1. 创建月付产品：
   - 名称：`Basic Monthly`
   - 类型：订阅
   - 价格：$12.00
   - 计费周期：每月
   - 产品 ID：记录下此 ID，填入环境变量 `CREEM_PRODUCT_BASIC_MONTHLY`

2. 创建年付产品：
   - 名称：`Basic Yearly`
   - 类型：订阅
   - 价格：$144.00
   - 计费周期：每年
   - 产品 ID：记录下此 ID，填入环境变量 `CREEM_PRODUCT_BASIC_YEARLY`

### Pro 套餐

3. 创建月付产品：
   - 名称：`Pro Monthly`
   - 类型：订阅
   - 价格：$19.50
   - 计费周期：每月
   - 产品 ID：记录下此 ID，填入环境变量 `CREEM_PRODUCT_PRO_MONTHLY`

4. 创建年付产品：
   - 名称：`Pro Yearly`
   - 类型：订阅
   - 价格：$234.00
   - 计费周期：每年
   - 产品 ID：记录下此 ID，填入环境变量 `CREEM_PRODUCT_PRO_YEARLY`

### Max 套餐

5. 创建月付产品：
   - 名称：`Max Monthly`
   - 类型：订阅
   - 价格：$80.00
   - 计费周期：每月
   - 产品 ID：记录下此 ID，填入环境变量 `CREEM_PRODUCT_MAX_MONTHLY`

6. 创建年付产品：
   - 名称：`Max Yearly`
   - 类型：订阅
   - 价格：$960.00
   - 计费周期：每年
   - 产品 ID：记录下此 ID，填入环境变量 `CREEM_PRODUCT_MAX_YEARLY`

---

## 配置环境变量

在 `.env.local` 文件中添加以下环境变量：

```bash
# Creem API 密钥
# 在 Creem Dashboard > Developers 中获取
CREEM_API_KEY=creem_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Creem API URL
# 测试环境：https://test-api.creem.io/v1
# 生产环境：https://api.creem.io/v1
CREEM_API_URL=https://test-api.creem.io/v1

# Creem Webhook 密钥
# 在 Creem Dashboard > Developers > Webhooks 中配置
CREEM_WEBHOOK_SECRET=your_webhook_secret_here

# 产品 ID（从 Creem Dashboard 复制）
CREEM_PRODUCT_BASIC_MONTHLY=prod_xxx_basic_monthly
CREEM_PRODUCT_BASIC_YEARLY=prod_xxx_basic_yearly
CREEM_PRODUCT_PRO_MONTHLY=prod_xxx_pro_monthly
CREEM_PRODUCT_PRO_YEARLY=prod_xxx_pro_yearly
CREEM_PRODUCT_MAX_MONTHLY=prod_xxx_max_monthly
CREEM_PRODUCT_MAX_YEARLY=prod_xxx_max_yearly
```

---

## 配置 Webhook

Webhook 用于接收 Creem 的支付通知，自动为用户添加 credits。

### 1. 创建 Webhook 端点

在 Creem Dashboard 中：
1. 导航到 **Developers** > **Webhooks**
2. 点击 **Add Webhook**
3. 输入 Webhook URL：
   ```
   https://your-domain.com/api/webhooks/creem
   ```
4. 选择要监听的事件：
   - `checkout.completed` - 支付完成
   - `subscription.created` - 订阅创建
   - `subscription.cancelled` - 订阅取消
   - `order.paid` - 订单支付

### 2. 配置 Webhook 密钥

1. 在 Webhook 配置页面生成一个密钥
2. 将密钥复制到环境变量 `CREEM_WEBHOOK_SECRET`

### 3. 本地开发测试

使用 ngrok 或类似工具将本地开发服务器暴露到公网：

```bash
# 安装 ngrok
npm install -g ngrok

# 启动 ngrok 隧道
ngrok http 3000

# 使用 ngrok 提供的 HTTPS URL 配置 Webhook
# 例如：https://abc123.ngrok.io/api/webhooks/creem
```

---

## 测试支付

### 测试模式

Creem 提供测试模式，可以在不进行真实支付的情况下测试支付流程。

确保 `.env.local` 中使用测试 API URL：
```bash
CREEM_API_URL=https://test-api.creem.io/v1
```

### 测试流程

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问 `/pricing` 页面

3. 点击任意套餐的 "Get Started" 按钮

4. 完成测试支付流程

5. 检查：
   - 用户是否收到对应的 credits
   - 交易记录是否正确创建
   - Webhook 日志是否显示处理成功

### 查看日志

检查 Vercel/服务器日志，查找以下信息：
- `Checkout completed:` - 支付完成事件
- `Successfully added X credits to user Y` - Credits 添加成功
- `Failed to add credits:` - Credits 添加失败

---

## 生产环境部署

### 1. 更新 API URL

将 `.env.production` 或生产环境变量更新为：
```bash
CREEM_API_URL=https://api.creem.io/v1
```

### 2. 更新产品 ID

确保使用 Creem Dashboard 中**生产环境**的产品 ID。

### 3. 配置生产 Webhook

将生产环境的 Webhook URL 更新为：
```
https://your-production-domain.com/api/webhooks/creem
```

### 4. 测试真实支付

1. 使用小金额测试真实支付
2. 验证整个支付流程
3. 确认 credits 正确添加

---

## Credits 发放逻辑

当用户成功支付后，系统会自动为其添加 credits：

| 套餐 | 月付 Credits | 年付 Credits |
|------|-------------|-------------|
| Basic | 150 | 1800 |
| Pro | 800 | 9600 |
| Max | 4600 | 55200 |

Credits 在以下情况下添加：
- 首次订阅支付成功（`checkout.completed`）
- 定期订阅续费（`order.paid`）

---

## 故障排查

### 支付后未收到 Credits

1. 检查 Webhook 日志确认事件是否被接收
2. 检查 `metadata` 中是否包含 `userId` 和 `planId`
3. 检查数据库函数 `add_credits` 是否正常工作

### Webhook 验证失败

1. 确认 `CREEM_WEBHOOK_SECRET` 环境变量正确
2. 检查 Webhook 签名头 `x-creem-signature` 是否存在
3. 确保 webhook secret 与 Creem Dashboard 中配置的一致

### 产品 ID 无效

1. 确认产品 ID 来自正确的环境（测试/生产）
2. 检查产品状态是否为 "active"
3. 确认产品已正确配置为订阅类型

---

## API 端点

### 创建 Checkout Session

```
POST /api/checkout
Content-Type: application/json

{
  "planId": "basic|pro|max",
  "billingPeriod": "monthly|yearly",
  "userEmail": "[email protected]",
  "metadata": {
    "userId": "user_123"
  }
}
```

### Webhook 处理

```
POST /api/webhooks/creem
Content-Type: application/json
X-Creem-Signature: <signature>

{
  "event": "checkout.completed",
  "data": { ... }
}
```

---

## 相关文件

- `lib/creem/config.ts` - Creem 配置和类型定义
- `lib/creem/client.ts` - Creem API 客户端
- `app/api/checkout/route.ts` - 创建支付会话 API
- `app/api/webhooks/creem/route.ts` - Webhook 处理
- `components/pricing-page-content.tsx` - Pricing 页面组件

---

## 获取帮助

- [Creem 文档](https://docs.creem.io)
- [Creem API 参考](https://docs.creem.io/api-reference/introduction)
- [Creem 支持团队](https://creem.io/support)
