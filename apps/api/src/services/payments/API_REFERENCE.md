# Stripe Payment Gateway - API Reference

Complete API reference for all methods in the `StripePaymentGateway` class.

## Table of Contents

- [Customer Management](#customer-management)
- [Checkout Sessions](#checkout-sessions)
- [Subscriptions](#subscriptions)
- [Payment Intents](#payment-intents)
- [Payment Methods](#payment-methods)
- [Billing Portal](#billing-portal)
- [Products & Prices](#products--prices)
- [Webhooks](#webhooks)

---

## Customer Management

### createCustomer()

Create a new customer in Stripe.

```typescript
async createCustomer(
  organizationId: string,
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<CustomerResult>
```

**Parameters:**
- `organizationId` - Your internal organization ID
- `email` - Customer email address
- `name` - Customer name (optional)
- `metadata` - Additional key-value data (optional)

**Returns:** `CustomerResult`
```typescript
{
  id: string;              // Stripe customer ID
  email: string;
  name?: string;
  metadata?: Record<string, string>;
  defaultPaymentMethodId?: string;
}
```

**Example:**
```typescript
const customer = await stripeGateway.createCustomer(
  'org_123',
  'customer@example.com',
  'John Doe',
  { tier: 'premium' }
);
```

---

### getCustomer()

Retrieve a customer by ID.

```typescript
async getCustomer(customerId: string): Promise<CustomerResult>
```

**Parameters:**
- `customerId` - Stripe customer ID

**Returns:** `CustomerResult`

**Throws:** `PaymentGatewayError` if customer not found

---

### updateCustomer()

Update customer information.

```typescript
async updateCustomer(
  customerId: string,
  data: {
    email?: string;
    name?: string;
    metadata?: Record<string, string>;
  }
): Promise<CustomerResult>
```

**Parameters:**
- `customerId` - Stripe customer ID
- `data` - Fields to update

**Returns:** `CustomerResult`

---

### deleteCustomer()

Delete a customer.

```typescript
async deleteCustomer(customerId: string): Promise<void>
```

**Parameters:**
- `customerId` - Stripe customer ID

**Returns:** `void`

---

## Checkout Sessions

### createCheckoutSession()

Create a Stripe Checkout session for payments or subscriptions.

```typescript
async createCheckoutSession(
  params: CheckoutSessionParams
): Promise<CheckoutSessionResult>
```

**Parameters:** `CheckoutSessionParams`
```typescript
{
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  promoCode?: string;
  quantity?: number;
  allowPromotionCodes?: boolean;
  billingAddressCollection?: 'auto' | 'required';
  metadata?: Record<string, string>;
  mode?: 'payment' | 'subscription' | 'setup';
  trialDays?: number;
}
```

**Returns:** `CheckoutSessionResult`
```typescript
{
  sessionId: string;
  url: string;
  expiresAt: Date;
}
```

**Example:**
```typescript
const session = await stripeGateway.createCheckoutSession({
  customerId: 'cus_123',
  priceId: 'price_123',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  promoCode: 'SUMMER2026',
  trialDays: 14,
});

// Redirect user to session.url
```

---

## Subscriptions

### createSubscription()

Create a subscription directly (without checkout).

```typescript
async createSubscription(
  params: SubscriptionParams
): Promise<SubscriptionResult>
```

**Parameters:** `SubscriptionParams`
```typescript
{
  customerId: string;
  priceId: string;
  trialDays?: number;
  quantity?: number;
  metadata?: Record<string, string>;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  paymentBehavior?: 'default_incomplete' | 'error_if_incomplete' | 'allow_incomplete' | 'pending_if_incomplete';
  defaultPaymentMethod?: string;
  items?: Array<{
    priceId: string;
    quantity?: number;
  }>;
}
```

**Returns:** `SubscriptionResult`
```typescript
{
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  items: SubscriptionItem[];
  metadata?: Record<string, string>;
}
```

**Example:**
```typescript
const subscription = await stripeGateway.createSubscription({
  customerId: 'cus_123',
  priceId: 'price_123',
  trialDays: 14,
  metadata: { organizationId: 'org_123' }
});
```

---

### getSubscription()

Get subscription by ID.

```typescript
async getSubscription(subscriptionId: string): Promise<SubscriptionResult>
```

---

### updateSubscription()

Update subscription to a different price/plan.

```typescript
async updateSubscription(
  subscriptionId: string,
  newPriceId: string,
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
): Promise<SubscriptionResult>
```

**Parameters:**
- `subscriptionId` - Subscription ID
- `newPriceId` - New price to switch to
- `prorationBehavior` - How to handle proration (default: 'create_prorations')

**Example:**
```typescript
// Upgrade to annual plan with proration
await stripeGateway.updateSubscription(
  'sub_123',
  'price_annual',
  'create_prorations'
);
```

---

### cancelSubscription()

Cancel a subscription.

```typescript
async cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false
): Promise<SubscriptionResult>
```

**Parameters:**
- `subscriptionId` - Subscription ID
- `immediate` - Cancel immediately (true) or at period end (false)

**Example:**
```typescript
// Cancel at period end
await stripeGateway.cancelSubscription('sub_123', false);

// Cancel immediately
await stripeGateway.cancelSubscription('sub_123', true);
```

---

### pauseSubscription()

Pause a subscription.

```typescript
async pauseSubscription(subscriptionId: string): Promise<SubscriptionResult>
```

---

### resumeSubscription()

Resume a paused subscription.

```typescript
async resumeSubscription(subscriptionId: string): Promise<SubscriptionResult>
```

---

## Payment Intents

### createPaymentIntent()

Create a payment intent for one-time payments.

```typescript
async createPaymentIntent(
  params: PaymentIntentParams
): Promise<PaymentIntentResult>
```

**Parameters:** `PaymentIntentParams`
```typescript
{
  amount: number;              // Amount in cents
  currency: string;            // e.g., 'usd'
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  captureMethod?: 'automatic' | 'manual';
  confirmationMethod?: 'automatic' | 'manual';
  setupFutureUsage?: 'on_session' | 'off_session';
}
```

**Returns:** `PaymentIntentResult`
```typescript
{
  id: string;
  clientSecret: string;
  status: PaymentIntentStatus;
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
}
```

**Example:**
```typescript
const intent = await stripeGateway.createPaymentIntent({
  amount: 5000, // $50.00
  currency: 'usd',
  customerId: 'cus_123',
  description: 'One-time consultation fee'
});

// Use intent.clientSecret on frontend
```

---

## Payment Methods

### getPaymentMethods()

Get all payment methods for a customer.

```typescript
async getPaymentMethods(customerId: string): Promise<PaymentMethod[]>
```

**Returns:** Array of `PaymentMethod`
```typescript
{
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails?: {...};
  isDefault?: boolean;
}
```

---

### attachPaymentMethod()

Attach a payment method to a customer.

```typescript
async attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<PaymentMethod>
```

---

### detachPaymentMethod()

Detach a payment method from a customer.

```typescript
async detachPaymentMethod(paymentMethodId: string): Promise<void>
```

---

### setDefaultPaymentMethod()

Set default payment method for a customer.

```typescript
async setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<CustomerResult>
```

---

## Billing Portal

### createBillingPortalSession()

Create a billing portal session for customer self-service.

```typescript
async createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<BillingPortalSessionResult>
```

**Parameters:**
- `customerId` - Stripe customer ID
- `returnUrl` - URL to return to after portal session

**Returns:**
```typescript
{
  id: string;
  url: string;
}
```

**Example:**
```typescript
const portal = await stripeGateway.createBillingPortalSession(
  'cus_123',
  'https://example.com/settings/billing'
);

// Redirect user to portal.url
```

---

## Products & Prices

### createPrice()

Create a price for a product.

```typescript
async createPrice(params: CreatePriceParams): Promise<PriceResult>
```

**Parameters:** `CreatePriceParams`
```typescript
{
  productId: string;
  amount: number;              // Amount in cents
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  nickname?: string;
  metadata?: Record<string, string>;
}
```

**Returns:** `PriceResult`
```typescript
{
  id: string;
  productId: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  active: boolean;
}
```

---

### syncProduct()

Sync a pricing plan to Stripe (create/update product and prices).

```typescript
async syncProduct(plan: PricingPlan): Promise<void>
```

**Parameters:** `PricingPlan`
```typescript
{
  id: string;
  name: string;
  description?: string;
  productId?: string;          // If updating existing product
  prices: PricingTier[];
  features: string[];
  isActive: boolean;
}
```

**Example:**
```typescript
await stripeGateway.syncProduct({
  id: 'plan_pro',
  name: 'Pro Plan',
  description: 'For growing teams',
  prices: [
    { amount: 2999, currency: 'usd', interval: 'month' },
    { amount: 29990, currency: 'usd', interval: 'year' }
  ],
  features: ['Unlimited chats', 'Advanced analytics'],
  isActive: true
});
```

---

## Webhooks

### constructWebhookEvent()

Construct and verify a webhook event from Stripe.

```typescript
async constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Promise<WebhookEvent>
```

**Parameters:**
- `body` - Raw request body (must be raw, not parsed JSON)
- `signature` - Value of `stripe-signature` header

**Returns:** `WebhookEvent`
```typescript
{
  id: string;
  type: WebhookEventType | string;
  data: any;
  createdAt: Date;
  raw?: Stripe.Event;
}
```

**Throws:** `PaymentGatewayError` if signature verification fails

---

### handleWebhookEvent()

Handle a webhook event (process based on event type).

```typescript
async handleWebhookEvent(event: WebhookEvent): Promise<void>
```

**Supported Event Types:**
- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.upcoming`
- `payment_method.attached`
- `payment_method.detached`

**Example:**
```typescript
const event = await stripeGateway.constructWebhookEvent(
  request.rawBody,
  request.headers['stripe-signature']
);

await stripeGateway.handleWebhookEvent(event);
```

---

## Error Handling

All methods throw `PaymentGatewayError` on failure:

```typescript
class PaymentGatewayError extends Error {
  constructor(
    message: string,
    code?: string,
    statusCode?: number,
    details?: any
  )
}
```

**Example:**
```typescript
import { PaymentGatewayError } from './services/payments/types';

try {
  await stripeGateway.createCustomer(/* ... */);
} catch (error) {
  if (error instanceof PaymentGatewayError) {
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Status:', error.statusCode);
    console.error('Details:', error.details);
  }
}
```

---

## Subscription Statuses

```typescript
type SubscriptionStatus =
  | 'incomplete'           // Incomplete - requires payment
  | 'incomplete_expired'   // Incomplete and expired
  | 'trialing'            // In trial period
  | 'active'              // Active and paid
  | 'past_due'            // Payment failed, retrying
  | 'canceled'            // Canceled
  | 'unpaid'              // Payment failed, no retries
  | 'paused';             // Paused by merchant
```

---

## Payment Intent Statuses

```typescript
type PaymentIntentStatus =
  | 'requires_payment_method'   // Needs payment method
  | 'requires_confirmation'     // Needs confirmation
  | 'requires_action'          // Needs 3D Secure
  | 'processing'               // Processing
  | 'requires_capture'         // Needs manual capture
  | 'canceled'                 // Canceled
  | 'succeeded';               // Succeeded
```

---

## Constants

### Currencies

Supported currencies (partial list):
- `usd` - US Dollar
- `eur` - Euro
- `gbp` - British Pound
- `inr` - Indian Rupee
- `cad` - Canadian Dollar
- `aud` - Australian Dollar
- `jpy` - Japanese Yen

See full list: https://stripe.com/docs/currencies

### Price Intervals

```typescript
type Interval = 'day' | 'week' | 'month' | 'year';
```

---

## TypeScript Types

Import types from the types module:

```typescript
import type {
  CheckoutSessionParams,
  SubscriptionParams,
  PaymentIntentParams,
  CustomerResult,
  SubscriptionResult,
  PaymentMethod,
  WebhookEvent,
  PaymentGatewayError,
} from './services/payments/types';
```

---

## Advanced Usage

### Custom Webhook Handlers

Extend the class to add custom logic:

```typescript
import { StripePaymentGateway, WebhookEvent } from './services/payments/stripe';

class CustomStripeGateway extends StripePaymentGateway {
  protected async handleCheckoutCompleted(event: WebhookEvent): Promise<void> {
    // Your custom logic
    await this.activateSubscription(event.data);

    // Call parent
    await super.handleCheckoutCompleted(event);
  }

  private async activateSubscription(session: any): Promise<void> {
    // Implement your logic
  }
}
```

---

## Rate Limits

Stripe has rate limits:
- **Standard**: 100 requests per second
- **Bursts**: Up to 300 requests per second for short periods

The SDK automatically handles rate limiting with exponential backoff.

---

## Best Practices

1. **Always verify webhook signatures**
2. **Use idempotency keys for critical operations**
3. **Handle webhook events asynchronously**
4. **Store customer IDs in your database**
5. **Use metadata to link Stripe objects to your data**
6. **Test with Stripe test mode before going live**
7. **Monitor webhook delivery in Stripe dashboard**
8. **Use billing portal for customer self-service**

---

## Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
