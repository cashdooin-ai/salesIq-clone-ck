/**
 * Example Razorpay API Routes for Nexvo SalesIQ
 *
 * This file demonstrates how to integrate Razorpay payment gateway
 * into your Fastify application.
 *
 * Copy these routes to your main routes file or use as reference.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { razorpayService } from './razorpay.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface CreateOrderBody {
  amount: number;
  productId?: string;
  customerId?: string;
  notes?: Record<string, string>;
}

interface VerifyPaymentBody {
  orderId: string;
  paymentId: string;
  signature: string;
}

interface CreateSubscriptionBody {
  planId: string;
  customerId: string;
  quantity?: number;
  trialDays?: number;
}

interface CreateGSTInvoiceBody {
  customerId: string;
  items: Array<{
    name: string;
    amount: number;
    quantity: number;
    hsn_code?: string;
    sac_code?: string;
    tax_rate?: number;
  }>;
  customerGstin?: string;
  supplyStateCode?: string;
}

// ============================================
// RAZORPAY ROUTES
// ============================================

export async function razorpayRoutes(fastify: FastifyInstance) {

  // ==========================================
  // PAYMENT ORDERS
  // ==========================================

  /**
   * Create a payment order
   * POST /api/payments/orders
   */
  fastify.post<{ Body: CreateOrderBody }>(
    '/api/payments/orders',
    async (request, reply) => {
      try {
        const { amount, productId, customerId, notes } = request.body;

        // Validate amount
        if (!amount || amount <= 0) {
          return reply.code(400).send({
            error: 'Invalid amount. Amount must be greater than 0.'
          });
        }

        // Generate unique receipt ID
        const receipt = razorpayService.generateReceiptId('ORD');

        // Create order
        const order = await razorpayService.createOrder(
          amount,
          'INR',
          receipt,
          {
            ...notes,
            product_id: productId,
            customer_id: customerId,
          }
        );

        return {
          success: true,
          order: {
            id: order.id,
            amount: razorpayService.toRupees(order.amount),
            amountInPaise: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: order.status,
          }
        };
      } catch (error) {
        fastify.log.error({ error }, 'Failed to create order');
        return reply.code(500).send({
          error: 'Failed to create order',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Verify payment signature
   * POST /api/payments/verify
   */
  fastify.post<{ Body: VerifyPaymentBody }>(
    '/api/payments/verify',
    async (request, reply) => {
      try {
        const { orderId, paymentId, signature } = request.body;

        // Verify signature
        const isValid = razorpayService.verifyPaymentSignature(
          orderId,
          paymentId,
          signature
        );

        if (!isValid) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid signature. Payment verification failed.'
          });
        }

        // Fetch payment details
        const payment = await razorpayService.fetchPayment(paymentId);

        // TODO: Update database with payment details
        // await updateOrderStatus(orderId, 'paid', payment);

        return {
          success: true,
          verified: true,
          payment: {
            id: payment.id,
            amount: razorpayService.toRupees(payment.amount),
            status: payment.status,
            method: payment.method,
            captured: payment.captured,
          }
        };
      } catch (error) {
        fastify.log.error({ error }, 'Payment verification failed');
        return reply.code(500).send({
          error: 'Payment verification failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Get order details
   * GET /api/payments/orders/:orderId
   */
  fastify.get<{ Params: { orderId: string } }>(
    '/api/payments/orders/:orderId',
    async (request, reply) => {
      try {
        const { orderId } = request.params;
        const order = await razorpayService.fetchOrder(orderId);

        return {
          success: true,
          order: {
            id: order.id,
            amount: razorpayService.toRupees(order.amount),
            amountPaid: razorpayService.toRupees(order.amount_paid),
            amountDue: razorpayService.toRupees(order.amount_due),
            currency: order.currency,
            receipt: order.receipt,
            status: order.status,
            attempts: order.attempts,
            createdAt: order.created_at,
          }
        };
      } catch (error) {
        fastify.log.error({ error, orderId: request.params.orderId }, 'Failed to fetch order');
        return reply.code(404).send({
          error: 'Order not found',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // ==========================================
  // REFUNDS
  // ==========================================

  /**
   * Refund a payment
   * POST /api/payments/:paymentId/refund
   */
  fastify.post<{
    Params: { paymentId: string };
    Body: { amount?: number; reason?: string; speed?: 'normal' | 'optimum' };
  }>(
    '/api/payments/:paymentId/refund',
    async (request, reply) => {
      try {
        const { paymentId } = request.params;
        const { amount, reason, speed } = request.body;

        const refund = await razorpayService.refundPayment(
          paymentId,
          amount,
          { reason: reason || 'Customer requested refund' },
          speed
        );

        return {
          success: true,
          refund: {
            id: refund.id,
            amount: razorpayService.toRupees(refund.amount),
            status: refund.status,
            speed: refund.speed_requested,
            paymentId: refund.payment_id,
          }
        };
      } catch (error) {
        fastify.log.error({ error, paymentId: request.params.paymentId }, 'Refund failed');
        return reply.code(500).send({
          error: 'Refund failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // ==========================================
  // SUBSCRIPTIONS
  // ==========================================

  /**
   * Create a subscription
   * POST /api/subscriptions
   */
  fastify.post<{ Body: CreateSubscriptionBody }>(
    '/api/subscriptions',
    async (request, reply) => {
      try {
        const { planId, customerId, quantity, trialDays } = request.body;

        // Calculate start date if trial period
        const startAt = trialDays
          ? Math.floor(Date.now() / 1000) + (trialDays * 24 * 60 * 60)
          : undefined;

        const subscription = await razorpayService.createSubscription(
          planId,
          customerId,
          undefined, // No end date
          startAt,
          {
            quantity: quantity || 1,
            notify: true,
          }
        );

        return {
          success: true,
          subscription: {
            id: subscription.id,
            planId: subscription.plan_id,
            customerId: subscription.customer_id,
            status: subscription.status,
            quantity: subscription.quantity,
            startAt: subscription.start_at,
            shortUrl: subscription.short_url,
          }
        };
      } catch (error) {
        fastify.log.error({ error }, 'Failed to create subscription');
        return reply.code(500).send({
          error: 'Failed to create subscription',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Cancel subscription
   * POST /api/subscriptions/:subscriptionId/cancel
   */
  fastify.post<{
    Params: { subscriptionId: string };
    Body: { cancelAtCycleEnd?: boolean };
  }>(
    '/api/subscriptions/:subscriptionId/cancel',
    async (request, reply) => {
      try {
        const { subscriptionId } = request.params;
        const { cancelAtCycleEnd = true } = request.body;

        const subscription = await razorpayService.cancelSubscription(
          subscriptionId,
          cancelAtCycleEnd
        );

        return {
          success: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            endedAt: subscription.ended_at,
          }
        };
      } catch (error) {
        fastify.log.error({ error, subscriptionId: request.params.subscriptionId }, 'Failed to cancel subscription');
        return reply.code(500).send({
          error: 'Failed to cancel subscription',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Pause subscription
   * POST /api/subscriptions/:subscriptionId/pause
   */
  fastify.post<{ Params: { subscriptionId: string } }>(
    '/api/subscriptions/:subscriptionId/pause',
    async (request, reply) => {
      try {
        const { subscriptionId } = request.params;

        const subscription = await razorpayService.pauseSubscription(subscriptionId);

        return {
          success: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
          }
        };
      } catch (error) {
        fastify.log.error({ error, subscriptionId: request.params.subscriptionId }, 'Failed to pause subscription');
        return reply.code(500).send({
          error: 'Failed to pause subscription',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Resume subscription
   * POST /api/subscriptions/:subscriptionId/resume
   */
  fastify.post<{ Params: { subscriptionId: string } }>(
    '/api/subscriptions/:subscriptionId/resume',
    async (request, reply) => {
      try {
        const { subscriptionId } = request.params;

        const subscription = await razorpayService.resumeSubscription(subscriptionId);

        return {
          success: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
          }
        };
      } catch (error) {
        fastify.log.error({ error, subscriptionId: request.params.subscriptionId }, 'Failed to resume subscription');
        return reply.code(500).send({
          error: 'Failed to resume subscription',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // ==========================================
  // INVOICES
  // ==========================================

  /**
   * Create GST invoice
   * POST /api/invoices/gst
   */
  fastify.post<{ Body: CreateGSTInvoiceBody }>(
    '/api/invoices/gst',
    async (request, reply) => {
      try {
        const { customerId, items, customerGstin, supplyStateCode } = request.body;

        const invoice = await razorpayService.createGSTInvoice({
          customer_id: customerId,
          line_items: items.map(item => ({
            name: item.name,
            amount: item.amount,
            currency: 'INR',
            quantity: item.quantity,
            hsn_code: item.hsn_code,
            sac_code: item.sac_code,
            tax_rate: item.tax_rate || 18,
            tax_inclusive: false,
          })),
          customer_gstin: customerGstin,
          supply_state_code: supplyStateCode,
          description: 'GST Invoice',
        });

        return {
          success: true,
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            amount: razorpayService.toRupees(invoice.amount),
            taxAmount: razorpayService.toRupees(invoice.tax_amount),
            status: invoice.status,
            shortUrl: invoice.short_url,
          }
        };
      } catch (error) {
        fastify.log.error({ error }, 'Failed to create GST invoice');
        return reply.code(500).send({
          error: 'Failed to create GST invoice',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // ==========================================
  // UPI PAYMENTS
  // ==========================================

  /**
   * Create UPI QR Code
   * POST /api/payments/upi/qr
   */
  fastify.post<{
    Body: {
      name: string;
      amount?: number;
      description?: string;
    };
  }>(
    '/api/payments/upi/qr',
    async (request, reply) => {
      try {
        const { name, amount, description } = request.body;

        const qrCode = await razorpayService.createQRCode({
          name,
          usage: amount ? 'single_use' : 'multiple_use',
          type: 'upi_qr',
          fixed_amount: !!amount,
          payment_amount: amount,
          description,
        });

        return {
          success: true,
          qrCode: {
            id: qrCode.id,
            imageUrl: qrCode.image_url,
            amount: amount ? razorpayService.formatAmount(razorpayService.toPaise(amount)) : null,
            status: qrCode.status,
          }
        };
      } catch (error) {
        fastify.log.error({ error }, 'Failed to create QR code');
        return reply.code(500).send({
          error: 'Failed to create QR code',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Validate bank account
   * POST /api/payments/validate-bank
   */
  fastify.post<{
    Body: {
      accountNumber: string;
      ifsc: string;
      name?: string;
    };
  }>(
    '/api/payments/validate-bank',
    async (request, reply) => {
      try {
        const { accountNumber, ifsc, name } = request.body;

        const validation = await razorpayService.validateBankAccount(
          accountNumber,
          ifsc,
          name
        );

        return {
          success: true,
          validation: {
            valid: validation.valid,
            nameAtBank: validation.name_at_bank,
            error: validation.error,
          }
        };
      } catch (error) {
        fastify.log.error({ error }, 'Bank validation failed');
        return reply.code(500).send({
          error: 'Bank validation failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // ==========================================
  // WEBHOOKS
  // ==========================================

  /**
   * Razorpay webhook handler
   * POST /api/webhooks/razorpay
   */
  fastify.post(
    '/api/webhooks/razorpay',
    async (request, reply) => {
      try {
        const signature = request.headers['x-razorpay-signature'] as string;

        if (!signature) {
          return reply.code(400).send({ error: 'Missing signature' });
        }

        // Parse and verify webhook
        const event = razorpayService.constructWebhookEvent(
          JSON.stringify(request.body),
          signature
        );

        fastify.log.info({ event: event.event }, 'Received Razorpay webhook');

        // Handle different event types
        switch (event.event) {
          case 'payment.captured':
            await handlePaymentCaptured(event.payload.payment.entity);
            break;

          case 'payment.failed':
            await handlePaymentFailed(event.payload.payment.entity);
            break;

          case 'subscription.charged':
            await handleSubscriptionCharged(event.payload.subscription.entity);
            break;

          case 'subscription.cancelled':
            await handleSubscriptionCancelled(event.payload.subscription.entity);
            break;

          case 'subscription.paused':
            await handleSubscriptionPaused(event.payload.subscription.entity);
            break;

          case 'subscription.resumed':
            await handleSubscriptionResumed(event.payload.subscription.entity);
            break;

          case 'invoice.paid':
            await handleInvoicePaid(event.payload.invoice.entity);
            break;

          case 'virtual_account.credited':
            await handleVirtualAccountCredited(event.payload.virtual_account.entity);
            break;

          case 'qr_code.credited':
            await handleQRCodePayment(event.payload.qr_code.entity);
            break;

          default:
            fastify.log.warn({ event: event.event }, 'Unhandled webhook event');
        }

        return { status: 'ok' };
      } catch (error) {
        fastify.log.error({ error }, 'Webhook processing failed');
        return reply.code(400).send({
          error: 'Webhook processing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
}

// ============================================
// WEBHOOK EVENT HANDLERS
// ============================================

async function handlePaymentCaptured(payment: any) {
  console.log('[Webhook] Payment captured:', payment.id);
  // TODO: Update order status to 'paid'
  // TODO: Send confirmation email
  // TODO: Trigger order fulfillment
}

async function handlePaymentFailed(payment: any) {
  console.log('[Webhook] Payment failed:', payment.id);
  // TODO: Update order status to 'failed'
  // TODO: Send payment failure notification
  // TODO: Retry payment or offer alternative payment method
}

async function handleSubscriptionCharged(subscription: any) {
  console.log('[Webhook] Subscription charged:', subscription.id);
  // TODO: Update subscription status
  // TODO: Send payment receipt
  // TODO: Extend subscription period
}

async function handleSubscriptionCancelled(subscription: any) {
  console.log('[Webhook] Subscription cancelled:', subscription.id);
  // TODO: Update subscription status to 'cancelled'
  // TODO: Revoke access if immediate cancellation
  // TODO: Send cancellation confirmation
}

async function handleSubscriptionPaused(subscription: any) {
  console.log('[Webhook] Subscription paused:', subscription.id);
  // TODO: Update subscription status to 'paused'
  // TODO: Optionally suspend services
}

async function handleSubscriptionResumed(subscription: any) {
  console.log('[Webhook] Subscription resumed:', subscription.id);
  // TODO: Update subscription status to 'active'
  // TODO: Restore services
}

async function handleInvoicePaid(invoice: any) {
  console.log('[Webhook] Invoice paid:', invoice.id);
  // TODO: Update invoice status
  // TODO: Send receipt
  // TODO: Fulfill services
}

async function handleVirtualAccountCredited(virtualAccount: any) {
  console.log('[Webhook] Virtual account credited:', virtualAccount.id);
  // TODO: Process payment
  // TODO: Update order/invoice status
  // TODO: Send confirmation
}

async function handleQRCodePayment(qrCode: any) {
  console.log('[Webhook] QR code payment received:', qrCode.id);
  // TODO: Process QR code payment
  // TODO: Update transaction status
  // TODO: Send receipt
}

// ============================================
// EXPORT
// ============================================

export default razorpayRoutes;
