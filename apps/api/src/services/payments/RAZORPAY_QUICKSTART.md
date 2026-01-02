# Razorpay Integration - Quick Start Guide

Get started with Razorpay payments in Nexvo SalesIQ in 5 minutes.

## 1. Setup Credentials

Add to `.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

Get credentials from: https://dashboard.razorpay.com/app/keys

## 2. Install Dependencies

```bash
cd apps/api
npm install
```

The `razorpay` package is already added to `package.json`.

## 3. Import Service

```typescript
import { razorpayService } from './services/payments/razorpay.js';
```

## 4. Create Your First Payment Order

```typescript
// Backend - Create order
const order = await razorpayService.createOrder(
  999,    // Amount in INR
  'INR',  // Currency
  'order_001',  // Receipt ID
  { product: 'Pro Plan' }  // Notes
);

console.log('Order ID:', order.id);
console.log('Amount:', razorpayService.formatAmount(order.amount));
```

## 5. Frontend Integration

Add to your HTML:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

Create payment:

```javascript
const options = {
  key: 'rzp_test_xxxxxxxxxxxxxxxx',
  amount: order.amount,
  currency: order.currency,
  order_id: order.id,
  name: 'Nexvo SalesIQ',
  description: 'Pro Plan',
  handler: async function (response) {
    // Verify on backend
    const result = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature
      })
    });

    if (result.ok) {
      alert('Payment successful!');
    }
  },
  prefill: {
    name: 'John Doe',
    email: 'john@example.com',
    contact: '+919876543210'
  },
  theme: {
    color: '#3399cc'
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

## 6. Verify Payment

```typescript
// Backend - Verify signature
const isValid = razorpayService.verifyPaymentSignature(
  orderId,
  paymentId,
  signature
);

if (isValid) {
  // Payment is authentic
  const payment = await razorpayService.fetchPayment(paymentId);
  console.log('Payment successful:', payment.id);
}
```

## Common Use Cases

### Create Subscription

```typescript
// 1. Create a plan
const plan = await razorpayService.createPlan(
  'Pro Plan',
  999,
  'INR',
  1,
  'monthly'
);

// 2. Create customer
const customer = await razorpayService.createCustomer(
  'org_123',
  'user@example.com',
  'John Doe',
  '+919876543210'
);

// 3. Create subscription
const subscription = await razorpayService.createSubscription(
  plan.id,
  customer.id,
  12,  // 12 billing cycles
  undefined,
  { notify: true }
);
```

### Refund Payment

```typescript
// Full refund
await razorpayService.refundPayment('pay_xxxxxxxxxxxxx');

// Partial refund
await razorpayService.refundPayment(
  'pay_xxxxxxxxxxxxx',
  100,  // Refund ₹100
  { reason: 'Customer request' },
  'optimum'  // Instant refund
);
```

### Generate GST Invoice

```typescript
const invoice = await razorpayService.createGSTInvoice({
  customer_id: 'cust_xxxxxxxxxxxxx',
  line_items: [
    {
      name: 'Software License',
      amount: 10000,
      currency: 'INR',
      quantity: 1,
      hsn_code: '998314',
      tax_rate: 18
    }
  ],
  customer_gstin: '29ABCDE1234F1Z5',
  supply_state_code: '29'
});
```

### Create UPI QR Code

```typescript
const qrCode = await razorpayService.createQRCode({
  name: 'Counter Payment',
  usage: 'multiple_use',
  type: 'upi_qr',
  payment_amount: 500
});

console.log('QR Image:', qrCode.image_url);
```

## Test Cards

Use these for testing:

- **Success**: 4111 1111 1111 1111
- **Failure**: 4111 1111 1111 1234
- **UPI Success**: success@razorpay
- **UPI Failure**: failure@razorpay

## Next Steps

1. Read [RAZORPAY_GUIDE.md](./RAZORPAY_GUIDE.md) for complete documentation
2. Check [razorpay-example-routes.ts](./razorpay-example-routes.ts) for API examples
3. Set up webhooks at https://dashboard.razorpay.com/app/webhooks
4. Test all payment flows before going live
5. Switch to live keys for production

## Files Created

- `razorpay.ts` - Main Razorpay service (1300+ lines)
- `RAZORPAY_GUIDE.md` - Complete integration guide
- `razorpay-example-routes.ts` - Example API routes
- `RAZORPAY_QUICKSTART.md` - This quick start guide

## All Available Methods

### Customers
- `createCustomer()` - Create customer
- `fetchCustomer()` - Get customer
- `editCustomer()` - Update customer

### Orders & Payments
- `createOrder()` - Create payment order
- `fetchOrder()` - Get order details
- `fetchOrderPayments()` - Get order payments
- `fetchPayment()` - Get payment details
- `capturePayment()` - Capture authorized payment
- `refundPayment()` - Refund payment
- `fetchPaymentRefunds()` - Get refund list

### Subscriptions
- `createSubscription()` - Create subscription
- `cancelSubscription()` - Cancel subscription
- `pauseSubscription()` - Pause subscription
- `resumeSubscription()` - Resume subscription
- `fetchSubscription()` - Get subscription

### Plans
- `createPlan()` - Create subscription plan
- `fetchPlan()` - Get plan details

### Invoices
- `createInvoice()` - Create invoice
- `createGSTInvoice()` - Create GST invoice
- `fetchInvoice()` - Get invoice
- `cancelInvoice()` - Cancel invoice

### Virtual Accounts
- `createVirtualAccount()` - Create virtual account
- `fetchVirtualAccount()` - Get virtual account
- `closeVirtualAccount()` - Close virtual account

### UPI & QR
- `createUPIIntent()` - UPI intent payment
- `createUPICollect()` - UPI collect request
- `createQRCode()` - Generate QR code
- `fetchQRCode()` - Get QR code
- `closeQRCode()` - Close QR code

### Validation
- `validateBankAccount()` - Validate bank details

### Verification
- `verifyPaymentSignature()` - Verify payment
- `verifySubscriptionSignature()` - Verify subscription
- `constructWebhookEvent()` - Verify webhook

### Utilities
- `toPaise()` - Convert to paise
- `toRupees()` - Convert to rupees
- `formatAmount()` - Format currency
- `generateReceiptId()` - Generate receipt ID

## Support

- **Razorpay Dashboard**: https://dashboard.razorpay.com/
- **Documentation**: https://razorpay.com/docs/
- **API Reference**: https://razorpay.com/docs/api/
- **Support**: https://razorpay.com/support/

## Production Checklist

Before going live:

- [ ] Replace test keys with live keys
- [ ] Test all payment flows
- [ ] Set up webhook endpoints with HTTPS
- [ ] Configure email notifications
- [ ] Set up error monitoring
- [ ] Test refund process
- [ ] Review security settings
- [ ] Enable two-factor authentication
- [ ] Set up payment reconciliation
- [ ] Document incident response process

---

Made with ❤️ for Nexvo SalesIQ
