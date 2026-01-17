# Credits 系统配置指南

本文档介绍如何为 Nano Banana 图像编辑网站配置和运行 Credits 系统。

## 概述

Credits 系统允许用户购买 credits 包，并使用这些 credits 来生成图像。系统包括：

- **数据库表**：存储用户余额和交易历史
- **API 端点**：管理余额、扣除 credits、查询交易
- **前端组件**：显示余额和使用 credits
- **支付集成**：通过 PayPal 购买 credits

## 系统架构

```
用户购买 credits → PayPal 支付成功 → 添加 credits 到账户 → 生成图像时扣除 credits
```

## 步骤 1：运行数据库迁移

在 Supabase 中执行数据库迁移脚本以创建必要的表和函数。

### 方法 1：通过 Supabase Dashboard

1. 访问你的 Supabase 项目 Dashboard
2. 导航到 **SQL Editor**
3. 点击 **New Query**
4. 复制 `supabase/migrations/20240117000001_create_credits_tables.sql` 的内容
5. 粘贴到 SQL Editor 中
6. 点击 **Run** 执行

### 方法 2：通过 Supabase CLI

如果你已安装 Supabase CLI：

```bash
# 进入项目目录
cd D:\codex\image-editor-website

# 如果是本地开发环境
supabase db reset

# 如果是远程生产环境
supabase db push
```

## 数据库表结构

### user_credits 表

存储用户的 credits 余额：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID（外键关联 auth.users） |
| balance | INTEGER | 当前余额 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### credit_transactions 表

记录所有 credits 交易：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| amount | INTEGER | 交易数量（正数为充值，负数为消耗） |
| balance_after | INTEGER | 交易后的余额 |
| type | TEXT | 交易类型：purchase/usage/refund/bonus |
| reference_id | TEXT | 参考 ID（PayPal 订单 ID 等） |
| description | TEXT | 交易描述 |
| pack_id | TEXT | 购买的 credits 包 ID |
| metadata | JSONB | 额外元数据 |
| created_at | TIMESTAMPTZ | 创建时间 |

## 数据库函数

迁移脚本会创建以下辅助函数：

### add_credits()

为用户充值 credits：

```sql
SELECT * FROM add_credits(
  p_user_id := 'user-uuid',
  p_amount := 500,
  p_type := 'purchase',
  p_reference_id := 'paypal-order-id',
  p_description := 'Purchased Starter Pack',
  p_pack_id := 'small',
  p_metadata := '{"paypalOrderId": "..."}'::jsonb
);
```

### deduct_credits()

扣除用户 credits：

```sql
SELECT * FROM deduct_credits(
  p_user_id := 'user-uuid',
  p_amount := 2,
  p_description := 'Image generation',
  p_metadata := '{"source": "web"}'::jsonb
);
```

## API 端点

### 获取用户余额

**GET** `/api/credits/balance`

返回当前登录用户的 credits 余额。

响应示例：
```json
{
  "success": true,
  "balance": 500,
  "userId": "user-uuid"
}
```

### 扣除 Credits

**POST** `/api/credits/deduct`

扣除用户 credits（用于图像生成）。

请求体：
```json
{
  "amount": 2
}
```

响应示例：
```json
{
  "success": true,
  "transactionId": "transaction-uuid",
  "balance": 498,
  "deducted": 2
}
```

错误响应（余额不足）：
```json
{
  "error": "Insufficient credits",
  "currentBalance": 1,
  "required": 2
}
```

### 获取交易历史

**GET** `/api/credits/transactions?limit=50&offset=0`

返回当前登录用户的交易历史。

响应示例：
```json
{
  "success": true,
  "transactions": [
    {
      "id": "transaction-uuid",
      "amount": 500,
      "balanceAfter": 500,
      "type": "purchase",
      "description": "Purchased Starter Pack",
      "packId": "small",
      "createdAt": "2026-01-17T10:00:00Z"
    }
  ],
  "count": 1
}
```

## 前端使用

### CreditsDisplay 组件

显示用户当前余额：

```tsx
import { CreditsDisplay } from '@/components/credits-display'

<CreditsDisplay initialUser={user} />
```

### 检查余额并扣除 credits

```tsx
import { CREDITS_PER_IMAGE } from '@/lib/credits/config'
import { deductCreditsForGeneration } from '@/lib/credits/client'

// 检查余额
if (userBalance < CREDITS_PER_IMAGE) {
  // 提示用户余额不足
  return
}

// 扣除 credits
const result = await deductCreditsForGeneration(CREDITS_PER_IMAGE)

if (result.success) {
  // 余额足够，继续生成图像
  console.log('新余额:', result.balance)
} else {
  // 扣除失败
  console.error('错误:', result.error)
}
```

### 刷新余额显示

支付成功或扣除 credits 后，刷新显示：

