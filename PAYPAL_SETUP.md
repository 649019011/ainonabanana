# PayPal 支付集成配置指南

本文档介绍如何为 Nano Banana 图像编辑网站配置 PayPal 支付功能。

## 概述

本项目使用 PayPal 进行一次性付款，用户可以购买不同大小的 credits 包。支付流程如下：

```
用户点击 "Buy Now" → 调用 /api/paypal/create-order → 返回 PayPal Order ID → 使用 PayPal JS SDK 打开支付窗口 → 用户完成支付 → 调用 /api/paypal/capture-order → 支付完成
```

## 步骤 1：创建 PayPal Developer 账户

1. 访问 [PayPal Developer](https://developer.paypal.com/dashboard/)
2. 使用你的 PayPal 账户登录
3. 创建开发者账户（免费）

## 步骤 2：创建 PayPal 应用

1. 在 PayPal Developer Dashboard 中，导航到 **Apps & Credentials**
2. 点击 **Create App** 按钮
3. 填写应用信息：
   - **App name**: Nano Banana Image Editor
   - **Select app type**: Merchant
4. 选择 **Sandbox** 模式用于测试
5. 创建后，你会看到：
   - **Client ID**: 以 `Ab` 开头（用于前端）
   - **Client Secret**: 以 `EK` 开头（用于后端）

## 步骤 3：配置环境变量

在项目根目录的 `.env.local` 文件中添加以下环境变量：

```env
# PayPal 支付配置
# 前端使用 - Client ID（公开）
NEXT_PUBLIC_PAYPAL_CLIENT_ID=你的_PayPal_Client_ID

# 后端使用 - Client Secret（保密）
PAYPAL_CLIENT_SECRET=你的_PayPal_Client_Secret

# PayPal 模式：sandbox（测试）或 live（生产）
PAYPAL_MODE=sandbox
```

**重要提示**：
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` 是公开的，会被暴露在前端代码中
- `PAYPAL_CLIENT_SECRET` 是机密的，只用于后端 API 调用
- 测试时使用 `sandbox` 模式，正式上线时改为 `live`

## 步骤 4：获取测试账户（Sandbox 模式）

在 Sandbox 模式下测试时，需要使用 PayPal 提供的测试账户：

1. 在 PayPal Developer Dashboard 中，导航到 **Apps & Credentials**
2. 滚动到 **Sandbox** 部分
3. 点击 **Sandbox accounts** 下的 **View accounts** 或直接访问 https://developer.paypal.com/dashboard/accounts/sandbox
4. 你会看到一个默认的测试商家账户和测试买家账户
5. 点击测试账户旁的 **...** 菜单，选择 **View/Edit account** 可以查看登录凭据
6. 使用这些凭据登录 https://www.sandbox.paypal.com 测试支付

## 步骤 5：测试支付流程

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问 `http://localhost:3000/pricing`

3. 确保已登录（需要先通过 Supabase OAuth 登录）

4. 点击任意 credits 包的 "Buy Now" 按钮

5. 在弹出的 PayPal 支付窗口中：
   - 使用 Sandbox 测试买家账户登录
   - 完成支付流程

6. 支付成功后，你应该看到 "购买成功" 的提示

## 步骤 6：切换到生产环境

当准备上线时：

1. 在 PayPal Developer Dashboard 中，在 **Live** 模式下创建应用
2. 获取生产环境的 Client ID 和 Client Secret
3. 更新 `.env.local`：
   ```env
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=你的_生产环境_Client_ID
   PAYPAL_CLIENT_SECRET=你的_生产环境_Client_Secret
   PAYPAL_MODE=live
   ```

## Credits 包配置

当前配置的 credits 包（在 `lib/paypal/config.ts` 中）：

| 包名 | Credits | 价格 | 大约图片数 |
|------|---------|------|------------|
| Starter Pack | 500 | $9.99 | ~250 |
| Standard Pack | 2,000 | $29.99 | ~1,000 |
| Pro Pack | 10,000 | $99.99 | ~5,000 |
| Ultimate Pack | 50,000 | $399.99 | ~25,000 |

要修改价格或添加新的 credits 包，编辑 `lib/paypal/config.ts` 文件中的 `PAYPAL_CREDITS_PACKS` 配置。

## API 端点

### 创建订单

**POST** `/api/paypal/create-order`

请求体：
```json
{
  "packId": "small|medium|large|ultra",
  "userId": "user_123"
}
```

响应：
```json
{
  "success": true,
  "orderId": "PayPal_Order_ID",
  "packId": "small",
  "credits": 500,
  "amount": 9.99
}
```

### 捕获支付

**POST** `/api/paypal/capture-order`

请求体：
```json
{
  "orderId": "PayPal_Order_ID"
}
```

响应：
```json
{
  "success": true,
  "orderId": "PayPal_Order_ID",
  "captureId": "Capture_ID",
  "packId": "small",
  "userId": "user_123",
  "amount": "9.99",
  "currency": "USD",
  "status": "COMPLETED"
}
```

## 存储用户 Credits

支付成功后，你需要将 credits 添加到用户的账户中。建议的实现方式：

1. 在 Supabase 数据库中创建 `user_credits` 表：
   ```sql
   CREATE TABLE user_credits (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users NOT NULL,
     balance INTEGER DEFAULT 0,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. 创建 `credit_transactions` 表记录交易：
   ```sql
   CREATE TABLE credit_transactions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users NOT NULL,
     amount INTEGER NOT NULL,
     type TEXT NOT NULL, -- 'purchase' or 'usage'
     reference_id TEXT, -- PayPal order ID
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. 在 `app/api/paypal/capture-order/route.ts` 中，支付成功后添加逻辑更新用户 credits 余额

## 常见问题

### Q: PayPal 按钮没有显示？
A: 检查以下几点：
- 确保 `.env.local` 中配置了 `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- 检查浏览器控制台是否有 JavaScript 错误
- 确认网络可以访问 `https://www.paypal.com/sdk/js`

### Q: 支付时出现 "Invalid Client ID" 错误？
A:
- 确保 Client ID 正确复制（以 `Ab` 开头）
- Sandbox 模式和 Live 模式使用不同的 Client ID

### Q: 支付成功但 credits 没有增加？
A: 当前代码中需要手动添加 credits 更新逻辑。参考上面的 "存储用户 Credits" 部分。

## 安全提示

1. **永远不要**将 `PAYPAL_CLIENT_SECRET` 提交到 Git 仓库
2. 确保 `.env.local` 在 `.gitignore` 中
3. 在生产环境使用环境变量管理服务（如 Vercel Environment Variables）
4. 验证 webhook 或支付回调的签名（如果使用 PayPal Webhooks）

## 资源链接

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal REST API Reference](https://developer.paypal.com/docs/api/overview/)
- [PayPal JS SDK](https://developer.paypal.com/sdk/js/reference/)
- [PayPal Sandbox Guide](https://developer.paypal.com/tools/sandbox/)

## 从 Creem 迁移

如果你之前使用 Creem 支付：

1. Creem 相关文件已保留在项目中
2. 要完全移除 Creem，可以删除：
   - `lib/creem/` 目录
   - `app/api/checkout/` 目录
   - `app/api/webhooks/creem/` 目录
   - 从 `.env.local` 移除 Creem 相关环境变量

3. PayPal 集成已完成，可以直接使用

---

如有问题或需要帮助，请参考 [PayPal Developer Documentation](https://developer.paypal.com/docs/) 或创建 issue。
