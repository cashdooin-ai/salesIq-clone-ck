# Payment Gateway Services

Complete payment gateway implementation for the Nexvo SalesIQ clone, supporting Stripe (international) and India-specific payment providers (Instamojo, Paytm, UPI).

## Features

### International Payments (Stripe)
- **Customer Management**: Create, update, and manage customers
- **Subscriptions**: Full subscription lifecycle management (create, update, cancel, pause, resume)
- **One-time Payments**: Payment intents for single purchases
- **Payment Methods**: Attach, detach, and manage customer payment methods
- **Billing Portal**: Self-service customer billing portal
- **Product Sync**: Synchronize pricing plans with payment gateway
- **Webhook Handling**: Process payment events in real-time

### India-specific Payments
- **Instamojo**: Payment requests, refunds, and webhook verification
- **Paytm**: Wallet, UPI, cards, net banking, subscriptions, and collect requests
- **Direct UPI**: Generate payment links, QR codes, VPA validation, and collect requests
- **Multi-gateway Support**: Consistent API across different payment providers

## Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration (International)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENT_GATEWAY=stripe

# Instamojo Configuration (India)
INSTAMOJO_API_KEY=test_your_api_key
INSTAMOJO_AUTH_TOKEN=test_your_auth_token

# Paytm Configuration (India)
PAYTM_MERCHANT_ID=your_merchant_id
PAYTM_MERCHANT_KEY=your_merchant_key
PAYTM_WEBSITE=WEBSTAGING
PAYTM_INDUSTRY_TYPE=Retail

# UPI Configuration (India)
UPI_DEFAULT_PAYEE_VPA=merchant@paytm
UPI_MERCHANT_NAME=Your Business Name
UPI_MERCHANT_CODE=1234
UPI_VALIDATION_API_KEY=optional_validation_api_key
UPI_VALIDATION_API_URL=https://api.razorpay.com/v1/payments/validate/vpa

# General
NODE_ENV=development
```

## Usage Examples

### Initialize the Gateway

```typescript
import { stripeGateway } from './services/payments/stripe';
// Or use the default gateway
import paymentGateway from './services/payments';
```

### Customer Management

```typescript
// Create a customer
const customer = await stripeGateway.createCustomer(
  'org_123',
  'customer@example.com',
  'John Doe'
);

// Get customer
const customer = await stripeGateway.getCustomer('cus_123');

// Update customer
await stripeGateway.updateCustomer('cus_123', {
  email: 'newemail@example.com',
  name: 'Jane Doe'
});

// Delete customer
await stripeGateway.deleteCustomer('cus_123');
```

### Checkout Sessions

```typescript
// Create a checkout session for subscription
const session = await stripeGateway.createCheckoutSession({
  customerId: 'cus_123',
  priceId: 'price_123',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  promoCode: 'SUMMER2026', // Optional
  trialDays: 14, // Optional
  mode: 'subscription'
});

// Redirect user to session.url
console.log('Checkout URL:', session.url);
```

### Subscription Management

```typescript
// Create a subscription
const subscription = await stripeGateway.createSubscription({
  customerId: 'cus_123',
  priceId: 'price_123',
  trialDays: 14,
  metadata: {
    organizationId: 'org_123'
  }
});

// Get subscription
const subscription = await stripeGateway.getSubscription('sub_123');

// Update subscription (change plan)
await stripeGateway.updateSubscription(
  'sub_123',
  'price_annual',
  'create_prorations' // Handle proration
);

// Cancel subscription (at period end)
await stripeGateway.cancelSubscription('sub_123', false);

// Cancel subscription immediately
await stripeGateway.cancelSubscription('sub_123', true);

// Pause subscription
await stripeGateway.pauseSubscription('sub_123');

// Resume subscription
await stripeGateway.resumeSubscription('sub_123');
```

### One-time Payments

```typescript
// Create a payment intent
const intent = await stripeGateway.createPaymentIntent({
  amount: 5000, // $50.00 in cents
  currency: 'usd',
  customerId: 'cus_123',
  description: 'One-time consultation fee',
  metadata: {
    orderId: 'order_123'
  }
});