```tsx
if (typeof window !== 'undefined' && (window as any).refreshCreditsDisplay) {
  ;(window as any).refreshCreditsDisplay()
}
```

## Credits 消耗配置

当前配置（在 `lib/credits/config.ts` 中）：

```typescript
export const CREDITS_PER_IMAGE = 2
```

这意味着生成一张图像需要 2 credits。

## Credits 包配置

可购买的 credits 包：

| 包名 | Credits | 价格 | 大约图片数 |
|------|---------|------|------------|
| Starter Pack | 500 | $9.99 | ~250 |
| Standard Pack | 2,000 | $29.99 | ~1,000 |
| Pro Pack | 10,000 | $99.99 | ~5,000 |
| Ultimate Pack | 50,000 | $399.99 | ~25,000 |

修改价格或添加新包，请编辑 `lib/paypal/config.ts` 文件。

## 测试流程

### 1. 测试购买流程

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问 `http://localhost:3000/pricing`

3. 登录账户（Supabase OAuth）

4. 点击任意 credits 包的 "Buy Now" 按钮

5. 完成 PayPal 支付（Sandbox 模式）

6. 检查：
   - 显示购买成功消息
   - 显示新的余额
   - 交易记录已保存

### 2. 测试生成流程

1. 访问 `http://localhost:3000`

2. 确认已登录且余额 > 2

3. 上传图片并输入提示词

4. 点击 "Generate Now"

5. 检查：
   - 图像生成成功
   - 余额减少 2
   - 交易记录已保存

### 3. 测试余额不足

1. 确保余额 < 2（或手动设置为 0）

2. 尝试生成图像

3. 检查：
   - 显示余额不足提示
   - 不会调用图像生成 API

## 常见问题

### Q: 迁移脚本执行失败？
A:
- 确保你已登录 Supabase Dashboard
- 检查是否有足够的权限执行 DDL 操作
- 确认 `auth.users` 表存在（Supabase 默认创建）

### Q: Credits 没有添加到用户账户？
A:
- 检查 `capture-order` API 的日志
- 确认 PayPal 支付状态为 `COMPLETED`
- 检查数据库中的 `credit_transactions` 表是否有记录

### Q: 余额显示不更新？
A:
- 确保调用了 `window.refreshCreditsDisplay()` 方法
- 检查浏览器控制台是否有 JavaScript 错误
- 清除浏览器缓存并刷新页面

### Q: 如何手动添加 credits 给用户？
A:
方法 1：通过 SQL
```sql
SELECT * FROM add_credits(
  p_user_id := 'user-uuid',
  p_amount := 100,
  p_type := 'bonus',
  p_description := 'Manual bonus'
);
```

方法 2：通过 Supabase Dashboard
1. 进入 Table Editor
2. 选择 `user_credits` 表
3. 找到对应用户并更新 `balance` 字段
4. 在 `credit_transactions` 表中添加交易记录

## 安全注意事项

1. **RLS (Row Level Security)**：已启用，用户只能访问自己的数据
2. **原子操作**：使用数据库函数确保余额更新和交易记录的原子性
3. **并发控制**：使用 `LOCK TABLE` 防止并发问题
4. **验证检查**：在扣除 credits 前验证余额充足

## 扩展功能建议

### 添加赠送 credits 功能

创建 `/api/credits/grant` 端点，允许管理员赠送 credits：

```typescript
// 仅管理员可用
export async function POST(request: NextRequest) {
  // 验证管理员权限
  // 调用 addCredits 函数
}
```

### 添加订阅自动充值

与 PayPal 订阅集成，每月自动充值固定数量的 credits。

### 添加推广奖励系统

用户邀请好友获得奖励 credits。

### 添加交易统计页面

创建 `/dashboard` 页面，显示：
- 总购买量
- 总使用量
- 剩余额度
- 交易历史图表

## 相关文件

| 文件 | 说明 |
|------|------|
| `supabase/migrations/20240117000001_create_credits_tables.sql` | 数据库迁移脚本 |
| `lib/credits/config.ts` | Credits 系统配置 |
| `lib/credits/db.ts` | 数据库操作函数 |
| `lib/credits/client.ts` | 客户端 API 调用函数 |
| `app/api/credits/balance/route.ts` | 获取余额 API |
| `app/api/credits/deduct/route.ts` | 扣除 credits API |
| `app/api/credits/transactions/route.ts` | 交易历史 API |
| `app/api/paypal/capture-order/route.ts` | PayPal 支付回调（添加 credits） |
| `components/credits-display.tsx` | 余额显示组件 |
| `components/home-page-content.tsx` | 主页（使用 credits） |
| `components/pricing-page-content.tsx` | 定价页面（购买 credits） |

---

如有问题或需要帮助，请参考 PayPal 配置文档 `PAYPAL_SETUP.md` 或创建 issue。
