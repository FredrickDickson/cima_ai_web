/*
  # Billing tiers — Free / Pro / Max

  Adds the subscription/usage-metering data model backing the Paystack
  integration: which plan a user is on, how many AI actions they've used
  this billing cycle vs their monthly allowance, purchased top-up credits
  (never expire), and enough Paystack identifiers to manage/verify their
  subscription. Additive only — every new column has a safe default so
  existing rows (all currently on the implicit free tier) are unaffected.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS monthly_ai_actions_used int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_ai_actions_reset_at timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  ADD COLUMN IF NOT EXISTS extra_ai_actions int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paystack_customer_code text,
  ADD COLUMN IF NOT EXISTS paystack_authorization_code text,  -- reusable card token, for future renewal charges
  ADD COLUMN IF NOT EXISTS subscription_code text,
  ADD COLUMN IF NOT EXISTS subscription_renews_at timestamptz;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'max')),
  ADD CONSTRAINT profiles_plan_status_check CHECK (plan_status IN ('active', 'past_due', 'cancelled'));

CREATE TABLE IF NOT EXISTS billing_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('subscription', 'topup')),
  plan text CHECK (plan IN ('pro', 'max')),
  amount_kobo int NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own billing transactions"
  ON billing_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_billing_transactions_user_id ON billing_transactions(user_id);
