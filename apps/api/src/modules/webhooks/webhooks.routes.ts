import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@nexvo/database';
import {
  handleStripeWebhook,
  verifyStripeSignature,
  handleRazorpayWebhook,
  verifyRazorpaySignature,
  handleInstamojoWebhook,
  verifyInstamojoSignature,
  handlePaytmWebhook,
  validatePaytmChecksum,
} from './handlers/index.js';

/**
 * Log webhook event to database for audit trail
 */
async function logWebhookEvent(
  gateway: 'STRIPE' | 'RAZORPAY' | 'INSTAMOJO' | 'PAYTM',
  eventType: string,
  eventId: string,
  payload: any,
  log: any
) {
  try {
    await prisma.webhookEvent.create({
      data: {
        gateway,
        eventType,
        eventId,
        payload: payload as any,
        processed: false,
      },
    });
    log.info({ gateway, eventType, eventId }, 'Webhook event logged');
  } catch (error) {
    // If duplicate key error (eventId already exists), it's okay - idempotency
    if ((error as any).code === 'P2002') {
      log.info({ gateway, eventId }, 'Webhook event already logged (duplicate)');
    } else {
      log.error({ error, gateway, eventId }, 'Failed to log webhook event');
    }
  }
}

/**
 * Mark webhook event as processed
 */
async function markWebhookProcessed(eventId: string, error?: string) {
  try {
    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        processed: true,
        processedAt: new Date(),
        error: error || null,
      },
    });
  } catch (err) {
    // Ignore errors in marking processed
  }
}

