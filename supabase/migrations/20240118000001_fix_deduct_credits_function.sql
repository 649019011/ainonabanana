-- Fix deduct_credits function to resolve ambiguous column reference
-- The issue is that RETURNING balance conflicts with RETURNS TABLE(balance INTEGER)

DROP FUNCTION IF EXISTS public.deduct_credits(UUID, INTEGER, TEXT, JSONB);

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
  -- Check parameters
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Lock user credits table to prevent concurrent issues
  LOCK TABLE public.user_credits IN SHARE ROW EXCLUSIVE MODE;

  -- Get current balance
  SELECT user_credits.balance INTO v_new_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user has credits record
  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'User has no credits record';
  END IF;

  -- Check if sufficient balance
  IF v_new_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: balance %, required %', v_new_balance, p_amount;
  END IF;

  -- Deduct credits
  UPDATE public.user_credits
  SET balance = user_credits.balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING user_credits.balance INTO v_new_balance;

  -- Create transaction record
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, type, description, metadata
  ) VALUES (
    p_user_id, -p_amount, v_new_balance, 'usage', p_description, p_metadata
  ) RETURNING credit_transactions.id INTO v_transaction_id;

  RETURN QUERY SELECT v_transaction_id, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
