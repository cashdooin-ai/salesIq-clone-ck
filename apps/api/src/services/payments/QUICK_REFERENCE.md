# India Payment Gateways - Quick Reference

## Installation

```bash
npm install
```

## Environment Setup

Create `.env` file:

```env
# Instamojo
INSTAMOJO_API_KEY=test_your_api_key
INSTAMOJO_AUTH_TOKEN=test_your_auth_token

# Paytm
PAYTM_MERCHANT_ID=your_merchant_id
PAYTM_MERCHANT_KEY=your_merchant_key
PAYTM_WEBSITE=WEBSTAGING
PAYTM_INDUSTRY_TYPE=Retail

# UPI
UPI_DEFAULT_PAYEE_VPA=merchant@paytm
UPI_MERCHANT_NAME=Your Business Name

# General
NODE_ENV=development
```

## Quick Start

### Instamojo

```typescript
import { createInstamojoService } from './services/payments';

const instamojo = createInstamojoService({
  apiKey: process.env.INSTAMOJO_API_KEY!,
  authToken: process.env.INSTAMOJO_AUTH_TOKEN!,
  sandbox: true,
});

// Create payment
const payment = await instamojo.createPaymentRequest({
  amount: 999,
  purpose: 'Pro Plan',
  buyerName: 'John Doe',
  email: 'john@example.com',
  phone: '9876543210',
  redirectUrl: 'https://app.com/success',
});

// Redirect user to: payment.longurl
```

### Paytm

```typescript
import { createPaytmService } from './services/payments';

const paytm = createPaytmService({
  merchantId: process.env.PAYTM_MERCHANT_ID!,
  merchantKey: process.env.PAYTM_MERCHANT_KEY!,
  website: 'WEBSTAGING',
  industryType: 'Retail',
  sandbox: true,
});

// Initiate transaction
const txn = await paytm.initiateTransaction({
  orderId: 'ORDER_' + Date.now(),
  amount: 1499,
  customerId: 'CUST_123',
  callbackUrl: 'https://app.com/callback',
});

// Get payment URL
const url = paytm.getPaymentPageUrl(txn.orderId, txn.txnToken);
// Redirect user to: url
```

### UPI

```typescript
import { createUPIService } from './services/payments';

const upi = createUPIService({
  defaultPayeeVPA: 'merchant@paytm',
  merchantName: 'My Business',
});

// Generate UPI link
const upiLink = upi.generateUPILink({
  payeeVPA: 'merchant@paytm',
  amount: 999,
  transactionNote: 'Purchase',
  transactionRef: upi.generateTransactionRef(),
});

// Generate QR code
const qrCode = await upi.generateQRCode(upiLink);
// Use: <img src="${qrCode}" />
```

## Common Operations

### Check Payment Status

```typescript
// Instamojo
const payment = await instamojo.getPaymentDetails('PAYMENT_ID');
if (payment.status === 'Credit') {
  // Payment successful
}

// Paytm
const status = await paytm.getTransactionStatus('ORDER_ID');
if (status.status === 'TXN_SUCCESS') {
  // Payment successful
}
```

### Process Refund

```typescript
// Instamojo
await instamojo.createRefund({
  paymentId: 'PAYMENT_ID',
  type: 'RFD',
  body: 'Refund reason',
});

// Paytm
await paytm.processRefund({
  orderId: 'ORDER_ID',
  refId: 'REFUND_' + Date.now(),
  refundAmount: 999,
});
```

### Webhook Verification

```typescript
// Instamojo
app.post('/webhooks/instamojo', (req, res) => {
  const signature = req.headers['x-mac'];
  const payload = JSON.stringify(req.body);

  if (instamojo.verifyWebhookSignature(payload, signature)) {
    // Process webhook
  }
});

// Paytm
app.post('/payment/callback', (req, res) => {
  const { CHECKSUMHASH, ...params } = req.body;

  if (paytm.verifyChecksum(params, CHECKSUMHASH)) {
    // Process callback
  }
});
```

## Testing

```bash
# Run examples
npx tsx src/services/payments/examples-india.ts
```

## File Locations

```
/home/user/salesIq-clone-ck/apps/api/src/services/payments/
├── instamojo.ts          # Instamojo service
├── paytm.ts              # Paytm service
├── upi.ts                # UPI service
├── examples-india.ts     # Usage examples
├── index.ts              # Main exports
└── README.md             # Full documentation
```

## Sandbox Credentials

**Instamojo:** Get from https://test.instamojo.com
**Paytm:** Get from https://dashboard.paytm.com/next/developers

## Support Links

- **Instamojo API Docs:** https://docs.instamojo.com/docs
- **Paytm API Docs:** https://developer.paytm.com/docs
- **UPI Specification:** https://www.npci.org.in/what-we-do/upi

## Key Features

### Instamojo
- Payment requests
- Refunds (7 types)
- Webhook verification
- Pagination support

### Paytm
- All payment modes (UPI, wallet, cards, net banking)
- Subscriptions
- VPA validation
- Checksum verification

### UPI
- Payment links
- QR codes (base64 & buffer)
- VPA validation
- Collect requests
- Response parsing

---

**For detailed documentation, see:** [README.md](./README.md)