// Use intent.clientSecret on the frontend to complete payment
```

### Payment Methods

```typescript
// Get customer's payment methods
const methods = await stripeGateway.getPaymentMethods('cus_123');

// Attach a payment method
await stripeGateway.attachPaymentMethod('cus_123', 'pm_123');

// Set default payment method
await stripeGateway.setDefaultPaymentMethod('cus_123', 'pm_123');

// Detach a payment method
await stripeGateway.detachPaymentMethod('pm_123');
```

### Billing Portal

```typescript
// Create a billing portal session
const portal = await stripeGateway.createBillingPortalSession(
  'cus_123',
  'https://example.com/settings/billing'
);

// Redirect user to portal.url for self-service billing
console.log('Portal URL:', portal.url);
```

### Product & Price Management

```typescript
// Create a price
const price = await stripeGateway.createPrice({
  productId: 'prod_123',
  amount: 2999, // $29.99
  currency: 'usd',
  interval: 'month',
  nickname: 'Pro Monthly'
});

// Sync a complete pricing plan
await stripeGateway.syncProduct({
  id: 'plan_pro',
  name: 'Pro Plan',
  description: 'For growing teams',
  prices: [
    { amount: 2999, currency: 'usd', interval: 'month' },
    { amount: 29990, currency: 'usd', interval: 'year' }
  ],
  features: [
    'Unlimited chats',
    'Advanced analytics',
    'Priority support'
  ],
  isActive: true
});
```

### Webhook Handling

```typescript
// In your Fastify route handler
app.post('/webhooks/stripe', async (req, reply) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const event = await stripeGateway.constructWebhookEvent(
      req.rawBody, // Use raw body, not parsed JSON
      signature
    );

    await stripeGateway.handleWebhookEvent(event);

    return { received: true };
  } catch (error) {
    logger.error({ error }, 'Webhook error');
    return reply.code(400).send({ error: 'Webhook error' });
  }
});
```

### Custom Webhook Handlers

Extend the `StripePaymentGateway` class to implement custom webhook handling:

```typescript
import { StripePaymentGateway, WebhookEvent } from './services/payments/stripe';

class CustomStripeGateway extends StripePaymentGateway {
  protected async handleCheckoutCompleted(event: WebhookEvent): Promise<void> {
    const session = event.data;

    // Your custom logic
    await activateSubscription(session.customer);
    await sendWelcomeEmail(session.customer_email);

    // Call parent implementation
    await super.handleCheckoutCompleted(event);
  }

  protected async handleSubscriptionDeleted(event: WebhookEvent): Promise<void> {
    const subscription = event.data;

    // Your custom logic
    await revokeAccess(subscription.customer);
    await sendCancellationEmail(subscription.customer);
  }
}
```

## Webhook Events

The gateway handles these webhook events:

- `checkout.session.completed` - Checkout session completed
- `checkout.session.expired` - Checkout session expired
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription canceled
- `customer.subscription.trial_will_end` - Trial ending soon
- `payment_intent.succeeded` - Payment succeeded
- `payment_intent.payment_failed` - Payment failed
- `invoice.paid` - Invoice paid
- `invoice.payment_failed` - Invoice payment failed
- `invoice.upcoming` - Upcoming invoice
- `payment_method.attached` - Payment method attached
- `payment_method.detached` - Payment method detached

## Error Handling

All methods throw `PaymentGatewayError` on failure:

```typescript
import { PaymentGatewayError } from './services/payments/types';

