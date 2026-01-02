import crypto from 'crypto';
import { prisma } from '@nexvo/database';

/**
 * Verify Instamojo webhook signature (MAC)
 */
export function verifyInstamojoSignature(
  payload: any,
  mac: string,
  salt: string
): boolean {
  try {
    // Instamojo uses MAC verification
    // MAC is generated using: HMAC-SHA1(payment_id|payment_status|salt)
    const dataString = `${payload.payment_id}|${payload.status}`;
    const expectedMac = crypto
      .createHmac('sha1', salt)
      .update(dataString)
      .digest('hex');

    return expectedMac === mac;
  } catch (err) {
    return false;
  }
}

/**
 * Handle successful payment callback
 */
async function handlePaymentSuccess(payload: any, log: any) {
  log.info({ paymentId: payload.payment_id }, 'Instamojo payment successful');

  try {
    // Extract organization info from custom fields or buyer email
    const customFields = payload.custom_fields ? JSON.parse(payload.custom_fields) : {};
    const organizationId = customFields.organizationId || payload.buyer_email;

    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { id: organizationId },
          { billingEmail: payload.buyer_email },
        ],
      },
    });

    if (!organization) {
      log.warn({ buyerEmail: payload.buyer_email }, 'Organization not found for Instamojo payment');
      return;
    }

    // Check if payment already exists (idempotency)
    const existingPayment = await prisma.payment.findUnique({
      where: { instamojoPaymentId: payload.payment_id },
    });

    if (existingPayment) {
      log.info({ paymentId: payload.payment_id }, 'Payment already processed');
      return;
    }

    // Create payment record
    await prisma.payment.create({
      data: {
        organizationId: organization.id,
        amount: Math.round(parseFloat(payload.amount) * 100), // Convert to paise
        currency: payload.currency || 'INR',
        paymentGateway: 'INSTAMOJO',
        instamojoPaymentId: payload.payment_id,
        paymentMethod: payload.payment_request_type || 'online',
        status: 'SUCCEEDED',
        metadata: {
          buyerName: payload.buyer_name,
          buyerEmail: payload.buyer_email,
          buyerPhone: payload.buyer_phone,
          paymentRequestId: payload.payment_request_id,
          purpose: payload.purpose,
          customFields,
        } as any,
      },
    });

    // If this is for a subscription, create/update subscription
    if (customFields.subscriptionType) {
      const planName = customFields.planName || 'STARTER';
      const plan = await prisma.pricingPlan.findUnique({
        where: { name: planName.toLowerCase() },
      });

      if (plan) {
        // Calculate period dates
        const now = new Date();
        const periodEnd = new Date(now);

        if (customFields.billingCycle === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Create or update subscription
        await prisma.subscription.upsert({
          where: {
            organizationId_planId: {
              organizationId: organization.id,
              planId: plan.id,
            },
          },
          create: {
            organizationId: organization.id,
            planId: plan.id,
            instamojoSubscriptionId: payload.payment_id,
            status: 'ACTIVE',
            billingCycle: customFields.billingCycle === 'yearly' ? 'YEARLY' : 'MONTHLY',
            currency: payload.currency || 'INR',
            pricePerPeriod: Math.round(parseFloat(payload.amount) * 100),
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            paymentGateway: 'INSTAMOJO',
          },
          update: {
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });

        // Update organization plan
        await prisma.organization.update({
          where: { id: organization.id },
          data: { plan: planName.toUpperCase() as any },
        });

        // Create invoice
        await prisma.invoice.create({
          data: {
            organizationId: organization.id,
            invoiceNumber: `INV-IM-${Date.now()}`,
            subtotal: Math.round(parseFloat(payload.amount) * 100),
            tax: 0,
            total: Math.round(parseFloat(payload.amount) * 100),
            amountPaid: Math.round(parseFloat(payload.amount) * 100),
            amountDue: 0,
            currency: payload.currency || 'INR',
            status: 'PAID',
            issuedAt: new Date(),
            dueAt: new Date(),
            paidAt: new Date(),
            periodStart: now,
            periodEnd: periodEnd,
          },
        });
      }
    }

    log.info({ paymentId: payload.payment_id, organizationId: organization.id }, 'Instamojo payment recorded successfully');
  } catch (error) {
    log.error({ error, paymentId: payload.payment_id }, 'Failed to handle Instamojo payment success');
    throw error;
  }
}

/**
 * Handle failed payment callback
 */
async function handlePaymentFailed(payload: any, log: any) {
  log.warn({ paymentId: payload.payment_id }, 'Instamojo payment failed');

  try {
    const customFields = payload.custom_fields ? JSON.parse(payload.custom_fields) : {};
    const organizationId = customFields.organizationId || payload.buyer_email;

    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { id: organizationId },
          { billingEmail: payload.buyer_email },
        ],
      },
    });

    if (!organization) {
      log.warn({ buyerEmail: payload.buyer_email }, 'Organization not found for failed payment');
      return;
    }

    // Check if payment record already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { instamojoPaymentId: payload.payment_id },
    });

    if (existingPayment) {
      log.info({ paymentId: payload.payment_id }, 'Failed payment already processed');
      return;
    }

    // Create failed payment record
    await prisma.payment.create({
      data: {
        organizationId: organization.id,
        amount: Math.round(parseFloat(payload.amount) * 100),
        currency: payload.currency || 'INR',
        paymentGateway: 'INSTAMOJO',
        instamojoPaymentId: payload.payment_id,
        paymentMethod: payload.payment_request_type || 'online',
        status: 'FAILED',
        failureCode: payload.failure?.code || 'UNKNOWN',
        failureMessage: payload.failure?.message || 'Payment failed',
        metadata: {
          buyerName: payload.buyer_name,
          buyerEmail: payload.buyer_email,
          buyerPhone: payload.buyer_phone,
          paymentRequestId: payload.payment_request_id,
          purpose: payload.purpose,
          customFields,
        } as any,
      },
    });

    log.info({ paymentId: payload.payment_id, organizationId: organization.id }, 'Instamojo payment failure recorded');
  } catch (error) {
    log.error({ error, paymentId: payload.payment_id }, 'Failed to handle Instamojo payment failure');
    throw error;
  }
}

/**
 * Main Instamojo webhook handler
 */
export async function handleInstamojoWebhook(payload: any, log: any) {
  const status = payload.status?.toLowerCase();
  log.info({ status, paymentId: payload.payment_id }, 'Processing Instamojo webhook');

  try {
    switch (status) {
      case 'credit':
      case 'completed':
      case 'successful':
        await handlePaymentSuccess(payload, log);
        break;
      case 'failed':
      case 'failure':
        await handlePaymentFailed(payload, log);
        break;
      case 'pending':
        log.info({ paymentId: payload.payment_id }, 'Payment is pending, no action taken');
        break;
      default:
        log.info({ status }, 'Unhandled Instamojo payment status');
    }
  } catch (error) {
    log.error({ error, status, paymentId: payload.payment_id }, 'Error processing Instamojo webhook');
    throw error;
  }
}
