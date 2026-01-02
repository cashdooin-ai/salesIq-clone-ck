import crypto from 'crypto';
import { prisma } from '@nexvo/database';

/**
 * Verify Razorpay webhook signature
 */
export function verifyRazorpaySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return expectedSignature === signature;
  } catch (err) {
    return false;
  }
}

/**
 * Handle payment.authorized event
 */
async function handlePaymentAuthorized(payload: any, log: any) {
  const payment = payload.payment.entity;
  log.info({ paymentId: payment.id }, 'Payment authorized');

  try {
    const organization = await prisma.organization.findUnique({
      where: { razorpayCustomerId: payment.notes?.customerId },
    });

    if (!organization) {
      log.warn({ customerId: payment.notes?.customerId }, 'Organization not found for payment');
      return;
    }

    // Create payment record with PROCESSING status
    await prisma.payment.upsert({
      where: { razorpayPaymentId: payment.id },
      create: {
        organizationId: organization.id,
        amount: payment.amount,
        currency: payment.currency?.toUpperCase() || 'INR',
        paymentGateway: 'RAZORPAY',
        razorpayPaymentId: payment.id,
        paymentMethod: payment.method,
        status: 'PROCESSING',
        cardLast4: payment.card?.last4,
        cardBrand: payment.card?.network,
        metadata: {
          orderId: payment.order_id,
          ...payment.notes,
        } as any,
      },
      update: {
        status: 'PROCESSING',
      },
    });

    log.info({ paymentId: payment.id, organizationId: organization.id }, 'Payment authorized recorded');
  } catch (error) {
    log.error({ error, paymentId: payment.id }, 'Failed to handle payment authorized');
    throw error;
  }
}

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(payload: any, log: any) {
  const payment = payload.payment.entity;
  log.info({ paymentId: payment.id }, 'Payment captured');

  try {
    const organization = await prisma.organization.findUnique({
      where: { razorpayCustomerId: payment.notes?.customerId },
    });

    if (!organization) {
      log.warn({ customerId: payment.notes?.customerId }, 'Organization not found for payment');
      return;
    }

    // Update or create payment record
    await prisma.payment.upsert({
      where: { razorpayPaymentId: payment.id },
      create: {
        organizationId: organization.id,
        amount: payment.amount,
        currency: payment.currency?.toUpperCase() || 'INR',
        paymentGateway: 'RAZORPAY',
        razorpayPaymentId: payment.id,
        paymentMethod: payment.method,
        status: 'SUCCEEDED',
        cardLast4: payment.card?.last4,
        cardBrand: payment.card?.network,
        upiId: payment.vpa,
        metadata: {
          orderId: payment.order_id,
          ...payment.notes,
        } as any,
      },
      update: {
        status: 'SUCCEEDED',
        amount: payment.amount,
      },
    });

    log.info({ paymentId: payment.id, organizationId: organization.id }, 'Payment captured recorded');
  } catch (error) {
    log.error({ error, paymentId: payment.id }, 'Failed to handle payment captured');
    throw error;
  }
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payload: any, log: any) {
  const payment = payload.payment.entity;
  log.warn({ paymentId: payment.id }, 'Payment failed');

  try {
    const organization = await prisma.organization.findUnique({
      where: { razorpayCustomerId: payment.notes?.customerId },
    });

    if (!organization) {
      log.warn({ customerId: payment.notes?.customerId }, 'Organization not found for payment');
      return;
    }

    // Create or update failed payment record
    await prisma.payment.upsert({
      where: { razorpayPaymentId: payment.id },
      create: {
        organizationId: organization.id,
        amount: payment.amount,
        currency: payment.currency?.toUpperCase() || 'INR',
        paymentGateway: 'RAZORPAY',
        razorpayPaymentId: payment.id,
        paymentMethod: payment.method,
        status: 'FAILED',
        failureCode: payment.error_code,
        failureMessage: payment.error_description,
        metadata: {
          orderId: payment.order_id,
          ...payment.notes,
        } as any,
      },
      update: {
        status: 'FAILED',
        failureCode: payment.error_code,
        failureMessage: payment.error_description,
      },
    });

    log.info({ paymentId: payment.id, organizationId: organization.id }, 'Payment failure recorded');
  } catch (error) {
    log.error({ error, paymentId: payment.id }, 'Failed to handle payment failed');
    throw error;
  }
}

