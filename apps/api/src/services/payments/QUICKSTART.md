# Stripe Payment Gateway - Quick Start Guide

Get up and running with Stripe payments in 5 minutes.

## Step 1: Install Dependencies

```bash
cd /home/user/salesIq-clone-ck/apps/api
npm install
# or
pnpm install
```

This will install the `stripe` package (v17.5.0) and all dependencies.

## Step 2: Get Your Stripe Keys

1. Sign up for Stripe: https://dashboard.stripe.com/register
2. Get your API keys: https://dashboard.stripe.com/test/apikeys
3. Copy both:
   - **Secret Key** (starts with `sk_test_`)
   - **Publishable Key** (starts with `pk_test_`)

## Step 3: Configure Environment Variables

Create or update `/home/user/salesIq-clone-ck/apps/api/.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
PAYMENT_GATEWAY=stripe
```

## Step 4: Test the Integration

Create a test file to verify everything works:

```typescript
// test-stripe.ts
import { stripeGateway } from './src/services/payments/stripe';

async function testStripe() {
  try {
    console.log('Testing Stripe integration...\n');

    // Test 1: Create a customer
    console.log('1. Creating customer...');
    const customer = await stripeGateway.createCustomer(
      'org_test_123',
      'test@example.com',
      'Test Customer'
    );
    console.log('✓ Customer created:', customer.id);

    // Test 2: Get customer
    console.log('\n2. Retrieving customer...');
    const retrievedCustomer = await stripeGateway.getCustomer(customer.id);
    console.log('✓ Customer retrieved:', retrievedCustomer.email);

    // Test 3: Update customer
    console.log('\n3. Updating customer...');
    await stripeGateway.updateCustomer(customer.id, {
      name: 'Updated Test Customer',
    });
    console.log('✓ Customer updated');

    // Test 4: Get payment methods
    console.log('\n4. Getting payment methods...');
    const methods = await stripeGateway.getPaymentMethods(customer.id);
    console.log('✓ Payment methods:', methods.length);

    // Test 5: Delete customer
    console.log('\n5. Deleting customer...');
    await stripeGateway.deleteCustomer(customer.id);
    console.log('✓ Customer deleted');

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testStripe();
```

Run the test:

```bash
npx tsx test-stripe.ts
```

## Step 5: Create Your First Product and Price

```typescript
import { stripeGateway } from './src/services/payments/stripe';

async function setupProducts() {
  // Sync a complete pricing plan
  await stripeGateway.syncProduct({
    id: 'plan_starter',
    name: 'Starter Plan',
    description: 'Perfect for small teams',
    prices: [
      {
        amount: 999, // $9.99/month
        currency: 'usd',
        interval: 'month',
      },
      {
        amount: 9990, // $99.90/year (save 16%)
        currency: 'usd',
        interval: 'year',
      },
    ],
    features: [
      'Up to 1,000 chats/month',
      'Basic analytics',
      'Email support',
    ],
    isActive: true,
  });

  console.log('✓ Products and prices synced to Stripe!');
}

setupProducts();
```

## Step 6: Create a Checkout Session

```typescript
import { stripeGateway } from './src/services/payments/stripe';

async function createCheckout() {
  // Create customer
  const customer = await stripeGateway.createCustomer(
    'org_123',
    'customer@example.com',
    'John Doe'
  );

  // Create checkout session
  const session = await stripeGateway.createCheckoutSession({
    customerId: customer.id,
    priceId: 'price_1234567890', // Replace with your price ID
    successUrl: 'http://localhost:3000/success',
    cancelUrl: 'http://localhost:3000/cancel',
    trialDays: 14,
  });

  console.log('Checkout URL:', session.url);
  console.log('Open this URL to complete payment');
}

createCheckout();
```

## Step 7: Set Up Webhooks (Optional for Development)

### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### Forward Webhooks to Local Server

```bash
# Login to Stripe
stripe login

# Forward webhooks (replace with your webhook endpoint)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook secret (starts with `whsec_`) and add to `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Test Webhook Events

