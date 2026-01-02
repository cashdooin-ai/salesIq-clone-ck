# Stripe Webhook Setup Guide

This guide explains how to set up and test Stripe webhooks for the Nexvo SalesIQ application.

## What are Webhooks?

Webhooks allow Stripe to notify your application when events happen in your Stripe account, such as:
- A customer completes a payment
- A subscription is created or canceled
- A payment fails
- An invoice is paid

## Development Setup (Local Testing)

### Step 1: Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/vX.X.X/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/

# Windows
scoop install stripe
```

### Step 2: Login to Stripe

```bash
stripe login
```

This will open your browser to authenticate with Stripe.

### Step 3: Forward Webhooks to Localhost

```bash
# Forward webhooks to your local API endpoint
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This command will:
1. Start listening for Stripe events
2. Forward them to your local endpoint
3. Display a webhook signing secret (starts with `whsec_`)

### Step 4: Update Environment Variables

Copy the webhook secret from the CLI output and add it to your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 5: Test Webhook Events

In another terminal, trigger test events:

```bash
# Test checkout completed
stripe trigger checkout.session.completed

# Test payment succeeded
stripe trigger payment_intent.succeeded

# Test subscription created
stripe trigger customer.subscription.created

# Test subscription deleted
stripe trigger customer.subscription.deleted

# Test payment failed
stripe trigger payment_intent.payment_failed
```

## Production Setup

### Step 1: Create Webhook Endpoint in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your production URL: `https://api.yourdomain.com/api/webhooks/stripe`
4. Select events to listen to (see recommended events below)
5. Click "Add endpoint"

### Step 2: Configure Events to Listen To

Select these events for a complete implementation:

**Checkout Events:**
- `checkout.session.completed`
- `checkout.session.expired`

**Subscription Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`

**Payment Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

**Invoice Events:**
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_succeeded`
- `invoice.upcoming`
- `invoice.finalized`

**Payment Method Events:**
- `payment_method.attached`
- `payment_method.detached`
- `payment_method.updated`

**Customer Events:**
- `customer.created`
- `customer.updated`
- `customer.deleted`

### Step 3: Get Webhook Signing Secret

After creating the endpoint:
1. Click on the endpoint in the dashboard
2. Click "Reveal" under "Signing secret"
3. Copy the secret (starts with `whsec_`)

### Step 4: Update Production Environment

Add the webhook secret to your production environment variables:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Implementation in Your API

### Fastify Route Handler

```typescript
import { FastifyInstance } from 'fastify';
import { stripeGateway } from './services/payments/stripe';

export default async function webhookRoutes(app: FastifyInstance) {
  // Stripe webhook endpoint
  app.post('/api/webhooks/stripe', {
    config: {
      rawBody: true, // Important: Need raw body for signature verification
    },
    handler: async (request, reply) => {
      try {
        const signature = request.headers['stripe-signature'];

        if (!signature) {
          return reply.code(400).send({ error: 'Missing stripe-signature header' });
        }

        // Construct and verify the event
        const event = await stripeGateway.constructWebhookEvent(
          request.rawBody as Buffer,
          signature as string
        );

        // Handle the event
        await stripeGateway.handleWebhookEvent(event);

        // Log for debugging
        request.log.info({
          eventId: event.id,
          eventType: event.type,
        }, 'Webhook processed successfully');

        return { received: true };
      } catch (error) {
        request.log.error({ error }, 'Webhook processing failed');
        return reply.code(400).send({
          error: 'Webhook processing failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}
```

### Enable Raw Body in Fastify

Make sure your Fastify server is configured to preserve raw body:

```typescript
import fastify from 'fastify';

const app = fastify({
  logger: true,
  // Add raw body support
  bodyLimit: 1048576, // 1MB
});

// Add content type parser for raw body
app.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  (req, body, done) => {
    try {
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
);

// Make raw body available on request
app.addHook('preValidation', async (request, reply) => {
  if (request.url.includes('/webhooks/stripe')) {
    (request as any).rawBody = request.body;
  }
});
```

## Custom Event Handlers

Extend the `StripePaymentGateway` class for custom logic:

