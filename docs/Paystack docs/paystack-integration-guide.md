# Paystack Integration - Updated for Hybrid Credits

## Overview
The Paystack webhook has been updated to support the hybrid credits system with monthly and extra credits.

## Changes Made

### 1. Webhook Handler (`paystack-webhook/index.ts`)

#### Credit Purchase Flow
When `metadata.credits` is present in the payment:
- Calls `add_extra_credits()` RPC function
- Adds purchased credits to `extra_credits` field
- Logs transaction in `credits` table
- Credits never expire

**Example metadata:**
```json
{
  "user_id": "uuid",
  "credits": 300
}
```

#### Subscription Payment Flow
When `metadata.plan` is present:
- Sets `monthly_credits` based on plan:
  - free: 3
  - basic: 200
  - pro: 600
  - elite: 1500
- Sets `subscription_renews_at` to period end date
- Updates `subscriptions` table
- Updates `users` table with plan and credits

**Example metadata:**
```json
{
  "user_id": "uuid",
  "plan": "pro",
  "interval": "monthly"
}
```

#### Subscription Cancellation
When subscription is disabled:
- Resets to free plan
- Sets `monthly_credits` to 3
- Clears `subscription_renews_at`
- Keeps `extra_credits` intact

### 2. Cron Job Setup (`13_setup_cron_job.sql`)

Daily cron job runs at midnight UTC:
- Calls `reset_monthly_credits()` function
- Resets monthly credits for active subscriptions
- Updates `subscription_renews_at` dates
- Logs reset transactions

## Frontend Integration

### Initialize Credit Purchase

```typescript
// Buy 300 credits for $8
const { data, error } = await supabase.functions.invoke('paystack-initialize', {
  body: {
    email: user.email,
    amount: 800, // $8 in cents
    credits: 300,
    reference: `CREDIT_${Date.now()}_${user.id.substring(0, 8)}`,
    metadata: {
      userId: user.id,
      credits: 300
    }
  }
});

// Redirect to Paystack
window.location.href = data.data.authorization_url;
```

### Initialize Subscription

```typescript
// Subscribe to Pro plan ($15/month)
const { data, error } = await supabase.functions.invoke('paystack-initialize', {
  body: {
    email: user.email,
    amount: 1500, // $15 in cents
    plan: 'pro',
    interval: 'monthly',
    reference: `SUB_${Date.now()}_${user.id.substring(0, 8)}`,
    metadata: {
      userId: user.id,
      plan: 'pro',
      interval: 'monthly'
    }
  }
});

window.location.href = data.data.authorization_url;
```

### Check Credits Balance

```typescript
// Get user's credits
const { data: user } = await supabase
  .from('users')
  .select('monthly_credits, extra_credits')
  .eq('id', userId)
  .single();

const totalCredits = user.monthly_credits + user.extra_credits;

// Or use RPC function
const { data: total } = await supabase.rpc('get_total_credits', {
  p_user_id: userId
});
```

### Deduct Credits (Backend Only)

```typescript
// In Edge Function (server-side only)
const { data, error } = await supabase.rpc('deduct_credits', {
  p_user_id: userId,
  p_cost: 5 // Cost for this action
});

if (error) {
  if (error.message === 'INSUFFICIENT_CREDITS') {
    return new Response('Not enough credits', { status: 402 });
  }
}

// data will be 'monthly' or 'extra' indicating which credits were used
```

## Testing

### Test Credit Purchase
1. Create test payment with credits metadata
2. Verify webhook receives event
3. Check `extra_credits` increased
4. Check `credits` table has purchase log

### Test Subscription
1. Create test subscription payment
2. Verify webhook receives event
3. Check `monthly_credits` set correctly
4. Check `subscription_renews_at` is set
5. Check `subscriptions` table updated

### Test Credit Deduction
1. User with 50 monthly + 100 extra credits
2. Deduct 5 credits
3. Verify monthly_credits = 45
4. Verify extra_credits = 100 (unchanged)

### Test Monthly Reset
1. Set `subscription_renews_at` to past date
2. Run `SELECT reset_monthly_credits();`
3. Verify monthly credits reset
4. Verify `subscription_renews_at` updated

## Deployment Checklist

- [ ] Apply `12_hybrid_credits_system.sql` to Supabase
- [ ] Apply `13_setup_cron_job.sql` to Supabase
- [ ] Deploy updated `paystack-webhook` function
- [ ] Set `PAYSTACK_SECRET_KEY` in Supabase secrets
- [ ] Configure Paystack webhook URL in dashboard
- [ ] Test credit purchase flow
- [ ] Test subscription flow
- [ ] Verify cron job is running

## Webhook URL

Set this in Paystack Dashboard:
```
https://ptvfsnkcousrzsyldlpv.supabase.co/functions/v1/paystack-webhook
```

## Next Steps

1. Update frontend pricing page
2. Add credits display in dashboard
3. Implement "Buy Credits" modal
4. Add subscription management page
5. Test complete payment flows
