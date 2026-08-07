# Paystack Webhook Setup Guide

## Webhook URL

Your Supabase Edge Function webhook URL is:

```
https://ptvfsnkcousrzsyldlpv.supabase.co/functions/v1/paystack-webhook
```

## Setup Steps

### 1. Go to Paystack Dashboard

1. Log in to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Navigate to **Settings** → **Webhooks**

### 2. Add Webhook URL

1. Click **"Add Webhook URL"** or **"Configure Webhook"**
2. Enter the webhook URL:
   ```
   https://ptvfsnkcousrzsyldlpv.supabase.co/functions/v1/paystack-webhook
   ```
3. Click **"Save"**

### 3. Configure Events (Optional)

Select which events to send to your webhook:
- ✅ `charge.success` (Required - for successful payments)
- ✅ `subscription.create` (Optional - for subscription creation)
- ✅ `subscription.disable` (Required - for cancellations)
- ✅ `invoice.payment_failed` (Optional - for failed renewals)

Or select **"Send all events"** to receive everything.

### 4. Test Webhook

Paystack provides a test feature:
1. In the Webhooks settings, click **"Test"** or **"Send Test Event"**
2. Select `charge.success` event
3. Click **"Send Test"**
4. Check your Supabase Edge Function logs to verify receipt

### 5. Verify Webhook is Active

After saving, you should see:
- ✅ Webhook URL listed in your Paystack dashboard
- ✅ Status: **Active**
- ✅ Events configured

## Verify Deployment

### Check Edge Functions

Visit: https://supabase.com/dashboard/project/ptvfsnkcousrzsyldlpv/functions

You should see:
- ✅ `paystack-webhook` (deployed)
- ✅ `paystack-initialize` (deployed)
- ✅ `paystack-verify` (deployed)

### Check Function Logs

1. Go to Supabase Dashboard → Functions
2. Click on `paystack-webhook`
3. View **Logs** tab
4. You should see logs when webhook events are received

## Testing Payment Flow

### Test Credit Purchase

```typescript
// Frontend code
const { data, error } = await supabase.functions.invoke('paystack-initialize', {
  body: {
    email: user.email,
    amount: 300, // $3 in cents
    credits: 100,
    reference: `CREDIT_${Date.now()}_${user.id.substring(0, 8)}`
  }
});

if (data?.data?.authorization_url) {
  window.location.href = data.data.authorization_url;
}
```

### Test Subscription

```typescript
// Frontend code
const { data, error } = await supabase.functions.invoke('paystack-initialize', {
  body: {
    email: user.email,
    amount: 1500, // $15 in cents
    plan: 'pro',
    interval: 'monthly',
    reference: `SUB_${Date.now()}_${user.id.substring(0, 8)}`
  }
});

if (data?.data?.authorization_url) {
  window.location.href = data.data.authorization_url;
}
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check URL is correct** in Paystack dashboard
2. **Verify Edge Function is deployed** in Supabase dashboard
3. **Check Supabase logs** for errors
4. **Test with Paystack test event**

### Signature Verification Failing

1. **Ensure `PAYSTACK_SECRET_KEY` is set** in Supabase Edge Function secrets
2. **Use the correct secret key** (test vs live)
3. **Check logs** for signature mismatch errors

### Credits Not Being Added

1. **Check webhook logs** - is event being received?
2. **Verify metadata** contains `credits` field
3. **Check `users` table** - is `extra_credits` field present?
4. **Run SQL manually** to test:
   ```sql
   SELECT add_extra_credits('user-uuid', 100, 'Test');
   ```

### Subscription Not Activating

1. **Check webhook logs** - is event being received?
2. **Verify metadata** contains `plan` and `interval`
3. **Check `subscriptions` table** - is record created?
4. **Check `users` table** - is `monthly_credits` updated?

## Security Checklist

- [ ] Paystack secret key is set in Supabase secrets (not in code)
- [ ] Webhook signature verification is enabled
- [ ] HTTPS is used for webhook URL
- [ ] Edge Functions use service role key for database access
- [ ] Frontend never has access to secret keys

## Next Steps

1. ✅ Deploy Edge Functions (DONE)
2. ✅ Set webhook URL in Paystack dashboard
3. Test credit purchase flow
4. Test subscription flow
5. Monitor webhook logs
6. Build frontend pricing UI