try {
  await stripeGateway.createCustomer(/* ... */);
} catch (error) {
  if (error instanceof PaymentGatewayError) {
    console.error('Payment error:', error.message);
    console.error('Error code:', error.code);
    console.error('Status code:', error.statusCode);
    console.error('Details:', error.details);
  }
}
```

## Testing

### Test Mode

Use Stripe test keys for development:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Test Cards

Stripe provides test cards for different scenarios:

- `4242 4242 4242 4242` - Success
- `4000 0000 0000 9995` - Decline
- `4000 0025 0000 3155` - Requires authentication

### Webhook Testing

Use Stripe CLI to forward webhooks to localhost:

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

---

## India-specific Payment Gateways

### Instamojo Service

Instamojo is a popular payment gateway in India for small businesses and startups.

#### Initialize Instamojo

```typescript
import { createInstamojoService } from './services/payments';

const instamojo = createInstamojoService({
  apiKey: process.env.INSTAMOJO_API_KEY,
  authToken: process.env.INSTAMOJO_AUTH_TOKEN,
  sandbox: process.env.NODE_ENV !== 'production',
});
```

#### Create Payment Request

```typescript
const paymentRequest = await instamojo.createPaymentRequest({
  amount: 999.0,
  purpose: 'Purchase Pro Plan',
  buyerName: 'John Doe',
  email: 'john@example.com',
  phone: '9876543210',
  redirectUrl: 'https://yourapp.com/payment/success',
  webhookUrl: 'https://yourapp.com/api/webhooks/instamojo',
  sendEmail: true,
  sendSms: true,
});

console.log('Payment URL:', paymentRequest.longurl);
// Redirect user to paymentRequest.longurl
```

#### Get Payment Details

```typescript
const payment = await instamojo.getPaymentDetails('PAYMENT_ID');
console.log('Status:', payment.status); // 'Credit', 'Pending', 'Failed'
```

#### Process Refund

```typescript
const refund = await instamojo.createRefund({
  paymentId: 'PAYMENT_ID',
  type: 'RFD', // RFD, TNR, QFL, QNR, EWN, TAN, PTH
  body: 'Customer requested refund',
});
```

#### Verify Webhook

```typescript
app.post('/api/webhooks/instamojo', (req, res) => {
  const signature = req.headers['x-mac'];
  const payload = JSON.stringify(req.body);

  if (instamojo.verifyWebhookSignature(payload, signature)) {
    // Process webhook
    const { payment_id, status } = req.body;
    // Update database
  }

  res.status(200).send('OK');
});
```

### Paytm Service

Paytm supports wallet, UPI, cards, net banking, and subscriptions.

#### Initialize Paytm

```typescript
import { createPaytmService } from './services/payments';

const paytm = createPaytmService({
  merchantId: process.env.PAYTM_MERCHANT_ID,
  merchantKey: process.env.PAYTM_MERCHANT_KEY,
  website: process.env.PAYTM_WEBSITE,
  industryType: process.env.PAYTM_INDUSTRY_TYPE,
  channelId: 'WEB',
  sandbox: process.env.NODE_ENV !== 'production',
});
```

#### Create Transaction

```typescript
// Step 1: Initiate transaction
const transaction = await paytm.initiateTransaction({
  orderId: 'ORDER_' + Date.now(),
  amount: 999.0,
  customerId: 'CUST_123',
  email: 'john@example.com',
  mobile: '9876543210',
  callbackUrl: 'https://yourapp.com/api/payment/callback',
});

// Step 2: Get payment URL
const paymentUrl = paytm.getPaymentPageUrl(
  transaction.orderId,
  transaction.txnToken
);

// Step 3: Redirect user
res.redirect(paymentUrl);
```

#### Check Transaction Status

```typescript
const status = await paytm.getTransactionStatus('ORDER_ID');

if (status.status === 'TXN_SUCCESS') {
  console.log('Payment successful!');
  console.log('Transaction ID:', status.txnId);
  console.log('Payment Mode:', status.paymentMode);
}
```

#### Process Refund

```typescript
const refund = await paytm.processRefund({
  orderId: 'ORDER_ID',
  refId: 'REFUND_' + Date.now(),
  refundAmount: 999.0,
  txnId: 'PAYTM_TXN_ID',
});
```

#### Create Subscription

```typescript
const subscription = await paytm.createSubscription({
  subscriptionId: 'SUB_' + Date.now(),
  planId: 'PLAN_123',
  customerId: 'CUST_123',
  amount: 499.0,
  frequency: 'MONTHLY',
  frequencyUnit: 1,
  startDate: '2026-01-15',
  expiryDate: '2027-01-15',
});
```

#### Validate UPI VPA

```typescript
const isValid = await paytm.validateUPIVPA('user@paytm');
```

### UPI Service

Direct UPI payment integration for generating links and QR codes.

#### Initialize UPI

```typescript
import { createUPIService } from './services/payments';

