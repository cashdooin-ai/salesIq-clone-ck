import Stripe from 'stripe';
import { prisma } from '@nexvo/database';
import { FastifyRequest } from 'fastify';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Stripe.Event | null {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    return null;
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(event: Stripe.Event, log: any) {
  const subscription = event.data.object as Stripe.Subscription;
  log.info({ subscriptionId: subscription.id }, 'Subscription created');

  try {
    // Find organization by Stripe customer ID
    const organization = await prisma.organization.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
    });

    if (!organization) {
      log.warn({ customerId: subscription.customer }, 'Organization not found for subscription');
      return;
    }

    // Get the price and plan details
    const price = subscription.items.data[0]?.price;
    const planName = price?.metadata?.planName || 'STARTER';

    // Find or create plan
    const plan = await prisma.pricingPlan.findUnique({
      where: { name: planName.toLowerCase() },
    });

    if (!plan) {
      log.warn({ planName }, 'Pricing plan not found');
      return;
    }

    // Create subscription in database
    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        planId: plan.id,
        stripeSubscriptionId: subscription.id,
        status: subscription.status === 'active' ? 'ACTIVE' : 'TRIALING',
        billingCycle: price?.recurring?.interval === 'year' ? 'YEARLY' : 'MONTHLY',
        currency: subscription.currency.toUpperCase(),
        pricePerPeriod: subscription.items.data[0]?.price.unit_amount || 0,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        paymentGateway: 'STRIPE',
      },
    });

    // Update organization plan
    await prisma.organization.update({
      where: { id: organization.id },
      data: { plan: planName.toUpperCase() as any },
    });

    log.info({ organizationId: organization.id, subscriptionId: subscription.id }, 'Subscription created in database');
  } catch (error) {
    log.error({ error, subscriptionId: subscription.id }, 'Failed to handle subscription created');
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(event: Stripe.Event, log: any) {
  const subscription = event.data.object as Stripe.Subscription;
  log.info({ subscriptionId: subscription.id }, 'Subscription updated');

  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) {
      log.warn({ subscriptionId: subscription.id }, 'Subscription not found in database');
      return;
    }

    // Map Stripe status to our status
    let status = dbSubscription.status;
    switch (subscription.status) {
      case 'active':
        status = 'ACTIVE';
        break;
      case 'past_due':
        status = 'PAST_DUE';
        break;
      case 'canceled':
        status = 'CANCELED';
        break;
      case 'incomplete':
        status = 'INCOMPLETE';
        break;
      case 'trialing':
        status = 'TRIALING';
        break;
      case 'paused':
        status = 'PAUSED';
        break;
    }

    // Update subscription
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    log.info({ subscriptionId: subscription.id, status }, 'Subscription updated in database');
  } catch (error) {
    log.error({ error, subscriptionId: subscription.id }, 'Failed to handle subscription updated');
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(event: Stripe.Event, log: any) {
  const subscription = event.data.object as Stripe.Subscription;
  log.info({ subscriptionId: subscription.id }, 'Subscription deleted');

  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      include: { organization: true },
    });

    if (!dbSubscription) {
      log.warn({ subscriptionId: subscription.id }, 'Subscription not found in database');
      return;
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    // Downgrade organization to free plan
    await prisma.organization.update({
      where: { id: dbSubscription.organizationId },
      data: { plan: 'FREE' },
    });

    log.info({ subscriptionId: subscription.id, organizationId: dbSubscription.organizationId }, 'Subscription deleted in database');
  } catch (error) {
    log.error({ error, subscriptionId: subscription.id }, 'Failed to handle subscription deleted');
    throw error;
  }
}

/**
 * Handle invoice.paid event
 */