```bash
# In another terminal
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

## Step 8: Implement Webhook Handler

```typescript
// src/routes/webhooks.ts
import { FastifyInstance } from 'fastify';
import { stripeGateway } from '../services/payments/stripe';

export default async function webhookRoutes(app: FastifyInstance) {
  app.post('/api/webhooks/stripe', {
    config: {
      rawBody: true,
    },
    handler: async (request, reply) => {
      try {
        const signature = request.headers['stripe-signature'] as string;

        if (!signature) {
          return reply.code(400).send({ error: 'Missing signature' });
        }

        const event = await stripeGateway.constructWebhookEvent(
          request.rawBody as Buffer,
          signature
        );

        await stripeGateway.handleWebhookEvent(event);

        return { received: true };
      } catch (error) {
        request.log.error({ error }, 'Webhook error');
        return reply.code(400).send({ error: 'Webhook failed' });
      }
    },
  });
}
```

## Common Use Cases

### 1. Subscription Signup Flow

```typescript
// 1. Create customer
const customer = await stripeGateway.createCustomer(
  organizationId,
  email,
  name
);

// 2. Create checkout session
const session = await stripeGateway.createCheckoutSession({
  customerId: customer.id,
  priceId: 'price_123',
  successUrl: 'https://app.example.com/welcome',
  cancelUrl: 'https://app.example.com/pricing',
  trialDays: 14,
});

// 3. Redirect user to session.url
// User completes payment on Stripe
// Stripe sends webhook to your server
// Activate subscription in webhook handler
```

### 2. Change Subscription Plan

```typescript
// Upgrade from monthly to annual
await stripeGateway.updateSubscription(
  subscriptionId,
  'price_annual',
  'create_prorations' // Pro-rate the difference
);
```

### 3. Cancel Subscription

```typescript
// Cancel at period end (recommended)
await stripeGateway.cancelSubscription(subscriptionId, false);

// Cancel immediately
await stripeGateway.cancelSubscription(subscriptionId, true);
```

### 4. One-time Payment

```typescript
const paymentIntent = await stripeGateway.createPaymentIntent({
  amount: 5000, // $50.00
  currency: 'usd',
  customerId: 'cus_123',
  description: 'Extra features purchase',
});

// Use paymentIntent.clientSecret on frontend
```

### 5. Customer Portal

```typescript
const portal = await stripeGateway.createBillingPortalSession(
  customerId,
  'https://app.example.com/settings'
);

// Redirect user to portal.url
// Customer can manage subscription, payment methods, invoices
```

## Next Steps

1. Read the full documentation: `/home/user/salesIq-clone-ck/apps/api/src/services/payments/README.md`
2. Check out examples: `/home/user/salesIq-clone-ck/apps/api/src/services/payments/examples.ts`
3. Set up webhooks: `/home/user/salesIq-clone-ck/apps/api/src/services/payments/WEBHOOK_SETUP.md`
4. Review Stripe docs: https://stripe.com/docs

## Troubleshooting

### "Stripe secret key is required" Error

Make sure `STRIPE_SECRET_KEY` is set in your `.env` file.

### Webhook Signature Verification Failed

1. Check `STRIPE_WEBHOOK_SECRET` is correct
2. Ensure raw body is being used (not parsed JSON)
3. Verify webhook endpoint URL matches Stripe dashboard

### Test Cards

Use these test cards for development:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 9995`
- **3D Secure**: `4000 0025 0000 3155`

**CVV**: Any 3 digits
**Expiry**: Any future date
**ZIP**: Any 5 digits

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Stripe Support: https://support.stripe.com

## Security Checklist

- [ ] API keys stored in `.env` (not in code)
- [ ] `.env` added to `.gitignore`
- [ ] Webhook signatures verified
- [ ] HTTPS enabled in production
- [ ] Error messages don't expose sensitive data
- [ ] Production keys only used in production

Happy coding!
