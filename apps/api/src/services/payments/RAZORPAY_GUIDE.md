# Razorpay Payment Gateway - Complete Integration Guide

Complete guide for integrating Razorpay payment gateway in Nexvo SalesIQ for India-based payments.

## Table of Contents

1. [Features](#features)
2. [Setup](#setup)
3. [API Reference](#api-reference)
4. [Usage Examples](#usage-examples)
5. [India-Specific Features](#india-specific-features)
6. [Webhook Integration](#webhook-integration)
7. [Frontend Integration](#frontend-integration)
8. [Testing](#testing)
9. [Security Best Practices](#security-best-practices)

## Features

### Core Payment Features
- ✅ Customer Management (CRUD operations)
- ✅ Order Creation & Management
- ✅ Payment Capture & Authorization
- ✅ Refunds (full & partial, instant & normal speed)
- ✅ Subscription Management (create, pause, resume, cancel)
- ✅ Plan Management
- ✅ Invoice Generation with GST support
- ✅ Virtual Accounts for collecting payments
- ✅ Payment Signature Verification
- ✅ Webhook Event Handling

### India-Specific Features
- 🇮🇳 **UPI Intent** - Direct integration with UPI apps (PhonePe, Google Pay, Paytm)
- 🇮🇳 **UPI Collect** - Request payment from VPA (username@bank)
- 🇮🇳 **QR Code Payments** - Generate UPI QR codes for payments
- 🇮🇳 **Bank Account Validation** - Validate IFSC codes and account numbers
- 🇮🇳 **GST Invoicing** - Generate GST-compliant invoices with HSN/SAC codes
- 🇮🇳 **All Payment Methods** - Cards, NetBanking, Wallets, UPI, EMI, Cardless EMI, Pay Later

## Setup

### 1. Install Dependencies

Already added to `package.json`:

```json
{
  "dependencies": {
    "razorpay": "^2.9.4"
  }
}
```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

Get your credentials from:
- API Keys: https://dashboard.razorpay.com/app/keys
- Webhook Secret: https://dashboard.razorpay.com/app/webhooks

### 3. Import the Service

```typescript
import { razorpayService } from './services/payments/razorpay.js';
```

## API Reference

### Customer Management

#### `createCustomer(organizationId, email, name, contact?, gstin?)`
Creates a new Razorpay customer.

**Parameters:**
- `organizationId` (string) - Your organization ID
- `email` (string) - Customer email
- `name` (string) - Customer name
- `contact?` (string) - Phone number (optional)
- `gstin?` (string) - GST number (optional)

**Returns:** `Promise<RazorpayCustomer>`

#### `fetchCustomer(customerId)`
Fetches customer details.

#### `editCustomer(customerId, updates)`
Updates customer information.

### Order Management

#### `createOrder(amount, currency, receipt, notes?)`
Creates a new payment order.

**Parameters:**
- `amount` (number) - Amount in INR (e.g., 499.99)
- `currency` (string) - Currency code (default: 'INR')
- `receipt` (string) - Unique receipt ID
- `notes?` (Record<string, string>) - Metadata

**Returns:** `Promise<RazorpayOrder>`

#### `fetchOrder(orderId)`
Fetches order details.

#### `fetchOrderPayments(orderId)`
Fetches all payments for an order.

### Subscription Management

#### `createSubscription(planId, customerId, totalCount?, startAt?, options?)`
Creates a new subscription.

**Options:**
- `quantity?` (number) - Number of licenses/seats
- `addons?` - Additional add-ons
- `notes?` - Metadata
- `notify?` (boolean) - Send email notification
- `offer_id?` - Promotional offer ID

#### `cancelSubscription(subscriptionId, cancelAtCycleEnd?)`
Cancels a subscription.

#### `pauseSubscription(subscriptionId, pauseAt?)`
Pauses a subscription.

#### `resumeSubscription(subscriptionId, resumeAt?)`
Resumes a paused subscription.

#### `fetchSubscription(subscriptionId)`
Fetches subscription details.

### Plan Management

#### `createPlan(planName, amount, currency, interval, period, description?)`
Creates a subscription plan.

**Parameters:**
- `planName` (string) - Plan name
- `amount` (number) - Amount in INR
- `currency` (string) - Currency code
- `interval` (number) - Billing interval (e.g., 1)
- `period` ('daily' | 'weekly' | 'monthly' | 'yearly')
- `description?` (string) - Plan description

#### `fetchPlan(planId)`
Fetches plan details.

### Payment Management

#### `fetchPayment(paymentId)`
Fetches payment details.

#### `capturePayment(paymentId, amount, currency?)`
Captures an authorized payment.

#### `refundPayment(paymentId, amount?, notes?, speed?)`
Refunds a payment (full or partial).

**Speed:**
- `'normal'` - Standard refund (5-7 days)
- `'optimum'` - Instant refund (if available)

#### `fetchPaymentRefunds(paymentId)`
Fetches all refunds for a payment.

### Signature Verification

#### `verifyPaymentSignature(orderId, paymentId, signature)`
Verifies payment signature for security.

**Returns:** `boolean`

#### `verifySubscriptionSignature(subscriptionId, paymentId, signature)`
Verifies subscription payment signature.

**Returns:** `boolean`

### Invoice Management

#### `createInvoice(customerId, lineItems, description?, options?)`
Creates a standard invoice.

#### `createGSTInvoice(options)`
Creates a GST-compliant invoice with HSN/SAC codes.

**Options:**
- `customer_id` - Customer ID
- `line_items` - Array of line items with HSN/SAC codes
- `supply_state_code?` - State code for GST
- `customer_gstin?` - Customer's GST number
- `description?` - Invoice description

#### `fetchInvoice(invoiceId)`
Fetches invoice details.

#### `cancelInvoice(invoiceId)`
Cancels an invoice.

### Virtual Account Management

#### `createVirtualAccount(customerId, receivers, options?)`
Creates a virtual account for collecting payments.

**Receivers:**
- `'bank_account'` - Bank transfer
- `'vpa'` - UPI VPA

#### `fetchVirtualAccount(virtualAccountId)`
Fetches virtual account details.

#### `closeVirtualAccount(virtualAccountId)`
Closes a virtual account.

### India-Specific Methods

#### `createUPIIntent(options)`
Creates a UPI intent for mobile apps.

#### `createUPICollect(options)`
Creates a UPI collect request for VPA.

#### `createQRCode(options)`
Generates a UPI QR code for payments.

#### `fetchQRCode(qrCodeId)`
Fetches QR code details.

#### `closeQRCode(qrCodeId)`
Closes a QR code.

#### `validateBankAccount(accountNumber, ifsc, name?)`
Validates bank account details.

**Returns:** `Promise<BankAccountValidationResult>`

### Webhook Management

#### `constructWebhookEvent(body, signature, secret?)`
Verifies and parses webhook events.

### Utility Methods

#### `toPaise(amount)`
Converts rupees to paise.

#### `toRupees(amount)`
Converts paise to rupees.

#### `formatAmount(amount, currency?)`
Formats amount for display (₹999.99).

#### `generateReceiptId(prefix?)`
Generates unique receipt ID.

## Usage Examples

### Example 1: One-Time Payment Flow

```typescript
import { razorpayService } from './services/payments/razorpay.js';

// Backend - Create order
app.post('/api/payments/create-order', async (request, reply) => {
  try {
    const { amount, productId } = request.body;

    const order = await razorpayService.createOrder(
      amount,
      'INR',
      razorpayService.generateReceiptId('ORDER'),
      { product_id: productId }
    );

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    };
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

// Backend - Verify payment
app.post('/api/payments/verify', async (request, reply) => {
  try {
    const { orderId, paymentId, signature } = request.body;

    const isValid = razorpayService.verifyPaymentSignature(
      orderId,
      paymentId,
      signature
    );

    if (isValid) {
      // Payment is authentic - update database, send confirmation email
      const payment = await razorpayService.fetchPayment(paymentId);

      // Process order
      await processOrder(orderId, payment);

      return { success: true, verified: true };
    } else {
      return reply.code(400).send({ error: 'Invalid signature' });
    }
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});
```

### Example 2: Subscription Flow

```typescript
// Create a subscription plan
const plan = await razorpayService.createPlan(
  'Pro Plan',
  999,
  'INR',
  1,
  'monthly',
  'Access to all premium features'
);

// Create customer
const customer = await razorpayService.createCustomer(
  'org_abc123',
  'user@example.com',
  'John Doe',
  '+919876543210'
);

// Create subscription
const subscription = await razorpayService.createSubscription(
  plan.id,
  customer.id,
  12, // 12 months
  undefined, // Start immediately
  {
    quantity: 5, // 5 team members
    notify: true,
    notes: { team_id: 'team_xyz' }
  }
);

// Later... pause subscription
await razorpayService.pauseSubscription(subscription.id);

// Resume subscription
await razorpayService.resumeSubscription(subscription.id);

// Cancel at end of billing period
await razorpayService.cancelSubscription(subscription.id, true);
```

### Example 3: GST Invoice Generation

```typescript
const gstInvoice = await razorpayService.createGSTInvoice({
  customer_id: 'cust_xxxxxxxxxxxxx',
  line_items: [
    {
      name: 'SalesIQ Pro License',
      description: 'Annual software license',
      amount: 10000,
      currency: 'INR',
      quantity: 1,
      hsn_code: '998314', // HSN for software services
      tax_rate: 18, // 18% GST
      tax_inclusive: false
    },
    {
      name: 'Premium Support',
      description: '24/7 priority support',
      amount: 2000,
      currency: 'INR',
      quantity: 1,
      sac_code: '998314', // SAC for support services
      tax_rate: 18,
      tax_inclusive: false
    }
  ],
  supply_state_code: '29', // Karnataka
  customer_gstin: '29ABCDE1234F1Z5',
  description: 'Annual subscription invoice - 2024',
  notes: {
    invoice_type: 'B2B',
    financial_year: '2024-25'
  }
});

console.log('Invoice URL:', gstInvoice.short_url);
console.log('Total Amount:', razorpayService.formatAmount(gstInvoice.amount));
```

### Example 4: UPI Payment Integration

```typescript
// UPI Intent (for mobile apps)
const upiOrder = await razorpayService.createUPIIntent({
  amount: 499,
  currency: 'INR',
  receipt: 'upi_' + Date.now(),
  description: 'Product purchase',
  customer: {
    name: 'John Doe',
    contact: '+919876543210',
    email: 'john@example.com'
  }
});

// UPI Collect (request from VPA)
const collectOrder = await razorpayService.createUPICollect({
  amount: 499,
  currency: 'INR',
  vpa: 'user@paytm',
  receipt: 'collect_' + Date.now(),
  description: 'Product purchase'
});

// Generate QR Code
const qrCode = await razorpayService.createQRCode({
  name: 'Store Counter Payment',
  usage: 'multiple_use',
  type: 'upi_qr',
  fixed_amount: true,
  payment_amount: 500,
  description: 'Scan to pay ₹500',
  notes: { location: 'store_1', counter: 'A1' }
});

console.log('QR Code Image:', qrCode.image_url);
```

### Example 5: Virtual Account for Collection

```typescript
// Create virtual account
const virtualAccount = await razorpayService.createVirtualAccount(
  'cust_xxxxxxxxxxxxx',
  ['bank_account', 'vpa'], // Both bank transfer and UPI
  {
    description: 'Payment for Order #12345',
    amount_expected: 5000,
    notes: { order_id: '12345' }
  }
);

// Customer can now transfer to:
console.log('Bank Account:', virtualAccount.receivers.find(r => r.account_number));
console.log('UPI VPA:', virtualAccount.receivers.find(r => r.username));

// Check payment status
const va = await razorpayService.fetchVirtualAccount(virtualAccount.id);
console.log('Amount Paid:', razorpayService.formatAmount(va.amount_paid));

// Close when done
await razorpayService.closeVirtualAccount(virtualAccount.id);
```

### Example 6: Refund Management

```typescript
// Full refund
const fullRefund = await razorpayService.refundPayment(
  'pay_xxxxxxxxxxxxx'
);

// Partial refund with instant speed
const partialRefund = await razorpayService.refundPayment(
  'pay_xxxxxxxxxxxxx',
  100.00, // Refund ₹100
  { reason: 'Customer requested partial refund' },
  'optimum' // Instant refund (if eligible)
);

// Check all refunds for a payment
const refunds = await razorpayService.fetchPaymentRefunds('pay_xxxxxxxxxxxxx');
console.log('Total Refunded:', refunds.reduce((sum, r) => sum + r.amount, 0));
```

## India-Specific Features

### UPI Payments

UPI is the most popular payment method in India. Support for:

- **UPI Intent**: Direct app-to-app payment (mobile only)
- **UPI Collect**: Request payment from UPI ID
- **UPI QR**: Scan and pay via any UPI app

### GST Compliance

Generate GST-compliant invoices with:

- HSN codes for goods
- SAC codes for services
- CGST, SGST, IGST calculation
- State-wise taxation
- B2B and B2C invoices

### Bank Account Validation

Validate bank accounts before payouts:

```typescript
const validation = await razorpayService.validateBankAccount(
  '1234567890',
  'HDFC0000123',
  'John Doe'
);

if (validation.valid) {
  console.log('Account holder:', validation.name_at_bank);
} else {
  console.error('Invalid account:', validation.error);
}
```

## Webhook Integration

### Setting Up Webhooks

1. Go to https://dashboard.razorpay.com/app/webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Select events to receive
4. Copy the webhook secret to `.env`

### Webhook Handler Example

```typescript
import { razorpayService } from './services/payments/razorpay.js';
import { FastifyRequest, FastifyReply } from 'fastify';

app.post('/api/webhooks/razorpay', async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);

    // Verify and parse event
    const event = razorpayService.constructWebhookEvent(body, signature);

    // Handle different event types
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentSuccess(event.payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailure(event.payload.payment.entity);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.subscription.entity);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.payload.invoice.entity);
        break;

      case 'virtual_account.credited':
        await handleVirtualAccountPayment(event.payload.virtual_account.entity);
        break;

      case 'qr_code.credited':
        await handleQRCodePayment(event.payload.qr_code.entity);
        break;

      default:
        console.log('Unhandled event:', event.event);
    }

    return { status: 'ok' };
  } catch (error) {
    console.error('Webhook error:', error);
    return reply.code(400).send({ error: 'Webhook processing failed' });
  }
});

// Handler functions
async function handlePaymentSuccess(payment: any) {
  // Update order status
  // Send confirmation email
  // Trigger fulfillment
  console.log('Payment successful:', payment.id);
}

async function handleSubscriptionCharged(subscription: any) {
  // Update subscription status
  // Send receipt
  console.log('Subscription charged:', subscription.id);
}
```

### Important Webhook Events

- `payment.authorized` - Payment authorized (needs capture)
- `payment.captured` - Payment successful
- `payment.failed` - Payment failed
- `order.paid` - Order fully paid
- `subscription.charged` - Subscription payment successful
- `subscription.cancelled` - Subscription cancelled
- `subscription.paused` - Subscription paused
- `subscription.resumed` - Subscription resumed
- `invoice.paid` - Invoice paid
- `virtual_account.credited` - Payment received in virtual account
- `qr_code.credited` - Payment via QR code

## Frontend Integration

### Standard Checkout

```html
<!-- Add Razorpay Checkout script -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

```typescript
// Create order on backend first
const response = await fetch('/api/payments/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 999 })
});

const { orderId, amount, currency } = await response.json();

// Open Razorpay checkout
const options = {
  key: 'rzp_test_xxxxxxxxxxxxxxxx', // Your key ID
  amount: amount,
  currency: currency,
  name: 'Nexvo SalesIQ',
  description: 'Pro Plan Subscription',
  image: 'https://yourdomain.com/logo.png',
  order_id: orderId,
  handler: async function (response) {
    // Verify on backend
    const verifyResponse = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature
      })
    });

    const result = await verifyResponse.json();
    if (result.verified) {
      window.location.href = '/success';
    }
  },
  prefill: {
    name: 'John Doe',
    email: 'john@example.com',
    contact: '+919876543210'
  },
  notes: {
    address: 'Customer address'
  },
  theme: {
    color: '#3399cc'
  },
  modal: {
    ondismiss: function() {
      console.log('Checkout closed');
    }
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

### UPI Intent (Mobile Only)

```typescript
const options = {
  key: 'rzp_test_xxxxxxxxxxxxxxxx',
  amount: amount,
  currency: 'INR',
  order_id: orderId,
  method: 'upi',
  vpa: 'user@upi', // Optional: Pre-fill UPI ID
  handler: function (response) {
    // Verify payment
  }
};
```

## Testing

### Test Mode

Use test API keys (starting with `rzp_test_`) for development:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_key_secret
```

### Test Cards

- **Success**: 4111 1111 1111 1111
- **Failure**: 4111 1111 1111 1234
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **OTP**: 1234 (for 3D Secure)

### Test UPI IDs

- **Success**: success@razorpay
- **Failure**: failure@razorpay

### Test Net Banking

Select any bank and use:
- **Success**: Test for success
- **Failure**: Test for failure

## Security Best Practices

1. **Never expose secrets**: Keep `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` confidential
2. **Always verify signatures**: Use `verifyPaymentSignature()` for all payment confirmations
3. **Validate webhook events**: Always verify webhook signatures before processing
4. **Use HTTPS**: Always use HTTPS in production for webhook endpoints
5. **Server-side verification**: Never trust client-side payment status alone
6. **Rate limiting**: Implement rate limiting on payment endpoints
7. **Log all transactions**: Maintain audit logs for compliance
8. **PCI compliance**: Never store card details on your server
9. **Amount verification**: Always verify amounts on server-side
10. **Idempotency**: Use unique receipt IDs to prevent duplicate orders

## Error Handling

All methods throw errors that should be caught:

```typescript
try {
  const order = await razorpayService.createOrder(999, 'INR', 'receipt_001');
} catch (error) {
  if (error.message.includes('not initialized')) {
    // Razorpay not configured
  } else if (error.message.includes('Invalid API')) {
    // Invalid credentials
  } else {
    // Other errors
  }
  console.error('Payment error:', error.message);
}
```

## Production Checklist

- [ ] Switch to live API keys (`rzp_live_...`)
- [ ] Configure webhook URL with HTTPS
- [ ] Test all payment flows
- [ ] Set up proper error logging
- [ ] Implement retry logic for failed webhooks
- [ ] Set up monitoring and alerts
- [ ] Review and test refund flows
- [ ] Configure email notifications
- [ ] Set up proper access controls
- [ ] Document payment reconciliation process

## Support & Resources

- **Razorpay Dashboard**: https://dashboard.razorpay.com/
- **Documentation**: https://razorpay.com/docs/
- **API Reference**: https://razorpay.com/docs/api/
- **Checkout.js**: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
- **Test Cards**: https://razorpay.com/docs/payments/payments/test-card-details/
- **Support**: https://razorpay.com/support/

## License

This service is part of the Nexvo SalesIQ project.
