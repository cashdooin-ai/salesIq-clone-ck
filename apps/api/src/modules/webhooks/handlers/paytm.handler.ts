import crypto from 'crypto';
import { prisma } from '@nexvo/database';

/**
 * Verify Paytm checksum
 */
export function verifyPaytmChecksum(
  params: any,
  checksumHash: string,
  merchantKey: string
): boolean {
  try {
    // Paytm uses custom checksum verification
    // This is a simplified version - in production, use Paytm's official SDK
    const paramsArray: string[] = [];

    for (const key in params) {
      if (key !== 'CHECKSUMHASH') {
        paramsArray.push(params[key]);
      }
    }

    const paramStr = paramsArray.join('|');
    const salt = crypto.randomBytes(4).toString('hex');
    const checksum = crypto
      .createHash('sha256')
      .update(paramStr + '|' + salt)
      .digest('hex');

    const finalChecksum = checksum + salt;

    // Decrypt and verify
    const decipher = crypto.createDecipheriv(
      'aes-128-cbc',
      merchantKey.substring(0, 16),
      Buffer.alloc(16, 0)
    );

    let decrypted = decipher.update(checksumHash, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted === finalChecksum;
  } catch (err) {
    return false;
  }
}

/**
 * Simple checksum validation (alternative approach)
 */
export function validatePaytmChecksum(payload: any, merchantKey: string): boolean {
  try {
    // For webhook validation, we can use a simpler approach
    // In production, use Paytm's official checksum library
    const checksum = payload.CHECKSUMHASH;
    if (!checksum) return false;

    // Create parameter string
    const params: any = { ...payload };
    delete params.CHECKSUMHASH;

    const keys = Object.keys(params).sort();
    const paramStr = keys.map(key => `${key}=${params[key]}`).join('&');

    // Verify signature
    const expectedChecksum = crypto
      .createHmac('sha256', merchantKey)
      .update(paramStr)
      .digest('hex');

    return checksum === expectedChecksum;
  } catch (err) {
    return false;
  }
}

/**
 * Handle successful transaction
 */
async function handleTransactionSuccess(payload: any, log: any) {
  const orderId = payload.ORDERID;
  const txnId = payload.TXNID;
  const txnAmount = payload.TXNAMOUNT;

  log.info({ orderId, txnId }, 'Paytm transaction successful');

  try {
    // Extract organization ID from order ID or metadata
    const organizationId = payload.MERC_UNQ_REF;

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId },
    });

    if (!organization) {
      log.warn({ organizationId }, 'Organization not found for Paytm transaction');
      return;
    }

    // Check if payment already exists (idempotency)
    const existingPayment = await prisma.payment.findUnique({
      where: { paytmPaymentId: txnId },
    });

    if (existingPayment) {
      log.info({ txnId }, 'Payment already processed');
      return;
    }

    // Create payment record
    await prisma.payment.create({
      data: {
        organizationId: organization.id,
        amount: Math.round(parseFloat(txnAmount) * 100), // Convert to paise
        currency: payload.CURRENCY || 'INR',
        paymentGateway: 'PAYTM',
        paytmPaymentId: txnId,
        paymentMethod: payload.PAYMENTMODE || 'paytm',
        status: 'SUCCEEDED',
        metadata: {
          orderId,
          bankTxnId: payload.BANKTXNID,
          bankName: payload.BANKNAME,
          gatewayName: payload.GATEWAYNAME,
          respCode: payload.RESPCODE,
          respMsg: payload.RESPMSG,
          txnDate: payload.TXNDATE,
        } as any,
      },
    });

    // If metadata contains subscription info, handle subscription
    if (payload.SUBSCRIPTION_ID) {
      const planName = payload.PLAN_NAME || 'STARTER';
      const plan = await prisma.pricingPlan.findUnique({
        where: { name: planName.toLowerCase() },
      });

      if (plan) {
        const now = new Date();
        const periodEnd = new Date(now);

        if (payload.BILLING_CYCLE === 'yearly') {
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
            status: 'ACTIVE',
            billingCycle: payload.BILLING_CYCLE === 'yearly' ? 'YEARLY' : 'MONTHLY',
            currency: payload.CURRENCY || 'INR',
            pricePerPeriod: Math.round(parseFloat(txnAmount) * 100),
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            paymentGateway: 'PAYTM',
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
            invoiceNumber: `INV-PAYTM-${Date.now()}`,
            subtotal: Math.round(parseFloat(txnAmount) * 100),
            tax: 0,
            total: Math.round(parseFloat(txnAmount) * 100),
            amountPaid: Math.round(parseFloat(txnAmount) * 100),
            amountDue: 0,
            currency: payload.CURRENCY || 'INR',
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

    log.info({ txnId, organizationId: organization.id }, 'Paytm transaction recorded successfully');
  } catch (error) {
    log.error({ error, txnId }, 'Failed to handle Paytm transaction success');
    throw error;
  }
}

/**
 * Handle failed transaction
 */
async function handleTransactionFailed(payload: any, log: any) {
  const orderId = payload.ORDERID;
  const txnId = payload.TXNID;
  const txnAmount = payload.TXNAMOUNT;

  log.warn({ orderId, txnId }, 'Paytm transaction failed');

  try {
    const organizationId = payload.MERC_UNQ_REF;

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId },
    });

    if (!organization) {
      log.warn({ organizationId }, 'Organization not found for failed transaction');
      return;
    }

    // Check if payment record already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { paytmPaymentId: txnId },
    });

    if (existingPayment) {
      log.info({ txnId }, 'Failed payment already processed');
      return;
    }

    // Create failed payment record
    await prisma.payment.create({
      data: {
        organizationId: organization.id,
        amount: Math.round(parseFloat(txnAmount) * 100),
        currency: payload.CURRENCY || 'INR',
        paymentGateway: 'PAYTM',
        paytmPaymentId: txnId,
        paymentMethod: payload.PAYMENTMODE || 'paytm',
        status: 'FAILED',
        failureCode: payload.RESPCODE,
        failureMessage: payload.RESPMSG,
        metadata: {
          orderId,
          bankTxnId: payload.BANKTXNID,
          gatewayName: payload.GATEWAYNAME,
          txnDate: payload.TXNDATE,
        } as any,
      },
    });

    log.info({ txnId, organizationId: organization.id }, 'Paytm transaction failure recorded');
  } catch (error) {
    log.error({ error, txnId }, 'Failed to handle Paytm transaction failure');
    throw error;
  }
}