/**
 * Handle subscription.activated event
 */
async function handleSubscriptionActivated(payload: any, log: any) {
  const subscription = payload.subscription.entity;
  log.info({ subscriptionId: subscription.id }, 'Subscription activated');

  try {
    const organization = await prisma.organization.findUnique({
      where: { razorpayCustomerId: subscription.customer_id },
    });

    if (!organization) {
      log.warn({ customerId: subscription.customer_id }, 'Organization not found for subscription');
      return;
    }

    // Get plan details from notes or metadata
    const planName = subscription.notes?.planName || 'STARTER';
    const plan = await prisma.pricingPlan.findUnique({
      where: { name: planName.toLowerCase() },
    });

    if (!plan) {
      log.warn({ planName }, 'Pricing plan not found');
      return;
    }

    // Create subscription in database
    await prisma.subscription.upsert({
      where: { razorpaySubscriptionId: subscription.id },
      create: {
        organizationId: organization.id,
        planId: plan.id,
        razorpaySubscriptionId: subscription.id,
        status: 'ACTIVE',
        billingCycle: subscription.plan?.period === 'yearly' ? 'YEARLY' : 'MONTHLY',
        currency: subscription.plan?.currency?.toUpperCase() || 'INR',
        pricePerPeriod: subscription.plan?.item?.amount || 0,
        currentPeriodStart: new Date(subscription.start_at * 1000),
        currentPeriodEnd: new Date(subscription.end_at * 1000),
        paymentGateway: 'RAZORPAY',
      },
      update: {
        status: 'ACTIVE',
        currentPeriodStart: new Date(subscription.start_at * 1000),
        currentPeriodEnd: new Date(subscription.end_at * 1000),
      },
    });

    // Update organization plan
    await prisma.organization.update({
      where: { id: organization.id },
      data: { plan: planName.toUpperCase() as any },
    });

    log.info({ subscriptionId: subscription.id, organizationId: organization.id }, 'Subscription activated in database');
  } catch (error) {
    log.error({ error, subscriptionId: subscription.id }, 'Failed to handle subscription activated');
    throw error;
  }
}

/**
 * Handle subscription.charged event
 */
async function handleSubscriptionCharged(payload: any, log: any) {
  const payment = payload.payment.entity;
  log.info({ paymentId: payment.id }, 'Subscription charged');

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: payment.subscription_id },
      include: { organization: true },
    });

    if (!subscription) {
      log.warn({ subscriptionId: payment.subscription_id }, 'Subscription not found');
      return;
    }

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: subscription.organizationId,
        subscriptionId: subscription.id,
        invoiceNumber: `INV-RZP-${Date.now()}`,
        razorpayInvoiceId: payment.invoice_id,
        subtotal: payment.amount,
        tax: payment.tax || 0,
        total: payment.amount,
        amountPaid: payment.amount,
        amountDue: 0,
        currency: payment.currency?.toUpperCase() || 'INR',
        status: 'PAID',
        issuedAt: new Date(payment.created_at * 1000),
        dueAt: new Date(payment.created_at * 1000),
        paidAt: new Date(),
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        organizationId: subscription.organizationId,
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        amount: payment.amount,
        currency: payment.currency?.toUpperCase() || 'INR',
        paymentGateway: 'RAZORPAY',
        razorpayPaymentId: payment.id,
        paymentMethod: payment.method,
        status: 'SUCCEEDED',
        metadata: {
          subscriptionId: payment.subscription_id,
          invoiceId: payment.invoice_id,
        } as any,
      },
    });

    log.info({ paymentId: payment.id, organizationId: subscription.organizationId }, 'Subscription charge recorded');
  } catch (error) {
    log.error({ error, paymentId: payment.id }, 'Failed to handle subscription charged');
    throw error;
  }
}