async function handleInvoicePaid(event: Stripe.Event, log: any) {
  const invoice = event.data.object as Stripe.Invoice;
  log.info({ invoiceId: invoice.id }, 'Invoice paid');

  try {
    const organization = await prisma.organization.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!organization) {
      log.warn({ customerId: invoice.customer }, 'Organization not found for invoice');
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });

    // Create or update invoice in database
    const dbInvoice = await prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        organizationId: organization.id,
        subscriptionId: subscription?.id,
        invoiceNumber: invoice.number || `INV-${Date.now()}`,
        stripeInvoiceId: invoice.id,
        subtotal: invoice.subtotal || 0,
        tax: invoice.tax || 0,
        total: invoice.total || 0,
        amountPaid: invoice.amount_paid || 0,
        amountDue: invoice.amount_due || 0,
        currency: invoice.currency.toUpperCase(),
        status: 'PAID',
        issuedAt: new Date(invoice.created * 1000),
        dueAt: invoice.due_date ? new Date(invoice.due_date * 1000) : new Date(),
        paidAt: new Date(),
        periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
        periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
        pdfUrl: invoice.invoice_pdf || null,
        lineItems: invoice.lines.data.map((line: any) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.price?.unit_amount || 0,
          amount: line.amount,
        })),
      },
      update: {
        status: 'PAID',
        amountPaid: invoice.amount_paid || 0,
        paidAt: new Date(),
        pdfUrl: invoice.invoice_pdf || null,
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        organizationId: organization.id,
        subscriptionId: subscription?.id,
        invoiceId: dbInvoice.id,
        amount: invoice.amount_paid || 0,
        currency: invoice.currency.toUpperCase(),
        paymentGateway: 'STRIPE',
        stripePaymentId: invoice.payment_intent as string,
        status: 'SUCCEEDED',
        metadata: {
          invoiceId: invoice.id,
          chargeId: invoice.charge,
        },
      },
    });

    log.info({ invoiceId: invoice.id, organizationId: organization.id }, 'Invoice paid recorded in database');
  } catch (error) {
    log.error({ error, invoiceId: invoice.id }, 'Failed to handle invoice paid');
    throw error;
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(event: Stripe.Event, log: any) {
  const invoice = event.data.object as Stripe.Invoice;
  log.warn({ invoiceId: invoice.id }, 'Invoice payment failed');

  try {
    const organization = await prisma.organization.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!organization) {
      log.warn({ customerId: invoice.customer }, 'Organization not found for invoice');
      return;
    }

    // Update invoice status
    await prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        organizationId: organization.id,
        invoiceNumber: invoice.number || `INV-${Date.now()}`,
        stripeInvoiceId: invoice.id,
        subtotal: invoice.subtotal || 0,
        tax: invoice.tax || 0,
        total: invoice.total || 0,
        amountPaid: invoice.amount_paid || 0,
        amountDue: invoice.amount_due || 0,
        currency: invoice.currency.toUpperCase(),
        status: 'OVERDUE',
        issuedAt: new Date(invoice.created * 1000),
        dueAt: invoice.due_date ? new Date(invoice.due_date * 1000) : new Date(),
      },
      update: {
        status: 'OVERDUE',
      },
    });

    // Update subscription to past_due if applicable
    if (invoice.subscription) {
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: invoice.subscription as string },
        data: { status: 'PAST_DUE' },
      });
    }

    log.info({ invoiceId: invoice.id, organizationId: organization.id }, 'Invoice payment failure recorded');
  } catch (error) {
    log.error({ error, invoiceId: invoice.id }, 'Failed to handle invoice payment failed');
    throw error;
  }
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event, log: any) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  log.info({ paymentIntentId: paymentIntent.id }, 'Payment intent succeeded');

  try {
    const organization = await prisma.organization.findUnique({
      where: { stripeCustomerId: paymentIntent.customer as string },
    });

    if (!organization) {
      log.warn({ customerId: paymentIntent.customer }, 'Organization not found for payment intent');
      return;
    }

    // Create payment record if not from invoice
    const existingPayment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (!existingPayment && !paymentIntent.invoice) {
      await prisma.payment.create({
        data: {
          organizationId: organization.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          paymentGateway: 'STRIPE',
          stripePaymentId: paymentIntent.id,
          paymentMethod: paymentIntent.payment_method_types[0] || 'card',
          status: 'SUCCEEDED',
          metadata: paymentIntent.metadata as any,
        },
      });

      log.info({ paymentIntentId: paymentIntent.id, organizationId: organization.id }, 'Payment intent recorded in database');
    }
  } catch (error) {
    log.error({ error, paymentIntentId: paymentIntent.id }, 'Failed to handle payment intent succeeded');
    throw error;
  }
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(event: Stripe.Event, log: any) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  log.warn({ paymentIntentId: paymentIntent.id }, 'Payment intent failed');

  try {
    const organization = await prisma.organization.findUnique({
      where: { stripeCustomerId: paymentIntent.customer as string },
    });

    if (!organization) {
      log.warn({ customerId: paymentIntent.customer }, 'Organization not found for payment intent');
      return;
    }

    // Create failed payment record
    await prisma.payment.create({
      data: {
        organizationId: organization.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        paymentGateway: 'STRIPE',
        stripePaymentId: paymentIntent.id,
        paymentMethod: paymentIntent.payment_method_types[0] || 'card',
        status: 'FAILED',
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message,
        metadata: paymentIntent.metadata as any,
      },
    });

    log.info({ paymentIntentId: paymentIntent.id, organizationId: organization.id }, 'Payment intent failure recorded');
  } catch (error) {
    log.error({ error, paymentIntentId: paymentIntent.id }, 'Failed to handle payment intent failed');
    throw error;
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event, log: any) {
  const session = event.data.object as Stripe.Checkout.Session;
  log.info({ sessionId: session.id }, 'Checkout session completed');

  try {
    // If it's a subscription checkout, the subscription webhook will handle it
    if (session.mode === 'subscription') {
      log.info({ sessionId: session.id }, 'Subscription checkout - will be handled by subscription webhook');
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { stripeCustomerId: session.customer as string },
    });

    if (!organization) {
      log.warn({ customerId: session.customer }, 'Organization not found for checkout session');
      return;
    }

    // Create payment record for one-time payment
    if (session.payment_intent) {
      await prisma.payment.create({
        data: {
          organizationId: organization.id,
          amount: session.amount_total || 0,
          currency: session.currency?.toUpperCase() || 'USD',
          paymentGateway: 'STRIPE',
          stripePaymentId: session.payment_intent as string,
          status: 'SUCCEEDED',
          metadata: {
            sessionId: session.id,
            ...session.metadata,
          } as any,
        },
      });

      log.info({ sessionId: session.id, organizationId: organization.id }, 'Checkout session payment recorded');
    }
  } catch (error) {
    log.error({ error, sessionId: session.id }, 'Failed to handle checkout session completed');
    throw error;
  }
}

/**
 * Main Stripe webhook handler
 */
export async function handleStripeWebhook(event: Stripe.Event, log: any) {
  log.info({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook event');

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event, log);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, log);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, log);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event, log);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event, log);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event, log);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event, log);
        break;
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event, log);
        break;
      default:
        log.info({ eventType: event.type }, 'Unhandled Stripe event type');
    }
  } catch (error) {
    log.error({ error, eventType: event.type, eventId: event.id }, 'Error processing Stripe webhook');
    throw error;
  }
}