/**
 * Check if webhook event has already been processed (idempotency)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const event = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });
    return event?.processed || false;
  } catch (error) {
    return false;
  }
}

export async function webhookRoutes(fastify: FastifyInstance) {
  /**
   * Stripe Webhook Handler
   * POST /webhooks/stripe
   */
  fastify.post('/stripe', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!signature) {
      return reply.status(400).send({ error: 'Missing stripe-signature header' });
    }

    try {
      // Get raw body for signature verification
      const rawBody = JSON.stringify(request.body);

      // Verify signature
      const event = verifyStripeSignature(rawBody, signature, webhookSecret);

      if (!event) {
        request.log.warn('Invalid Stripe webhook signature');
        return reply.status(400).send({ error: 'Invalid signature' });
      }

      // Check if already processed (idempotency)
      const alreadyProcessed = await isEventProcessed(event.id);
      if (alreadyProcessed) {
        request.log.info({ eventId: event.id }, 'Stripe webhook already processed');
        return reply.status(200).send({ received: true, message: 'Already processed' });
      }

      // Log webhook event
      await logWebhookEvent('STRIPE', event.type, event.id, event, request.log);

      // Process webhook (async - fire and forget for quick response)
      handleStripeWebhook(event, request.log)
        .then(async () => {
          await markWebhookProcessed(event.id);
          request.log.info({ eventId: event.id, eventType: event.type }, 'Stripe webhook processed successfully');
        })
        .catch(async (error) => {
          await markWebhookProcessed(event.id, error.message);
          request.log.error({ error, eventId: event.id }, 'Failed to process Stripe webhook');
        });

      // Return 200 quickly to acknowledge receipt
      return reply.status(200).send({ received: true });
    } catch (error) {
      request.log.error({ error }, 'Error handling Stripe webhook');
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  /**
   * Razorpay Webhook Handler
   * POST /webhooks/razorpay
   */
  fastify.post('/razorpay', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!signature) {
      return reply.status(400).send({ error: 'Missing x-razorpay-signature header' });
    }

    try {
      // Get raw body for signature verification
      const rawBody = JSON.stringify(request.body);

      // Verify signature
      const isValid = verifyRazorpaySignature(rawBody, signature, webhookSecret);

      if (!isValid) {
        request.log.warn('Invalid Razorpay webhook signature');
        return reply.status(400).send({ error: 'Invalid signature' });
      }

      const payload = request.body as any;
      const eventId = payload.payload?.payment?.entity?.id ||
                     payload.payload?.subscription?.entity?.id ||
                     `razorpay-${Date.now()}`;
      const eventType = payload.event;

      // Check if already processed (idempotency)
      const alreadyProcessed = await isEventProcessed(eventId);
      if (alreadyProcessed) {
        request.log.info({ eventId }, 'Razorpay webhook already processed');
        return reply.status(200).send({ received: true, message: 'Already processed' });
      }

      // Log webhook event
      await logWebhookEvent('RAZORPAY', eventType, eventId, payload, request.log);

      // Process webhook (async)
      handleRazorpayWebhook(payload, request.log)
        .then(async () => {
          await markWebhookProcessed(eventId);
          request.log.info({ eventId, eventType }, 'Razorpay webhook processed successfully');
        })
        .catch(async (error) => {
          await markWebhookProcessed(eventId, error.message);
          request.log.error({ error, eventId }, 'Failed to process Razorpay webhook');
        });

      // Return 200 quickly
      return reply.status(200).send({ received: true });
    } catch (error) {
      request.log.error({ error }, 'Error handling Razorpay webhook');
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  /**
   * Instamojo Webhook Handler
   * POST /webhooks/instamojo
   */
  fastify.post('/instamojo', async (request: FastifyRequest, reply: FastifyReply) => {
    const mac = request.headers['x-instamojo-mac'] as string;
    const instamojoSalt = process.env.INSTAMOJO_SALT || '';

    try {
      const payload = request.body as any;

      // Verify MAC signature if provided
      if (mac && instamojoSalt) {
        const isValid = verifyInstamojoSignature(payload, mac, instamojoSalt);
        if (!isValid) {
          request.log.warn('Invalid Instamojo webhook signature');
          return reply.status(400).send({ error: 'Invalid signature' });
        }
      }

      const paymentId = payload.payment_id || `instamojo-${Date.now()}`;
      const eventType = `payment.${payload.status?.toLowerCase()}`;

      // Check if already processed (idempotency)
      const alreadyProcessed = await isEventProcessed(paymentId);
      if (alreadyProcessed) {
        request.log.info({ paymentId }, 'Instamojo webhook already processed');
        return reply.status(200).send({ received: true, message: 'Already processed' });
      }

      // Log webhook event
      await logWebhookEvent('INSTAMOJO', eventType, paymentId, payload, request.log);

      // Process webhook (async)
      handleInstamojoWebhook(payload, request.log)
        .then(async () => {
          await markWebhookProcessed(paymentId);
          request.log.info({ paymentId, eventType }, 'Instamojo webhook processed successfully');
        })
        .catch(async (error) => {
          await markWebhookProcessed(paymentId, error.message);
          request.log.error({ error, paymentId }, 'Failed to process Instamojo webhook');
        });

      // Return 200 quickly
      return reply.status(200).send({ received: true });
    } catch (error) {
      request.log.error({ error }, 'Error handling Instamojo webhook');
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  /**
   * Paytm Webhook Handler
   * POST /webhooks/paytm
   */
  fastify.post('/paytm', async (request: FastifyRequest, reply: FastifyReply) => {
    const paytmMerchantKey = process.env.PAYTM_MERCHANT_KEY || '';

    try {
      const payload = request.body as any;

      // Verify checksum
      if (paytmMerchantKey && payload.CHECKSUMHASH) {
        const isValid = validatePaytmChecksum(payload, paytmMerchantKey);
        if (!isValid) {
          request.log.warn('Invalid Paytm webhook checksum');
          return reply.status(400).send({ error: 'Invalid checksum' });
        }
      }

      const txnId = payload.TXNID || `paytm-${Date.now()}`;
      const eventType = `transaction.${payload.STATUS?.toLowerCase()}`;

      // Check if already processed (idempotency)
      const alreadyProcessed = await isEventProcessed(txnId);
      if (alreadyProcessed) {
        request.log.info({ txnId }, 'Paytm webhook already processed');
        return reply.status(200).send({ received: true, message: 'Already processed' });
      }

      // Log webhook event
      await logWebhookEvent('PAYTM', eventType, txnId, payload, request.log);

      // Process webhook (async)
      handlePaytmWebhook(payload, request.log)
        .then(async () => {
          await markWebhookProcessed(txnId);
          request.log.info({ txnId, eventType }, 'Paytm webhook processed successfully');
        })
        .catch(async (error) => {
          await markWebhookProcessed(txnId, error.message);
          request.log.error({ error, txnId }, 'Failed to process Paytm webhook');
        });

      // Return 200 quickly
      return reply.status(200).send({ received: true });
    } catch (error) {
      request.log.error({ error }, 'Error handling Paytm webhook');
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  /**
   * Get webhook events (for debugging/monitoring)
   * GET /webhooks/events
   */
  fastify.get('/events', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { gateway, processed, limit = 50 } = request.query as any;

      const events = await prisma.webhookEvent.findMany({
        where: {
          ...(gateway && { gateway }),
          ...(processed !== undefined && { processed: processed === 'true' }),
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit, 10),
      });

      return reply.status(200).send({
        success: true,
        data: events,
      });
    } catch (error) {
      request.log.error({ error }, 'Error fetching webhook events');
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch webhook events',
      });
    }
  });

  /**
   * Retry failed webhook event
   * POST /webhooks/events/:eventId/retry
   */
  fastify.post('/events/:eventId/retry', async (request: FastifyRequest, reply: FastifyReply) => {
    const { eventId } = request.params as { eventId: string };

    try {
      const event = await prisma.webhookEvent.findUnique({
        where: { eventId },
      });

      if (!event) {
        return reply.status(404).send({
          success: false,
          error: 'Webhook event not found',
        });
      }

      // Reset processed status
      await prisma.webhookEvent.update({
        where: { eventId },
        data: {
          processed: false,
          processedAt: null,
          error: null,
        },
      });

      // Retry processing based on gateway
      switch (event.gateway) {
        case 'STRIPE':
          await handleStripeWebhook(event.payload as any, request.log);
          break;
        case 'RAZORPAY':
          await handleRazorpayWebhook(event.payload as any, request.log);
          break;
        case 'INSTAMOJO':
          await handleInstamojoWebhook(event.payload as any, request.log);
          break;
        case 'PAYTM':
          await handlePaytmWebhook(event.payload as any, request.log);
          break;
      }

      await markWebhookProcessed(eventId);

      return reply.status(200).send({
        success: true,
        message: 'Webhook event retried successfully',
      });
    } catch (error) {
      request.log.error({ error, eventId }, 'Error retrying webhook event');
      await markWebhookProcessed(eventId, (error as Error).message);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retry webhook event',
      });
    }
  });
}