/**
 * Handle pending transaction
 */
async function handleTransactionPending(payload: any, log: any) {
  const orderId = payload.ORDERID;
  const txnId = payload.TXNID;

  log.info({ orderId, txnId }, 'Paytm transaction pending');

  try {
    const organizationId = payload.MERC_UNQ_REF;

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId },
    });

    if (!organization) {
      log.warn({ organizationId }, 'Organization not found for pending transaction');
      return;
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { paytmPaymentId: txnId },
    });

    if (!existingPayment) {
      // Create pending payment record
      await prisma.payment.create({
        data: {
          organizationId: organization.id,
          amount: Math.round(parseFloat(payload.TXNAMOUNT) * 100),
          currency: payload.CURRENCY || 'INR',
          paymentGateway: 'PAYTM',
          paytmPaymentId: txnId,
          paymentMethod: payload.PAYMENTMODE || 'paytm',
          status: 'PENDING',
          metadata: {
            orderId,
            respCode: payload.RESPCODE,
            respMsg: payload.RESPMSG,
          } as any,
        },
      });
    } else {
      // Update existing payment to pending if not already succeeded
      if (existingPayment.status !== 'SUCCEEDED') {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: { status: 'PENDING' },
        });
      }
    }

    log.info({ txnId, organizationId: organization.id }, 'Paytm pending transaction recorded');
  } catch (error) {
    log.error({ error, txnId }, 'Failed to handle Paytm pending transaction');
    throw error;
  }
}

/**
 * Main Paytm webhook handler
 */
export async function handlePaytmWebhook(payload: any, log: any) {
  const status = payload.STATUS;
  const orderId = payload.ORDERID;
  const txnId = payload.TXNID;

  log.info({ status, orderId, txnId }, 'Processing Paytm webhook');

  try {
    switch (status) {
      case 'TXN_SUCCESS':
        await handleTransactionSuccess(payload, log);
        break;
      case 'TXN_FAILURE':
        await handleTransactionFailed(payload, log);
        break;
      case 'PENDING':
        await handleTransactionPending(payload, log);
        break;
      default:
        log.info({ status }, 'Unhandled Paytm transaction status');
    }
  } catch (error) {
    log.error({ error, status, txnId }, 'Error processing Paytm webhook');
    throw error;
  }
}
