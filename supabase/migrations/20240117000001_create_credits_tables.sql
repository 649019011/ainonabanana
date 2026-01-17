-- Nano Banana Credits System
-- 创建用户 credits 余额和交易记录表

-- 用户 credits 余额表
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 为 user_credits 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);

-- Credits 交易记录表
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- 正数为充值，负数为消耗
  balance_after INTEGER NOT NULL, -- 交易后的余额
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  reference_id TEXT, -- PayPal 订单 ID 或其他参考 ID
  description TEXT, -- 交易描述
  pack_id TEXT, -- 购买的 credits 包 ID
  metadata JSONB DEFAULT '{}'::jsonb, -- 额外的元数据
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为 credit_transactions 创建索引
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 user_credits 表添加自动更新 updated_at 的触发器
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 启用 Row Level Security (RLS)
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：用户只能查看和修改自己的 credits
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
CREATE POLICY "Users can view own credits"
  ON public.user_credits
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;
CREATE POLICY "Users can insert own credits"
  ON public.user_credits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
CREATE POLICY "Users can update own credits"
  ON public.user_credits
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 交易记录的 RLS 策略
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.credit_transactions;
CREATE POLICY "Users can insert own transactions"
  ON public.credit_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 创建服务端角色策略（用于 API 后端操作）
-- 允许服务端通过 service_role_key 操作所有数据
DROP POLICY IF EXISTS "Service role can manage all credits" ON public.user_credits;
CREATE POLICY "Service role can manage all credits"
  ON public.user_credits
  FOR ALL
  USING (pg_role.current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all transactions" ON public.credit_transactions;
CREATE POLICY "Service role can manage all transactions"
  ON public.credit_transactions
  FOR ALL
  USING (pg_role.current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');

-- 创建辅助函数：获取用户余额
CREATE OR REPLACE FUNCTION public.get_user_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance
  FROM public.user_credits
  WHERE user_id = p_user_id;

  -- 如果用户没有记录，返回 0
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建辅助函数：添加 credits（充值）
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_pack_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(id UUID, balance INTEGER) AS $$
DECLARE
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- 检查参数
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- 锁定用户记录以防止并发问题
  LOCK TABLE public.user_credits IN SHARE ROW EXCLUSIVE MODE;

  -- 获取或创建用户 credits 记录
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.user_credits.balance + p_amount,
      updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- 创建交易记录
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, type, reference_id, description, pack_id, metadata
  ) VALUES (
    p_user_id, p_amount, v_new_balance, p_type, p_reference_id, p_description, p_pack_id, p_metadata
  ) RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_transaction_id, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建辅助函数：扣除 credits（消耗）
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(id UUID, balance INTEGER) AS $$
DECLARE
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- 检查参数
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- 锁定用户记录以防止并发问题
  LOCK TABLE public.user_credits IN SHARE ROW EXCLUSIVE MODE;

  -- 获取当前余额
  SELECT balance INTO v_new_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 检查余额是否足够
  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'User has no credits record';
  END IF;

  IF v_new_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: balance %, required %', v_new_balance, p_amount;
  END IF;

  -- 扣除 credits
  UPDATE public.user_credits
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- 创建交易记录
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, type, description, metadata
  ) VALUES (
    p_user_id, -p_amount, v_new_balance, 'usage', p_description, p_metadata
  ) RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_transaction_id, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建视图：用户 credits 摘要（方便查询）
CREATE OR REPLACE VIEW public.user_credits_summary AS
SELECT
  u.id AS user_id,
  u.email,
  COALESCE(uc.balance, 0) AS balance,
  COALESCE(tt.total_purchased, 0) AS total_purchased,
  COALESCE(tt.total_used, 0) AS total_used,
  COUNT(ct.id) AS transaction_count
FROM auth.users u
LEFT JOIN public.user_credits uc ON u.id = uc.user_id
LEFT JOIN (
  SELECT
    user_id,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_purchased,
    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS total_used
  FROM public.credit_transactions
  GROUP BY user_id
) tt ON u.id = tt.user_id
LEFT JOIN public.credit_transactions ct ON u.id = ct.user_id
GROUP BY u.id, u.email, uc.balance, tt.total_purchased, tt.total_used;

-- 添加注释
COMMENT ON TABLE public.user_credits IS '用户 credits 余额表';
COMMENT ON TABLE public.credit_transactions IS 'Credits 交易记录表';
COMMENT ON FUNCTION public.get_user_balance IS '获取用户当前 credits 余额';
COMMENT ON FUNCTION public.add_credits IS '为用户充值 credits';
COMMENT ON FUNCTION public.deduct_credits IS '扣除用户 credits（用于图像生成等消耗）';
