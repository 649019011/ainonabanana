# Creem 支付配置指南

本项目使用 Creem 作为支付平台来处理订阅和一次性付款。

## 前置准备

1. 注册 [Creem 账户](https://www.creem.io/)
2. 在 Creem Dashboard 中创建你的产品

## 环境变量配置

在 `.env.local` 文件中添加以下环境变量：

```env
# Creem 支付配置
CREEM_API_KEY=your_creem_api_key_here
CREEM_API_URL=https://api.creem.io/v1
CREEM_WEBHOOK_SECRET=your_webhook_secret_here

# 产品 ID（在 Creem Dashboard 中创建产品后获取）
CREEM_PRODUCT_BASIC_MONTHLY=prod_xxx_basic_monthly
CREEM_PRODUCT_BASIC_YEARLY=prod_xxx_basic_yearly
CREEM_PRODUCT_PRO_MONTHLY=prod_xxx_pro_monthly
CREEM_PRODUCT_PRO_YEARLY=prod_xxx_pro_yearly
CREEM_PRODUCT_MAX_MONTHLY=prod_xxx_max_monthly
CREEM_PRODUCT_MAX_YEARLY=prod_xxx_max_yearly
```

## 获取 API 密钥

1. 登录 Creem Dashboard
2. 进入 Settings > API Keys
3. 复制你的 API 密钥到 `CREEM_API_KEY`

## 创建产品

在 Creem Dashboard 中创建以下产品：

| 计划 | 类型 | 价格 | 产品 ID 环境变量 |
|------|------|------|------------------|
| Basic | 月付 | $12/月 | CREEM_PRODUCT_BASIC_MONTHLY |
| Basic | 年付 | $144/年 | CREEM_PRODUCT_BASIC_YEARLY |
| Pro | 月付 | $19.50/月 | CREEM_PRODUCT_PRO_MONTHLY |
| Pro | 年付 | $234/年 | CREEM_PRODUCT_PRO_YEARLY |
| Max | 月付 | $80/月 | CREEM_PRODUCT_MAX_MONTHLY |
| Max | 年付 | $960/年 | CREEM_PRODUCT_MAX_YEARLY |

### 创建产品步骤

1. 登录 Creem Dashboard
2. 进入 Products > Create Product
3. 填写产品信息：
   - **Name**: 计划名称（如 "Basic Plan - Monthly"）
   - **Price**: 价格（以分为单位，例如 $12.00 = 1200）
   - **Currency**: USD
   - **Type**: Subscription (订阅) 或 One-time (一次性)
4. 创建后，复制产品 ID 并添加到对应的环境变量中

## 配置 Webhook

1. 登录 Creem Dashboard
2. 进入 Webhooks > Add Webhook
3. 设置 URL: `https://your-domain.com/api/webhooks/creem`
4. 选择要监听的事件：
   - `checkout.completed` - 支付完成
   - `subscription.created` - 订阅创建
   - `subscription.cancelled` - 订阅取消
   - `order.paid` - 订单支付成功
5. 保存后，复制 Webhook Secret 到 `CREEM_WEBHOOK_SECRET`

## 测试支付

Creem 提供测试模式，你可以在不进行真实支付的情况下测试完整的支付流程：

1. 在 Creem Dashboard 中切换到 Test Mode
2. 使用测试卡号进行支付测试
3. 测试完成后，切换到 Live Mode

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

## 故障排查

### 支付页面无法打开

- 检查 `CREEM_API_KEY` 是否正确配置
- 确认产品 ID 是否正确
- 查看浏览器控制台是否有错误信息

### Webhook 未触发

- 确认 Webhook URL 是否可从外网访问
- 检查 `CREEM_WEBHOOK_SECRET` 是否正确
- 查看 Creem Dashboard 中的 Webhook 日志

## 相关文档

- [Creem 官方文档](https://docs.creem.io/)
- [创建 Checkout Session](https://docs.creem.io/guides/create-checkout-session)
- [API 参考](https://docs.creem.io/api-reference/endpoint/create-checkout)