/**
 * Handle subscription.cancelled event
 */
async function handleSubscriptionCancelled(payload: any, log: any) {
  const subscription = payload.subscription.entity;
  log.info({ subscriptionId: subscription.id }, 'Subscription cancelled');

  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscription.id },
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

    log.info({ subscriptionId: subscription.id, organizationId: dbSubscription.organizationId }, 'Subscription cancelled in database');
  } catch (error) {
    log.error({ error, subscriptionId: subscription.id }, 'Failed to handle subscription cancelled');
    throw error;
  }
}

/**
 * Handle subscription.halted event
 */
async function handleSubscriptionHalted(payload: any, log: any) {
  const subscription = payload.subscription.entity;
  log.warn({ subscriptionId: subscription.id }, 'Subscription halted');

  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (!dbSubscription) {
      log.warn({ subscriptionId: subscription.id }, 'Subscription not found in database');
      return;
    }

    // Update subscription status to paused
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'PAUSED',
      },
    });

    log.info({ subscriptionId: subscription.id, organizationId: dbSubscription.organizationId }, 'Subscription halted in database');
  } catch (error) {
    log.error({ error, subscriptionId: subscription.id }, 'Failed to handle subscription halted');
    throw error;
  }
}

/**
 * Handle refund.processed event
 */
async function handleRefundProcessed(payload: any, log: any) {
  const refund = payload.refund.entity;
  log.info({ refundId: refund.id }, 'Refund processed');

  try {
    // Find the original payment
    const payment = await prisma.payment.findUnique({
      where: { razorpayPaymentId: refund.payment_id },
    });

    if (!payment) {
      log.warn({ paymentId: refund.payment_id }, 'Payment not found for refund');
      return;
    }

    // Update payment with refund information
    const refundedAmount = payment.refundedAmount + refund.amount;
    const status = refundedAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount,
        refundedAt: new Date(),
        refundReason: refund.notes?.reason,
        status,
      },
    });

    // Update invoice if associated
    if (payment.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: payment.invoiceId },
      });

      if (invoice) {
        const invoiceStatus = refundedAmount >= invoice.total ? 'REFUNDED' : 'PARTIALLY_PAID';
        await prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: invoiceStatus },
        });
      }
    }

    log.info({ refundId: refund.id, paymentId: payment.id }, 'Refund processed in database');
  } catch (error) {
    log.error({ error, refundId: refund.id }, 'Failed to handle refund processed');
    throw error;
  }
}

/**
 * Main Razorpay webhook handler
 */
export async function handleRazorpayWebhook(payload: any, log: any) {
  const eventType = payload.event;
  log.info({ eventType, eventId: payload.payload?.payment?.entity?.id || payload.payload?.subscription?.entity?.id }, 'Processing Razorpay webhook event');

  try {
    switch (eventType) {
      case 'payment.authorized':
        await handlePaymentAuthorized(payload.payload, log);
        break;
      case 'payment.captured':
        await handlePaymentCaptured(payload.payload, log);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload.payload, log);
        break;
      case 'subscription.activated':
        await handleSubscriptionActivated(payload.payload, log);
        break;
      case 'subscription.charged':
        await handleSubscriptionCharged(payload.payload, log);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload.payload, log);
        break;
      case 'subscription.halted':
        await handleSubscriptionHalted(payload.payload, log);
        break;
      case 'refund.processed':
        await handleRefundProcessed(payload.payload, log);
        break;
      default:
        log.info({ eventType }, 'Unhandled Razorpay event type');
    }
  } catch (error) {
    log.error({ error, eventType }, 'Error processing Razorpay webhook');
    throw error;
  }
}