const upi = createUPIService({
  defaultPayeeVPA: 'merchant@paytm',
  merchantName: 'Your Business Name',
  merchantCode: '1234',
  validationApiKey: process.env.UPI_VALIDATION_API_KEY,
  validationApiUrl: process.env.UPI_VALIDATION_API_URL,
});
```

#### Generate UPI Link

```typescript
const transactionRef = upi.generateTransactionRef('ORD');

const upiLink = upi.generateUPILink({
  payeeVPA: 'merchant@paytm',
  payeeName: 'My Store',
  amount: 999.0,
  transactionNote: 'Purchase Pro Plan',
  transactionRef: transactionRef,
  merchantCode: '1234',
});

// Output: upi://pay?pa=merchant@paytm&pn=My%20Store&am=999.00&...
```

#### Generate QR Code

```typescript
// As base64 data URL (for web)
const qrCodeDataUrl = await upi.generateQRCode(upiLink, {
  width: 300,
  margin: 2,
  errorCorrectionLevel: 'M',
});

// Use in HTML: <img src="${qrCodeDataUrl}" />

// As PNG buffer (for storage)
const qrCodeBuffer = await upi.generateQRCodeBuffer(upiLink, {
  width: 512,
  errorCorrectionLevel: 'H',
});
```

#### Validate VPA

```typescript
// Format validation
const isValidFormat = upi.isValidVPAFormat('user@paytm'); // true

// Full validation with API
const validation = await upi.validateVPA('9876543210@paytm');
if (validation.isValid && validation.accountExists) {
  console.log('Account holder:', validation.nameAtBank);
}
```

#### Parse UPI Response

```typescript
const responseString = 'txnId=ABC123&Status=SUCCESS&responseCode=00';
const response = upi.parseUPIResponse(responseString);

if (response.status === 'SUCCESS') {
  console.log('Transaction ID:', response.txnId);
}
```

#### Create UPI Collect Request

```typescript
const collectRequest = await upi.createCollectRequest({
  payerVPA: 'customer@paytm',
  amount: 999.0,
  note: 'Payment for Order #12345',
  transactionRef: upi.generateTransactionRef(),
  merchantVPA: 'merchant@paytm',
  expiryMinutes: 15,
});
```

---

## Architecture

```
payments/
├── types.ts          # Shared types and interfaces
├── stripe.ts         # Stripe implementation (international)
├── instamojo.ts      # Instamojo implementation (India)
├── paytm.ts          # Paytm implementation (India)
├── upi.ts            # UPI implementation (India)
├── index.ts          # Main exports
└── README.md         # Documentation
```

## Type Safety

All payment operations are fully typed with TypeScript:

```typescript
import type {
  CheckoutSessionParams,
  SubscriptionParams,
  PaymentIntentParams,
  CustomerResult,
  SubscriptionResult
} from './services/payments/types';
```

## Logging

The gateway uses Pino for structured logging:

```typescript
// Logs include context for debugging
{
  "level": "info",
  "name": "stripe-payment-gateway",
  "customerId": "cus_123",
  "msg": "Stripe customer created"
}
```

## Security Best Practices

1. **Webhook Verification**: Always verify webhook signatures
2. **Secret Keys**: Never commit secret keys to version control
3. **Environment Variables**: Use `.env` files (excluded from git)
4. **HTTPS Only**: Use HTTPS for all webhook endpoints
5. **Error Messages**: Don't expose sensitive data in error messages

## Support

For issues or questions:
- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api

## License

MIT