```typescript
import { StripePaymentGateway, WebhookEvent } from './services/payments/stripe';
import { db } from '../database';
import { emailService } from '../services/email';

class CustomStripeGateway extends StripePaymentGateway {
  protected async handleCheckoutCompleted(event: WebhookEvent): Promise<void> {
    const session = event.data;

    // Update database
    await db.subscription.create({
      customerId: session.customer,
      subscriptionId: session.subscription,
      status: 'active',
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(session.customer_email);

    // Call parent implementation
    await super.handleCheckoutCompleted(event);
  }

  protected async handleSubscriptionDeleted(event: WebhookEvent): Promise<void> {
    const subscription = event.data;

    // Update database
    await db.subscription.update({
      where: { subscriptionId: subscription.id },
      data: { status: 'canceled' },
    });

    // Revoke access
    await this.revokeUserAccess(subscription.customer);

    // Send cancellation email
    await emailService.sendCancellationEmail(subscription.customer);
  }

  private async revokeUserAccess(customerId: string): Promise<void> {
    // Your logic to revoke access
  }
}

export const customStripeGateway = new CustomStripeGateway(
  process.env.STRIPE_SECRET_KEY!,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

## Security Best Practices

### 1. Always Verify Signatures

Never skip webhook signature verification:

```typescript
// ✅ GOOD - Verifies signature
const event = await stripeGateway.constructWebhookEvent(body, signature);

// ❌ BAD - Trusts webhook without verification
const event = JSON.parse(body);
```

### 2. Use HTTPS in Production

Stripe requires HTTPS for webhook endpoints in production.

### 3. Handle Events Idempotently

Stripe may send the same event multiple times. Handle events idempotently:

```typescript
protected async handleCheckoutCompleted(event: WebhookEvent): Promise<void> {
  const session = event.data;

  // Check if already processed
  const existing = await db.subscription.findUnique({
    where: { sessionId: session.id },
  });

  if (existing) {
    console.log('Event already processed, skipping');
    return;
  }

  // Process the event...
}
```

### 4. Return 200 Quickly

Process webhooks asynchronously and return 200 quickly:

```typescript
app.post('/api/webhooks/stripe', async (request, reply) => {
  try {
    const event = await stripeGateway.constructWebhookEvent(
      request.rawBody as Buffer,
      request.headers['stripe-signature'] as string
    );

    // Return 200 immediately
    reply.send({ received: true });

    // Process asynchronously
    setImmediate(async () => {
      await stripeGateway.handleWebhookEvent(event);
    });
  } catch (error) {
    return reply.code(400).send({ error: 'Invalid webhook' });
  }
});
```

### 5. Log All Webhook Events

Keep detailed logs for debugging:

```typescript
request.log.info({
  eventId: event.id,
  eventType: event.type,
  customerId: event.data.customer,
  timestamp: event.createdAt,
}, 'Webhook received');
```

## Testing Webhooks

### Manual Testing with Stripe CLI

```bash
# Trigger specific events
stripe trigger payment_intent.succeeded

# Send custom event data
stripe trigger payment_intent.succeeded \
  --add payment_intent:amount=5000 \
  --add payment_intent:currency=usd

# Test with specific customer
stripe trigger customer.subscription.created \
  --add customer:id=cus_xxxxxxxxxxxxx
```

### Automated Testing

```typescript
import { stripeGateway } from './services/payments/stripe';

describe('Stripe Webhooks', () => {
  it('should handle checkout completed', async () => {
    const mockEvent = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: {
        id: 'cs_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
      },
      createdAt: new Date(),
    };

    await stripeGateway.handleWebhookEvent(mockEvent);

    // Assert database was updated
    // Assert email was sent
    // etc.
  });
});
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check endpoint URL is correct
2. Verify HTTPS is enabled (production)
3. Check firewall/security groups
4. Review Stripe dashboard for delivery attempts

### Signature Verification Fails

1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Check raw body is being used (not parsed JSON)
3. Ensure no middleware is modifying the body

### Events Being Skipped

1. Check server logs for errors
2. Verify event type is being handled
3. Review Stripe dashboard event details

## Monitoring

### Stripe Dashboard

Monitor webhook delivery in the Stripe dashboard:
- https://dashboard.stripe.com/webhooks
- View successful and failed deliveries
- Retry failed deliveries
- See response codes and errors

### Application Logs

Log all webhook events for monitoring:

```typescript
logger.info({
  event: event.type,
  status: 'success',
  processingTime: Date.now() - startTime,
}, 'Webhook processed');
```

### Alerting

Set up alerts for:
- High webhook failure rate
- Unhandled event types
- Processing time exceeding threshold

## Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Event Types Reference](https://stripe.com/docs/api/events/types)
