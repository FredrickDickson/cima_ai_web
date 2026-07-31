/*
  # Billing RPCs — AI action metering

  `deduct_ai_action` is the single gate every AI-calling edge function calls
  before doing expensive work: spend from the plan's monthly allowance first,
  falling back to purchased extra_ai_actions (which never expire) when the
  monthly allowance is exhausted, raising INSUFFICIENT_CREDITS (caught by
  callers and turned into an HTTP 402) when neither can cover the cost.
*/

CREATE OR REPLACE FUNCTION plan_ai_action_cap(p_plan text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'free' THEN 20
    WHEN 'pro' THEN 500
    WHEN 'max' THEN 2000
    ELSE 20
  END;
$$;

CREATE OR REPLACE FUNCTION deduct_ai_action(p_user_id uuid, p_cost int DEFAULT 1)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_used int;
  v_extra int;
  v_cap int;
  v_remaining int;
  v_source text;
BEGIN
  SELECT plan, monthly_ai_actions_used, extra_ai_actions
    INTO v_plan, v_used, v_extra
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  v_cap := plan_ai_action_cap(v_plan);
  v_remaining := GREATEST(v_cap - v_used, 0);

  IF v_remaining >= p_cost THEN
    UPDATE profiles SET monthly_ai_actions_used = monthly_ai_actions_used + p_cost WHERE id = p_user_id;
    v_source := 'monthly';
  ELSIF (v_remaining + v_extra) >= p_cost THEN
    UPDATE profiles
    SET monthly_ai_actions_used = v_cap,
        extra_ai_actions = extra_ai_actions - (p_cost - v_remaining)
    WHERE id = p_user_id;
    v_source := 'mixed';
  ELSE
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  RETURN v_source;
END;
$$;

CREATE OR REPLACE FUNCTION add_extra_ai_actions(p_user_id uuid, p_amount int)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles SET extra_ai_actions = extra_ai_actions + p_amount WHERE id = p_user_id;
$$;

-- Resets every profile whose billing cycle has rolled over. Safe to call
-- repeatedly/manually — only touches rows whose reset date has passed, and
-- advances that date by exactly one period each time.
CREATE OR REPLACE FUNCTION reset_monthly_ai_actions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET monthly_ai_actions_used = 0,
      monthly_ai_actions_reset_at = monthly_ai_actions_reset_at + interval '1 month'
  WHERE monthly_ai_actions_reset_at <= now();
END;
$$;

-- We don't use Paystack's native Subscription/Plan objects (see
-- paystack-initialize) — each payment is a one-off charge and renewal is
-- tracked ourselves via subscription_renews_at. Until an automated renewal
-- charge is built, a lapsed paid plan (renewal date passed, no new
-- successful charge.success webhook extended it) quietly downgrades to
-- free rather than continuing to grant paid access indefinitely.
CREATE OR REPLACE FUNCTION downgrade_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET plan = 'free',
      plan_status = 'active',
      subscription_renews_at = NULL
  WHERE plan IN ('pro', 'max')
    AND subscription_renews_at IS NOT NULL
    AND subscription_renews_at <= now();
END;
$$;
