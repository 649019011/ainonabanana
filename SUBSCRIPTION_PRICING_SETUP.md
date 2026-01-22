# 订阅制定价页面和 PayPal 支付集成配置指南

本文档说明如何配置和使用新的订阅制定价页面。

## 📋 已创建的文件

### 配置文件
- `lib/subscription/config.ts` - 订阅套餐配置

### 组件
- `components/subscription-pricing-content.tsx` - 订阅制定价页面组件

### 页面
- `app/subscription-pricing/page.tsx` - 订阅制定价页面路由

### API 路由
- `app/api/subscription/create-order/route.ts` - 创建订阅订单 API
- `app/api/subscription/capture-order/route.ts` - 捕获订阅支付 API

### 返回页面
- `app/subscription/return/page.tsx` - 订阅支付返回页面

## 🔧 配置步骤

### 1. 配置 PayPal 凭证

在 `.env.local` 文件中添加以下 PayPal 配置：

```env
# PayPal 支付配置

# 前端使用 - Client ID（公开，会暴露在浏览器中）
# 从 PayPal Developer Dashboard 的 Apps & Credentials 页面获取
NEXT_PUBLIC_PAYPAL_CLIENT_ID=你的PayPal_Client_ID

# 后端使用 - Client Secret（保密，仅服务器使用）
# 从 PayPal Developer Dashboard 的 Apps & Credentials 页面获取
PAYPAL_CLIENT_SECRET=你的PayPal_Client_Secret

# PayPal 模式：sandbox（测试）或 live（生产）
# 开发阶段使用 sandbox，正式上线后改为 live
PAYPAL_MODE=sandbox

# 应用 URL 配置（用于 OAuth 回调和支付重定向）
# 开发环境使用 localhost，生产环境改为你的域名
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. 获取 PayPal 凭证

1. **登录 PayPal Developer Dashboard**
   访问：https://developer.paypal.com/dashboard/

2. **创建应用**
   - 导航到 "Apps & Credentials"
   - 点击 "Create App"
   - 选择 "Seller" 或 "Platform" 类型
   - 填写应用名称

3. **获取凭证**
   - 创建应用后，您会看到：
     - **Client ID**: 用于前端（需要添加 `NEXT_PUBLIC_` 前缀）
     - **Client Secret**: 用于后端（保密，不要提交到 Git）

4. **测试模式 vs 生产模式**
   - **Sandbox（测试）**: 使用测试凭证进行开发
   - **Live（生产）**: 正式环境使用真实凭证

### 3. 重启开发服务器

配置完成后，重启 Next.js 开发服务器以加载新的环境变量：

```bash
# 停止当前服务器（Ctrl + C）
# 然后重新启动
npm run dev
```

## 🚀 使用订阅制定价页面

### 访问页面

开发服务器运行后，访问：
- **订阅制定价页面**: http://localhost:3000/subscription-pricing

### 功能说明

#### 1. 订阅套餐

系统提供三个订阅套餐：

| 套餐 | 月付价格 | 年付价格 | 年付折扣 | 月度 Credits |
|------|----------|----------|----------|--------------|
| Basic | $12/月 | $144/年 | 节省 20% | 150 credits (75 图片) |
| Pro | $19.50/月 | $234/年 | 节省 50% | 800 credits (400 图片) |
| Max | $80/月 | $960/年 | 节省 50% | 4600 credits (2300 图片) |

#### 2. 支付流程

```
用户选择套餐 → 切换月付/年付 → 点击 "Get Started" →
创建 PayPal 订单 → 跳转到 PayPal 支付页面 →
用户完成支付 → 自动返回 /subscription/return →
验证支付并添加 credits → 显示成功消息
```

#### 3. Credits 自动充值

- **月付订阅**: 每月自动充值对应的 credits
- **年付订阅**: 一次性充值全年 credits

## 📝 订阅 vs 一次性购买

项目现在有两种购买方式：

### 1. 一次性购买（已有）
- 页面：`/pricing`
- 适合：偶尔使用、不需要定期 credits 的用户
- 特点：credits 永久有效

### 2. 订阅制（新增）
- 页面：`/subscription-pricing`
- 适合：经常使用、需要稳定供应 credits 的用户
- 特点：定期自动充值，年付享受折扣

## 🧪 测试支付流程

### 使用 Sandbox 模式测试

1. **创建测试账号**
   - 登录 https://developer.paypal.com/dashboard/
   - 导航到 "Test Accounts"
   - 创建测试买家账号

2. **完成测试支付**
   - 访问 http://localhost:3000/subscription-pricing
   - 选择套餐并点击 "Get Started"
   - 使用测试账号登录 PayPal
   - 完成支付流程

3. **验证结果**
   - 支付成功后应该返回 `/subscription/return` 页面
   - 显示成功消息和新的 credits 余额
   - 检查数据库中的 `credit_transactions` 表

## 🔒 生产环境部署

### 1. 更新环境变量

在生产环境中设置：

```env
# 使用生产环境的 PayPal 凭证
PAYPAL_MODE=live
NEXT_PUBLIC_PAYPAL_CLIENT_ID=生产环境_Client_ID
PAYPAL_CLIENT_SECRET=生产环境_Client_Secret

# 更新应用 URL
NEXT_PUBLIC_APP_URL=https://你的域名.com
```

### 2. PayPal 生产配置

1. 在 PayPal Developer Dashboard 切换到 "Live" 模式
2. 使用生产凭证创建应用
3. 配置 Webhook（可选，用于接收支付通知）

### 3. 安全注意事项

- ⚠️ **永远不要**将 `PAYPAL_CLIENT_SECRET` 提交到 Git
- ⚠️ ⚠️ **永远不要**在前端代码中使用 Client Secret
- ✅ 使用环境变量管理敏感信息
- ✅ 定期轮换 API 凭证

## 🐛 故障排查

### 问题：Payment not configured

**原因**: PayPal 凭证未正确配置

**解决方案**:
1. 检查 `.env.local` 文件是否存在
2. 确认 `NEXT_PUBLIC_PAYPAL_CLIENT_ID` 和 `PAYPAL_CLIENT_SECRET` 已设置
3. 重启开发服务器

### 问题：PayPal 订单创建失败

**原因**: PayPal API 调用失败

**解决方案**:
1. 检查控制台日志中的错误信息
2. 验证 PayPal 凭证是否正确
3. 确认网络可以访问 PayPal API
4. 检查 PayPal 账户状态

### 问题：支付成功但 credits 未添加

**原因**: 捕获订单或添加 credits 失败

**解决方案**:
1. 检查 `/api/subscription/capture-order` 的日志
2. 验证 Supabase 数据库连接
3. 检查 `user_credits` 和 `credit_transactions` 表

## 📚 相关文档

- [PayPal Checkout 文档](https://developer.paypal.com/docs/checkout/)
- [PayPal Orders API](https://developer.paypal.com/docs/api/orders/v2/)
- [项目 CLAUDE.md](./CLAUDE.md) - 项目整体说明

## 💡 下一步

1. ✅ 配置 PayPal 凭证
2. ✅ 测试订阅支付流程
3. ✅ 验证 credits 自动添加
4. ✅ 部署到生产环境

---

如有问题，请参考 PayPal 官方文档或查看控制台日志进行调试。
