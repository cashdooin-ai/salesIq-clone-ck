// Nexvo API - Billing Routes
// Comprehensive billing and subscription management endpoints

import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';
import { ERROR_CODES } from '@nexvo/shared';
import { requireAuth, requireAdmin } from '../../middleware/index.js';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  cancelSubscriptionSchema,
  createCheckoutSchema,
  verifyCheckoutSchema,
  validatePromoCodeSchema,
  applyPromoCodeSchema,
  addPaymentMethodSchema,
  invoiceQuerySchema,
  paymentQuerySchema,
  usageHistoryQuerySchema,
  idParamSchema,
  paymentMethodIdParamSchema,
} from './billing.schemas.js';

// ============================================================================
// Billing Routes
// ============================================================================

export async function billingRoutes(fastify: FastifyInstance) {
  // ==========================================================================
  // PLANS
  // ==========================================================================

  /**
   * GET /billing/plans
   * List all active pricing plans
   */
  fastify.get('/plans', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: [{ price: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          yearlyPrice: true,
          currency: true,
          features: true,
          limits: true,
          isActive: true,
          isPopular: true,
          trialDays: true,
          createdAt: true,
        },
      });

      return { success: true, data: plans };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch plans');
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch pricing plans',
        },
      });
    }
  });

  /**
   * GET /billing/plans/:id
   * Get plan details by ID
   */
  fastify.get('/plans/:id', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);

      const plan = await prisma.plan.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          yearlyPrice: true,
          currency: true,
          features: true,
          limits: true,
          isActive: true,
          isPopular: true,
          trialDays: true,
          createdAt: true,
        },
      });

      if (!plan) {
        return reply.status(404).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Plan not found' },
        });
      }

      return { success: true, data: plan };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
        });
      }

      request.log.error({ error }, 'Failed to fetch plan');
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch plan details',
        },
      });
    }
  });

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  /**
   * GET /billing/subscription
   * Get current organization subscription
   */
  fastify.get('/subscription', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          organizationId: request.user!.organizationId,
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              yearlyPrice: true,
              currency: true,
              features: true,
              limits: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'No active subscription found',
          },
        });
      }

      return { success: true, data: subscription };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch subscription');
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch subscription',
        },
      });
    }
  });

  /**
   * POST /billing/subscription
   * Create new subscription
   * Requires: OWNER or ADMIN
   */
  fastify.post(
    '/subscription',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const body = createSubscriptionSchema.parse(request.body);
        const organizationId = request.user!.organizationId;

        // Check if plan exists and is active
        const plan = await prisma.plan.findUnique({
          where: { id: body.planId },
        });

        if (!plan || !plan.isActive) {
          return reply.status(400).send({
            success: false,
            error: {
              code: ERROR_CODES.INVALID_INPUT,
              message: 'Invalid or inactive plan selected',
            },
          });
        }

        // Check for existing active subscription
        const existingSubscription = await prisma.subscription.findFirst({
          where: {
            organizationId,
            status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
          },
        });

        if (existingSubscription) {
          return reply.status(400).send({
            success: false,
            error: {
              code: ERROR_CODES.ALREADY_EXISTS,
              message: 'Organization already has an active subscription',
            },
          });
        }

        // Validate promo code if provided
        let discount = 0;
        let promoCodeId = null;

        if (body.promoCode) {
          const promoCode = await prisma.promoCode.findFirst({
            where: {
              code: body.promoCode.toUpperCase(),
              isActive: true,
              OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
              OR: [{ maxUses: null }, { usedCount: { lt: prisma.promoCode.fields.maxUses } }],
            },
          });

          if (!promoCode) {
            return reply.status(400).send({
              success: false,
              error: {
                code: ERROR_CODES.INVALID_INPUT,
                message: 'Invalid or expired promo code',
              },
            });
          }

          discount = promoCode.discountPercent || 0;
          promoCodeId = promoCode.id;
        }

        // Calculate price based on billing cycle
        const basePrice = body.billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.price;
        const discountAmount = (basePrice * discount) / 100;
        const finalPrice = basePrice - discountAmount;

        // Calculate trial end date if applicable
        const trialEndDate = plan.trialDays
          ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000)
          : null;

        // Create subscription
        const subscription = await prisma.subscription.create({
          data: {
            organizationId,
            planId: body.planId,
            status: trialEndDate ? 'TRIALING' : 'ACTIVE',
            billingCycle: body.billingCycle,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() +
                (body.billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000
            ),
            trialEnd: trialEndDate,
            cancelAtPeriodEnd: false,
            promoCodeId,
          },
          include: {
            plan: true,
          },
        });

        // Update promo code usage if applied
        if (promoCodeId) {
          await prisma.promoCode.update({
            where: { id: promoCodeId },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Update organization plan
        await prisma.organization.update({
          where: { id: organizationId },
          data: { plan: plan.slug },
        });

        request.log.info(
          { subscriptionId: subscription.id, organizationId, planId: body.planId },
          'Subscription created successfully'
        );

        return { success: true, data: subscription };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
          });
        }

        request.log.error({ error }, 'Failed to create subscription');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to create subscription',
          },
        });
      }
    }
  );

  /**
   * PATCH /billing/subscription
   * Update subscription (change plan)
   * Requires: OWNER or ADMIN
   */
  fastify.patch(
    '/subscription',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const body = updateSubscriptionSchema.parse(request.body);
        const organizationId = request.user!.organizationId;

        // Get current subscription
        const currentSubscription = await prisma.subscription.findFirst({
          where: {
            organizationId,
            status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
          },
          include: { plan: true },
        });

        if (!currentSubscription) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: 'No active subscription found',
            },
          });
        }

        // Check if new plan exists and is active
        const newPlan = await prisma.plan.findUnique({
          where: { id: body.planId },
        });

        if (!newPlan || !newPlan.isActive) {
          return reply.status(400).send({
            success: false,
            error: {
              code: ERROR_CODES.INVALID_INPUT,
              message: 'Invalid or inactive plan selected',
            },
          });
        }

        // Calculate prorated amount if applicable
        // This is a simplified version - in production, integrate with payment gateway
        const shouldProrate = body.prorating !== false;
        let proratedAmount = 0;

        if (shouldProrate) {
          const daysRemaining = Math.ceil(
            (currentSubscription.currentPeriodEnd.getTime() - Date.now()) /
              (24 * 60 * 60 * 1000)
          );
          const totalDays = currentSubscription.billingCycle === 'YEARLY' ? 365 : 30;
          proratedAmount = (newPlan.price * daysRemaining) / totalDays;
        }

        // Update subscription
        const updatedSubscription = await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            planId: body.planId,
          },
          include: { plan: true },
        });

        // Update organization plan
        await prisma.organization.update({
          where: { id: organizationId },
          data: { plan: newPlan.slug },
        });

        request.log.info(
          {
            subscriptionId: updatedSubscription.id,
            oldPlanId: currentSubscription.planId,
            newPlanId: body.planId,
          },
          'Subscription updated successfully'
        );

        return {
          success: true,
          data: {
            subscription: updatedSubscription,
            proratedAmount: shouldProrate ? proratedAmount : null,
          },
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
          });
        }

        request.log.error({ error }, 'Failed to update subscription');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to update subscription',
          },
        });
      }
    }
  );

  /**
   * DELETE /billing/subscription
   * Cancel subscription
   * Requires: OWNER or ADMIN
   */
  fastify.delete(
    '/subscription',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const body = cancelSubscriptionSchema.parse(request.body);
        const organizationId = request.user!.organizationId;

        // Get current subscription
        const subscription = await prisma.subscription.findFirst({
          where: {
            organizationId,
            status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'PAUSED'] },
          },
        });

        if (!subscription) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: 'No active subscription found',
            },
          });
        }

        // Cancel subscription
        const updateData: any = {
          cancelledAt: new Date(),
          cancellationReason: body.reason || null,
        };

        if (body.immediate) {
          // Cancel immediately
          updateData.status = 'CANCELLED';
          updateData.currentPeriodEnd = new Date();
        } else {
          // Cancel at period end
          updateData.cancelAtPeriodEnd = true;
        }

        const cancelledSubscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: updateData,
          include: { plan: true },
        });

        request.log.info(
          {
            subscriptionId: subscription.id,
            organizationId,
            immediate: body.immediate,
          },
          'Subscription cancelled'
        );

        return { success: true, data: cancelledSubscription };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
          });
        }

        request.log.error({ error }, 'Failed to cancel subscription');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to cancel subscription',
          },
        });
      }
    }
  );

  /**
   * POST /billing/subscription/pause
   * Pause subscription
   * Requires: OWNER or ADMIN
   */
  fastify.post(
    '/subscription/pause',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const organizationId = request.user!.organizationId;

        // Get current subscription
        const subscription = await prisma.subscription.findFirst({
          where: {
            organizationId,
            status: 'ACTIVE',
          },
        });

        if (!subscription) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: 'No active subscription found',
            },
          });
        }

        // Pause subscription
        const pausedSubscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'PAUSED',
            pausedAt: new Date(),
          },
          include: { plan: true },
        });

        request.log.info(
          { subscriptionId: subscription.id, organizationId },
          'Subscription paused'
        );

        return { success: true, data: pausedSubscription };
      } catch (error) {
        request.log.error({ error }, 'Failed to pause subscription');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to pause subscription',
          },
        });
      }
    }
  );

  /**
   * POST /billing/subscription/resume
   * Resume paused subscription
   * Requires: OWNER or ADMIN
   */
  fastify.post(
    '/subscription/resume',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const organizationId = request.user!.organizationId;

        // Get paused subscription
        const subscription = await prisma.subscription.findFirst({
          where: {
            organizationId,
            status: 'PAUSED',
          },
        });

        if (!subscription) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: 'No paused subscription found',
            },
          });
        }

        // Resume subscription
        const resumedSubscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'ACTIVE',
            pausedAt: null,
          },
          include: { plan: true },
        });

        request.log.info(
          { subscriptionId: subscription.id, organizationId },
          'Subscription resumed'
        );

        return { success: true, data: resumedSubscription };
      } catch (error) {
        request.log.error({ error }, 'Failed to resume subscription');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to resume subscription',
          },
        });
      }
    }
  );

  // ==========================================================================
  // CHECKOUT
  // ==========================================================================

  /**
   * POST /billing/checkout
   * Create checkout session (for Stripe, PayPal, etc.)
   * Requires: OWNER or ADMIN
   */
  fastify.post(
    '/checkout',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const body = createCheckoutSchema.parse(request.body);
        const organizationId = request.user!.organizationId;

        // Check if plan exists
        const plan = await prisma.plan.findUnique({
          where: { id: body.planId },
        });

        if (!plan || !plan.isActive) {
          return reply.status(400).send({
            success: false,
            error: {
              code: ERROR_CODES.INVALID_INPUT,
              message: 'Invalid or inactive plan',
            },
          });
        }

        // In production, integrate with actual payment gateway (Stripe, PayPal, etc.)
        // For now, return a mock checkout session
        const sessionId = `checkout_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const checkoutUrl = `${body.successUrl}?session_id=${sessionId}`;

        // Store checkout session in database for verification
        // You'd need to create a CheckoutSession model in your schema
        request.log.info(
          {
            sessionId,
            organizationId,
            planId: body.planId,
          },
          'Checkout session created'
        );

        return {
          success: true,
          data: {
            checkoutUrl,
            sessionId,
          },
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
          });
        }

        request.log.error({ error }, 'Failed to create checkout session');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to create checkout session',
          },
        });
      }
    }
  );

  /**
   * POST /billing/checkout/verify
   * Verify checkout completion
   * Requires: OWNER or ADMIN
   */
  fastify.post(
    '/checkout/verify',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const body = verifyCheckoutSchema.parse(request.body);

        // In production, verify with payment gateway
        // For now, return mock verification
        const isValid = body.sessionId.startsWith('checkout_');

        if (!isValid) {
          return reply.status(400).send({
            success: false,
            error: {
              code: ERROR_CODES.INVALID_INPUT,
              message: 'Invalid checkout session',
            },
          });
        }

        return {
          success: true,
          data: {
            verified: true,
            status: 'SUCCEEDED',
          },
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
          });
        }

        request.log.error({ error }, 'Failed to verify checkout');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to verify checkout',
          },
        });
      }
    }
  );

  // ==========================================================================
  // INVOICES
  // ==========================================================================

  /**
   * GET /billing/invoices
   * List organization invoices
   */
  fastify.get('/invoices', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const query = invoiceQuerySchema.parse(request.query);
      const organizationId = request.user!.organizationId;

      const where: any = { organizationId };

      if (query.status) {
        where.status = query.status;
      }

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = new Date(query.startDate);
        if (query.endDate) where.createdAt.lte = new Date(query.endDate);
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: query.offset,
          take: query.limit,
          include: {
            subscription: {
              include: { plan: { select: { name: true, slug: true } } },
            },
          },
        }),
        prisma.invoice.count({ where }),
      ]);

      return {
        success: true,
        data: {
          invoices,
          pagination: {
            total,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + query.limit < total,
          },
        },
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
        });
      }

      request.log.error({ error }, 'Failed to fetch invoices');
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch invoices',
        },
      });
    }
  });

  /**
   * GET /billing/invoices/:id
   * Get invoice details
   */
  fastify.get('/invoices/:id', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const organizationId = request.user!.organizationId;

      const invoice = await prisma.invoice.findFirst({
        where: { id, organizationId },
        include: {
          subscription: {
            include: { plan: true },
          },
          payment: true,
        },
      });

      if (!invoice) {
        return reply.status(404).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Invoice not found' },
        });
      }

      return { success: true, data: invoice };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
        });
      }

      request.log.error({ error }, 'Failed to fetch invoice');
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch invoice',
        },
      });
    }
  });

  /**
   * GET /billing/invoices/:id/pdf
   * Download invoice PDF
   */
  fastify.get('/invoices/:id/pdf', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const organizationId = request.user!.organizationId;

      const invoice = await prisma.invoice.findFirst({
        where: { id, organizationId },
        include: {
          subscription: { include: { plan: true } },
          organization: true,
        },
      });

      if (!invoice) {
        return reply.status(404).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Invoice not found' },
        });
      }

      // In production, generate actual PDF using a library like PDFKit or Puppeteer
      // For now, return invoice data with a download URL
      return {
        success: true,
        data: {
          downloadUrl: `/api/v1/billing/invoices/${id}/download`,
          invoice,
        },
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
        });
      }

      request.log.error({ error }, 'Failed to generate invoice PDF');
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to generate invoice PDF',
        },
      });
    }
  });

  // ==========================================================================
  // PAYMENTS
  // ==========================================================================

  /**
   * GET /billing/payments
   * List organization payments
   */
  fastify.get('/payments', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const query = paymentQuerySchema.parse(request.query);
      const organizationId = request.user!.organizationId;

      const where: any = { organizationId };

      if (query.status) {
        where.status = query.status;
      }

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = new Date(query.startDate);
        if (query.endDate) where.createdAt.lte = new Date(query.endDate);
      }

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: query.offset,
          take: query.limit,
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                amount: true,
              },
            },
          },
        }),
        prisma.payment.count({ where }),
      ]);

      return {
        success: true,
        data: {
          payments,
          pagination: {
            total,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + query.limit < total,
          },
        },
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
        });
      }

      request.log.error({ error }, 'Failed to fetch payments');
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch payments',
        },
      });
    }
  });

  /**
   * GET /billing/payments/:id
   * Get payment details
   */
  fastify.get('/payments/:id', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const organizationId = request.user!.organizationId;

      const payment = await prisma.payment.findFirst({
        where: { id, organizationId },
        include: {
          invoice: {
            include: {
              subscription: {
                include: { plan: true },
              },
            },
          },
        },
      });

      if (!payment) {
        return reply.status(404).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Payment not found' },
        });
      }

      return { success: true, data: payment };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
        });
      }

      request.log.error({ error }, 'Failed to fetch payment');
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch payment',
        },
      });
    }
  });

  // ==========================================================================
  // PROMO CODES
  // ==========================================================================

  /**
   * POST /billing/promo/validate
   * Validate promo code
   */
  fastify.post(
    '/promo/validate',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const body = validatePromoCodeSchema.parse(request.body);

        const promoCode = await prisma.promoCode.findFirst({
          where: {
            code: body.code.toUpperCase(),
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
          },
        });

        if (!promoCode) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: 'Invalid or expired promo code',
            },
          });
        }

        // Check if max uses reached
        if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
          return reply.status(400).send({
            success: false,
            error: {
              code: ERROR_CODES.INVALID_INPUT,
              message: 'Promo code usage limit reached',
            },
          });
        }

        // Check if applicable to the plan
        if (body.planId && promoCode.applicablePlans) {
          const applicablePlans = promoCode.applicablePlans as string[];
          if (!applicablePlans.includes(body.planId)) {
            return reply.status(400).send({
              success: false,
              error: {
                code: ERROR_CODES.INVALID_INPUT,
                message: 'Promo code not applicable to selected plan',
              },
            });
          }
        }

        return {
          success: true,
          data: {
            valid: true,
            code: promoCode.code,
            discountPercent: promoCode.discountPercent,
            description: promoCode.description,
          },
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
          });
        }

        request.log.error({ error }, 'Failed to validate promo code');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to validate promo code',
          },
        });
      }
    }
  );

  /**
   * POST /billing/promo/apply
   * Apply promo code to subscription
   * Requires: OWNER or ADMIN
   */
  fastify.post(
    '/promo/apply',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const body = applyPromoCodeSchema.parse(request.body);
        const organizationId = request.user!.organizationId;

        // Get current subscription
        const subscription = await prisma.subscription.findFirst({
          where: {
            organizationId,
            status: { in: ['ACTIVE', 'TRIALING'] },
          },
        });

        if (!subscription) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: 'No active subscription found',
            },
          });
        }

        // Validate promo code
        const promoCode = await prisma.promoCode.findFirst({
          where: {
            code: body.code.toUpperCase(),
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
          },
        });

        if (!promoCode) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: 'Invalid or expired promo code',
            },
          });
        }

        // Apply promo code to subscription
        const updatedSubscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: { promoCodeId: promoCode.id },
          include: { plan: true, promoCode: true },
        });

        // Increment usage count
        await prisma.promoCode.update({
          where: { id: promoCode.id },
          data: { usedCount: { increment: 1 } },
        });

        request.log.info(
          { subscriptionId: subscription.id, promoCodeId: promoCode.id },
          'Promo code applied to subscription'
        );

        return { success: true, data: updatedSubscription };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
          });
        }

        request.log.error({ error }, 'Failed to apply promo code');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to apply promo code',
          },
        });
      }
    }
  );

  // ==========================================================================
  // PAYMENT METHODS
  // ==========================================================================

  /**
   * GET /billing/payment-methods
   * List saved payment methods
   * Requires: OWNER or ADMIN
   */
  fastify.get(
    '/payment-methods',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const organizationId = request.user!.organizationId;

        const paymentMethods = await prisma.paymentMethod.findMany({
          where: { organizationId },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            type: true,
            last4: true,
            brand: true,
            expiryMonth: true,
            expiryYear: true,
            isDefault: true,
            createdAt: true,
          },
        });

        return { success: true, data: paymentMethods };
      } catch (error) {
        request.log.error({ error }, 'Failed to fetch payment methods');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to fetch payment methods',
          },
        });
      }
    }
  );

  /**
   * POST /billing/payment-methods
   * Add new payment method
   * Requires: OWNER or ADMIN
   */
  fastify.post(
    '/payment-methods',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const body = addPaymentMethodSchema.parse(request.body);
        const organizationId = request.user!.organizationId;

        // In production, integrate with payment gateway to tokenize payment method
        // For now, create a mock payment method
        const paymentMethod = await prisma.paymentMethod.create({
          data: {
            organizationId,
            type: body.type,
            gatewayId: body.token, // In production, this would be the gateway's payment method ID
            last4: '4242', // Mock data
            brand: 'Visa', // Mock data
            isDefault: body.isDefault,
            metadata: body.metadata || {},
          },
        });

        // If setting as default, unset others
        if (body.isDefault) {
          await prisma.paymentMethod.updateMany({
            where: {
              organizationId,
              id: { not: paymentMethod.id },
            },
            data: { isDefault: false },
          });
        }

        request.log.info(
          { paymentMethodId: paymentMethod.id, organizationId },
          'Payment method added'
        );

        return { success: true, data: paymentMethod };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
          });
        }

        request.log.error({ error }, 'Failed to add payment method');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to add payment method',
          },
        });
      }
    }
  );

  /**
   * DELETE /billing/payment-methods/:id
   * Remove payment method
   * Requires: OWNER or ADMIN
   */
  fastify.delete(
    '/payment-methods/:id',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const { id } = paymentMethodIdParamSchema.parse(request.params);
        const organizationId = request.user!.organizationId;

        const paymentMethod = await prisma.paymentMethod.findFirst({
          where: { id, organizationId },
        });

        if (!paymentMethod) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: 'Payment method not found',
            },
          });
        }

        // Don't allow deleting default payment method if there are others
        if (paymentMethod.isDefault) {
          const otherMethods = await prisma.paymentMethod.count({
            where: {
              organizationId,
              id: { not: id },
            },
          });

          if (otherMethods > 0) {
            return reply.status(400).send({
              success: false,
              error: {
                code: ERROR_CODES.INVALID_INPUT,
                message: 'Cannot delete default payment method. Set another as default first.',
              },
            });
          }
        }

        await prisma.paymentMethod.delete({
          where: { id },
        });

        request.log.info({ paymentMethodId: id, organizationId }, 'Payment method deleted');

        return {
          success: true,
          data: { message: 'Payment method deleted successfully' },
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
          });
        }

        request.log.error({ error }, 'Failed to delete payment method');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to delete payment method',
          },
        });
      }
    }
  );

  /**
   * POST /billing/payment-methods/:id/default
   * Set payment method as default
   * Requires: OWNER or ADMIN
   */
  fastify.post(
    '/payment-methods/:id/default',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const { id } = paymentMethodIdParamSchema.parse(request.params);
        const organizationId = request.user!.organizationId;

        const paymentMethod = await prisma.paymentMethod.findFirst({
          where: { id, organizationId },
        });

        if (!paymentMethod) {
          return reply.status(404).send({
            success: false,
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: 'Payment method not found',
            },
          });
        }

        // Unset all other default methods
        await prisma.paymentMethod.updateMany({
          where: { organizationId },
          data: { isDefault: false },
        });

        // Set this one as default
        const updatedMethod = await prisma.paymentMethod.update({
          where: { id },
          data: { isDefault: true },
        });

        request.log.info(
          { paymentMethodId: id, organizationId },
          'Payment method set as default'
        );

        return { success: true, data: updatedMethod };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            success: false,
            error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
          });
        }

        request.log.error({ error }, 'Failed to set default payment method');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to set default payment method',
          },
        });
      }
    }
  );

  // ==========================================================================
  // BILLING PORTAL
  // ==========================================================================

  /**
   * POST /billing/portal
   * Create billing portal session (Stripe-style)
   * Requires: OWNER or ADMIN
   */
  fastify.post(
    '/portal',
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      try {
        const organizationId = request.user!.organizationId;

        // In production, create actual Stripe billing portal session
        // For now, return a mock portal URL
        const portalUrl = `https://billing.nexvo.app/portal/${organizationId}`;

        request.log.info({ organizationId }, 'Billing portal session created');

        return {
          success: true,
          data: { portalUrl },
        };
      } catch (error) {
        request.log.error({ error }, 'Failed to create billing portal session');
        return reply.status(500).send({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Failed to create billing portal session',
          },
        });
      }
    }
  );

  // ==========================================================================
  // USAGE TRACKING
  // ==========================================================================

  /**
   * GET /billing/usage
   * Get current period usage
   */
  fastify.get('/usage', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const organizationId = request.user!.organizationId;

      // Get current subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          organizationId,
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
        include: { plan: true },
      });

      if (!subscription) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'No active subscription found',
          },
        });
      }

      // Get usage for current period
      const periodStart = subscription.currentPeriodStart;
      const periodEnd = subscription.currentPeriodEnd;

      const [conversationCount, visitorCount, operatorCount] = await Promise.all([
        prisma.conversation.count({
          where: {
            organizationId,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        prisma.visitor.count({
          where: {
            organizationId,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        prisma.user.count({
          where: { organizationId },
        }),
      ]);

      const planLimits = subscription.plan.limits as any;

      return {
        success: true,
        data: {
          period: {
            start: periodStart,
            end: periodEnd,
          },
          usage: {
            conversations: {
              current: conversationCount,
              limit: planLimits?.conversations || null,
              percentage: planLimits?.conversations
                ? (conversationCount / planLimits.conversations) * 100
                : null,
            },
            visitors: {
              current: visitorCount,
              limit: planLimits?.visitors || null,
              percentage: planLimits?.visitors
                ? (visitorCount / planLimits.visitors) * 100
                : null,
            },
            operators: {
              current: operatorCount,
              limit: planLimits?.operators || null,
              percentage: planLimits?.operators
                ? (operatorCount / planLimits.operators) * 100
                : null,
            },
          },
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch usage');
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch usage',
        },
      });
    }
  });

  /**
   * GET /billing/usage/history
   * Get usage history
   */
  fastify.get('/usage/history', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const query = usageHistoryQuerySchema.parse(request.query);
      const organizationId = request.user!.organizationId;

      // In production, you'd have a UsageLog table to store historical usage
      // For now, return mock data
      return {
        success: true,
        data: {
          history: [],
          pagination: {
            total: 0,
            limit: query.limit,
            offset: query.offset,
            hasMore: false,
          },
        },
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: ERROR_CODES.INVALID_INPUT, message: error.errors[0].message },
        });
      }

      request.log.error({ error }, 'Failed to fetch usage history');
      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch usage history',
        },
      });
    }
  });
}
