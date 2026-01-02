/**
 * Stripe Payment Gateway Service
 *
 * Complete implementation of Stripe payment gateway for the Nexvo SalesIQ clone.
 * Handles subscriptions, one-time payments, customer management, and webhooks.
 *
 * @module StripePaymentGateway
 */

import Stripe from 'stripe';
import pino from 'pino';
import {
  PaymentGatewayInterface,
  PaymentGatewayError,
  CheckoutSessionParams,
  CheckoutSessionResult,
  SubscriptionParams,
  SubscriptionResult,
  SubscriptionStatus,
  PaymentIntentParams,
  PaymentIntentResult,
  PaymentMethod,
  CreatePriceParams,
  PriceResult,
  CustomerResult,
  BillingPortalSessionResult,
  WebhookEvent,
  WebhookEventType,
  PricingPlan,
} from './types';

const logger = pino({ name: 'stripe-payment-gateway' });

/**
 * Stripe Payment Gateway Service
 *
 * Provides a comprehensive interface for Stripe payment operations including:
 * - Customer management
 * - Subscription lifecycle (create, update, cancel, pause, resume)
 * - One-time payments
 * - Payment method management
 * - Billing portal
 * - Product and price synchronization
 * - Webhook handling
 */
export class StripePaymentGateway implements PaymentGatewayInterface {
  private stripe: Stripe;

  /**
   * Initialize Stripe Payment Gateway
   *
   * @param secretKey - Stripe secret key (from environment variable)
   * @param webhookSecret - Stripe webhook signing secret (optional)
   * @throws {PaymentGatewayError} If secret key is not provided
   */
  constructor(
    private secretKey: string,
    private webhookSecret?: string
  ) {
    if (!secretKey) {
      throw new PaymentGatewayError(
        'Stripe secret key is required',
        'MISSING_SECRET_KEY',
        500
      );
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });

    logger.info('Stripe Payment Gateway initialized');
  }

  /**
   * Create a customer in Stripe
   *
   * @param organizationId - Internal organization ID
   * @param email - Customer email address
   * @param name - Customer name (optional)
   * @param metadata - Additional metadata to store with customer (optional)
   * @returns Customer information
   * @throws {PaymentGatewayError} If customer creation fails
   *
   * @example
   * ```typescript
   * const customer = await stripe.createCustomer(
   *   'org_123',
   *   'customer@example.com',
   *   'John Doe'
   * );
   * ```
   */
  async createCustomer(
    organizationId: string,
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<CustomerResult> {
    try {
      logger.info({ organizationId, email }, 'Creating Stripe customer');

      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          organizationId,
          ...metadata,
        },
      });

      logger.info({ customerId: customer.id }, 'Stripe customer created');

      return this.mapCustomer(customer);
    } catch (error) {
      logger.error({ error, organizationId, email }, 'Failed to create customer');
      throw this.handleStripeError(error, 'Failed to create customer');
    }
  }

  /**
   * Get customer by ID
   *
   * @param customerId - Stripe customer ID
   * @returns Customer information
   * @throws {PaymentGatewayError} If customer not found or retrieval fails
   */
  async getCustomer(customerId: string): Promise<CustomerResult> {
    try {
      logger.debug({ customerId }, 'Retrieving Stripe customer');

      const customer = await this.stripe.customers.retrieve(customerId);

      if (customer.deleted) {
        throw new PaymentGatewayError(
          'Customer has been deleted',
          'CUSTOMER_DELETED',
          404
        );
      }

      return this.mapCustomer(customer as Stripe.Customer);
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to retrieve customer');
      throw this.handleStripeError(error, 'Failed to retrieve customer');
    }
  }

  /**
   * Update customer information
   *
   * @param customerId - Stripe customer ID
   * @param data - Data to update (email, name, metadata)
   * @returns Updated customer information
   * @throws {PaymentGatewayError} If update fails
   */
  async updateCustomer(
    customerId: string,
    data: {
      email?: string;
      name?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<CustomerResult> {
    try {
      logger.info({ customerId, data }, 'Updating Stripe customer');

      const customer = await this.stripe.customers.update(customerId, data);

      logger.info({ customerId }, 'Stripe customer updated');

      return this.mapCustomer(customer);
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to update customer');
      throw this.handleStripeError(error, 'Failed to update customer');
    }
  }

  /**
   * Delete a customer from Stripe
   *
   * @param customerId - Stripe customer ID
   * @throws {PaymentGatewayError} If deletion fails
   */
  async deleteCustomer(customerId: string): Promise<void> {
    try {
      logger.info({ customerId }, 'Deleting Stripe customer');

      await this.stripe.customers.del(customerId);

      logger.info({ customerId }, 'Stripe customer deleted');
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to delete customer');
      throw this.handleStripeError(error, 'Failed to delete customer');
    }
  }

  /**
   * Create a Stripe Checkout session for subscription or payment
   *
   * @param params - Checkout session parameters
   * @returns Checkout session with URL and ID
   * @throws {PaymentGatewayError} If session creation fails
   *
   * @example
   * ```typescript
   * const session = await stripe.createCheckoutSession({
   *   customerId: 'cus_123',
   *   priceId: 'price_123',
   *   successUrl: 'https://example.com/success',
   *   cancelUrl: 'https://example.com/cancel',
   *   promoCode: 'SUMMER2026'
   * });
   * ```
   */
  async createCheckoutSession(
    params: CheckoutSessionParams
  ): Promise<CheckoutSessionResult> {
    try {
      logger.info({ params }, 'Creating Stripe checkout session');

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: params.customerId,
        mode: params.mode || 'subscription',
        line_items: [
          {
            price: params.priceId,
            quantity: params.quantity || 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        allow_promotion_codes: params.allowPromotionCodes ?? true,
        billing_address_collection: params.billingAddressCollection || 'auto',
        metadata: params.metadata,
      };

      // Add promo code if provided
      if (params.promoCode) {
        const promoCodes = await this.stripe.promotionCodes.list({
          code: params.promoCode,
          active: true,
          limit: 1,
        });

        if (promoCodes.data.length > 0) {
          sessionParams.discounts = [
            { promotion_code: promoCodes.data[0].id },
          ];
        } else {
          logger.warn({ promoCode: params.promoCode }, 'Promo code not found');
        }
      }

      // Add trial period if specified
      if (params.trialDays && params.mode === 'subscription') {
        sessionParams.subscription_data = {
          trial_period_days: params.trialDays,
          metadata: params.metadata,
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      logger.info({ sessionId: session.id }, 'Stripe checkout session created');

      return {
        sessionId: session.id,
        url: session.url!,
        expiresAt: new Date(session.expires_at * 1000),
      };
    } catch (error) {
      logger.error({ error, params }, 'Failed to create checkout session');
      throw this.handleStripeError(error, 'Failed to create checkout session');
    }
  }

  /**
   * Create a subscription directly (without checkout)
   *
   * @param params - Subscription parameters
   * @returns Created subscription
   * @throws {PaymentGatewayError} If subscription creation fails
   *
   * @example
   * ```typescript
   * const subscription = await stripe.createSubscription({
   *   customerId: 'cus_123',
   *   priceId: 'price_123',
   *   trialDays: 14
   * });
   * ```
   */
  async createSubscription(
    params: SubscriptionParams
  ): Promise<SubscriptionResult> {
    try {
      logger.info({ params }, 'Creating Stripe subscription');

      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        items: params.items || [
          {
            price: params.priceId,
            quantity: params.quantity || 1,
          },
        ],
        metadata: params.metadata,
        proration_behavior: params.prorationBehavior || 'create_prorations',
        payment_behavior: params.paymentBehavior || 'default_incomplete',
      };

      // Add trial period if specified
      if (params.trialDays) {
        subscriptionParams.trial_period_days = params.trialDays;
      }

      // Set default payment method if provided
      if (params.defaultPaymentMethod) {
        subscriptionParams.default_payment_method = params.defaultPaymentMethod;
      }

      const subscription = await this.stripe.subscriptions.create(
        subscriptionParams
      );

      logger.info(
        { subscriptionId: subscription.id },
        'Stripe subscription created'
      );

      return this.mapSubscription(subscription);
    } catch (error) {
      logger.error({ error, params }, 'Failed to create subscription');
      throw this.handleStripeError(error, 'Failed to create subscription');
    }
  }

  /**
   * Get subscription by ID
   *
   * @param subscriptionId - Stripe subscription ID
   * @returns Subscription information
   * @throws {PaymentGatewayError} If subscription not found or retrieval fails
   */
  async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      logger.debug({ subscriptionId }, 'Retrieving Stripe subscription');

      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId
      );

      return this.mapSubscription(subscription);
    } catch (error) {
      logger.error({ error, subscriptionId }, 'Failed to retrieve subscription');
      throw this.handleStripeError(error, 'Failed to retrieve subscription');
    }
  }

  /**
   * Cancel a subscription
   *
   * @param subscriptionId - Stripe subscription ID
   * @param immediate - Cancel immediately (true) or at period end (false)
   * @returns Updated subscription
   * @throws {PaymentGatewayError} If cancellation fails
   *
   * @example
   * ```typescript
   * // Cancel at period end
   * await stripe.cancelSubscription('sub_123', false);
   *
   * // Cancel immediately
   * await stripe.cancelSubscription('sub_123', true);
   * ```
   */
  async cancelSubscription(
    subscriptionId: string,
    immediate: boolean = false
  ): Promise<SubscriptionResult> {
    try {
      logger.info(
        { subscriptionId, immediate },
        'Canceling Stripe subscription'
      );

      let subscription: Stripe.Subscription;

      if (immediate) {
        // Cancel immediately
        subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        // Cancel at period end
        subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }

      logger.info(
        { subscriptionId, immediate },
        'Stripe subscription canceled'
      );

      return this.mapSubscription(subscription);
    } catch (error) {
      logger.error({ error, subscriptionId }, 'Failed to cancel subscription');
      throw this.handleStripeError(error, 'Failed to cancel subscription');
    }
  }

  /**
   * Pause a subscription
   *
   * @param subscriptionId - Stripe subscription ID
   * @returns Updated subscription
   * @throws {PaymentGatewayError} If pausing fails
   */
  async pauseSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      logger.info({ subscriptionId }, 'Pausing Stripe subscription');

      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          pause_collection: {
            behavior: 'void',
          },
        }
      );

      logger.info({ subscriptionId }, 'Stripe subscription paused');

      return this.mapSubscription(subscription);
    } catch (error) {
      logger.error({ error, subscriptionId }, 'Failed to pause subscription');
      throw this.handleStripeError(error, 'Failed to pause subscription');
    }
  }

  /**
   * Resume a paused subscription
   *
   * @param subscriptionId - Stripe subscription ID
   * @returns Updated subscription
   * @throws {PaymentGatewayError} If resuming fails
   */
  async resumeSubscription(
    subscriptionId: string
  ): Promise<SubscriptionResult> {
    try {
      logger.info({ subscriptionId }, 'Resuming Stripe subscription');

      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          pause_collection: null,
        }
      );

      logger.info({ subscriptionId }, 'Stripe subscription resumed');

      return this.mapSubscription(subscription);
    } catch (error) {
      logger.error({ error, subscriptionId }, 'Failed to resume subscription');
      throw this.handleStripeError(error, 'Failed to resume subscription');
    }
  }

  /**
   * Update subscription to a different price/plan
   *
   * @param subscriptionId - Stripe subscription ID
   * @param newPriceId - New price ID to switch to
   * @param prorationBehavior - How to handle proration (default: 'create_prorations')
   * @returns Updated subscription
   * @throws {PaymentGatewayError} If update fails
   *
   * @example
   * ```typescript
   * // Upgrade to annual plan with proration
   * await stripe.updateSubscription('sub_123', 'price_annual', 'create_prorations');
   *
   * // Change plan without proration
   * await stripe.updateSubscription('sub_123', 'price_new', 'none');
   * ```
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
    prorationBehavior: 'create_prorations' | 'none' | 'always_invoice' = 'create_prorations'
  ): Promise<SubscriptionResult> {
    try {
      logger.info(
        { subscriptionId, newPriceId, prorationBehavior },
        'Updating Stripe subscription'
      );

      // Get current subscription
      const currentSubscription = await this.stripe.subscriptions.retrieve(
        subscriptionId
      );

      // Update the subscription item with new price
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          items: [
            {
              id: currentSubscription.items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: prorationBehavior,
        }
      );

      logger.info({ subscriptionId, newPriceId }, 'Stripe subscription updated');

      return this.mapSubscription(subscription);
    } catch (error) {
      logger.error({ error, subscriptionId }, 'Failed to update subscription');
      throw this.handleStripeError(error, 'Failed to update subscription');
    }
  }

  /**
   * Create a payment intent for one-time payments
   *
   * @param params - Payment intent parameters
   * @returns Payment intent with client secret
   * @throws {PaymentGatewayError} If creation fails
   *
   * @example
   * ```typescript
   * const intent = await stripe.createPaymentIntent({
   *   amount: 5000, // $50.00
   *   currency: 'usd',
   *   customerId: 'cus_123',
   *   description: 'One-time consultation fee'
   * });
   * ```
   */
  async createPaymentIntent(
    params: PaymentIntentParams
  ): Promise<PaymentIntentResult> {
    try {
      logger.info({ params }, 'Creating Stripe payment intent');

      const intentParams: Stripe.PaymentIntentCreateParams = {
        amount: params.amount,
        currency: params.currency,
        customer: params.customerId,
        payment_method: params.paymentMethodId,
        description: params.description,
        metadata: params.metadata,
        capture_method: params.captureMethod || 'automatic',
        confirmation_method: params.confirmationMethod || 'automatic',
        setup_future_usage: params.setupFutureUsage,
      };

      const intent = await this.stripe.paymentIntents.create(intentParams);

      logger.info({ paymentIntentId: intent.id }, 'Stripe payment intent created');

      return {
        id: intent.id,
        clientSecret: intent.client_secret!,
        status: intent.status as any,
        amount: intent.amount,
        currency: intent.currency,
        customerId: intent.customer as string | undefined,
        paymentMethodId: intent.payment_method as string | undefined,
      };
    } catch (error) {
      logger.error({ error, params }, 'Failed to create payment intent');
      throw this.handleStripeError(error, 'Failed to create payment intent');
    }
  }

  /**
   * Get all payment methods for a customer
   *
   * @param customerId - Stripe customer ID
   * @returns List of payment methods
   * @throws {PaymentGatewayError} If retrieval fails
   */
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      logger.debug({ customerId }, 'Retrieving payment methods');

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      // Get customer to check default payment method
      const customer = await this.stripe.customers.retrieve(customerId);
      const defaultPaymentMethodId =
        typeof customer !== 'string' && !customer.deleted
          ? customer.invoice_settings.default_payment_method
          : null;

      return paymentMethods.data.map((pm) =>
        this.mapPaymentMethod(pm, pm.id === defaultPaymentMethodId)
      );
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to retrieve payment methods');
      throw this.handleStripeError(error, 'Failed to retrieve payment methods');
    }
  }

  /**
   * Attach a payment method to a customer
   *
   * @param customerId - Stripe customer ID
   * @param paymentMethodId - Payment method ID to attach
   * @returns Attached payment method
   * @throws {PaymentGatewayError} If attachment fails
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<PaymentMethod> {
    try {
      logger.info(
        { customerId, paymentMethodId },
        'Attaching payment method to customer'
      );

      const paymentMethod = await this.stripe.paymentMethods.attach(
        paymentMethodId,
        { customer: customerId }
      );

      logger.info(
        { customerId, paymentMethodId },
        'Payment method attached'
      );

      return this.mapPaymentMethod(paymentMethod);
    } catch (error) {
      logger.error(
        { error, customerId, paymentMethodId },
        'Failed to attach payment method'
      );
      throw this.handleStripeError(error, 'Failed to attach payment method');
    }
  }

  /**
   * Detach a payment method from a customer
   *
   * @param paymentMethodId - Payment method ID to detach
   * @throws {PaymentGatewayError} If detachment fails
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      logger.info({ paymentMethodId }, 'Detaching payment method');

      await this.stripe.paymentMethods.detach(paymentMethodId);

      logger.info({ paymentMethodId }, 'Payment method detached');
    } catch (error) {
      logger.error({ error, paymentMethodId }, 'Failed to detach payment method');
      throw this.handleStripeError(error, 'Failed to detach payment method');
    }
  }

  /**
   * Set default payment method for a customer
   *
   * @param customerId - Stripe customer ID
   * @param paymentMethodId - Payment method ID to set as default
   * @returns Updated customer
   * @throws {PaymentGatewayError} If setting default fails
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<CustomerResult> {
    try {
      logger.info(
        { customerId, paymentMethodId },
        'Setting default payment method'
      );

      const customer = await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      logger.info(
        { customerId, paymentMethodId },
        'Default payment method set'
      );

      return this.mapCustomer(customer);
    } catch (error) {
      logger.error(
        { error, customerId, paymentMethodId },
        'Failed to set default payment method'
      );
      throw this.handleStripeError(
        error,
        'Failed to set default payment method'
      );
    }
  }

  /**
   * Create a billing portal session for customer self-service
   *
   * @param customerId - Stripe customer ID
   * @param returnUrl - URL to return to after portal session
   * @returns Billing portal session with URL
   * @throws {PaymentGatewayError} If creation fails
   *
   * @example
   * ```typescript
   * const portal = await stripe.createBillingPortalSession(
   *   'cus_123',
   *   'https://example.com/settings/billing'
   * );
   * // Redirect user to portal.url
   * ```
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<BillingPortalSessionResult> {
    try {
      logger.info({ customerId, returnUrl }, 'Creating billing portal session');

      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      logger.info(
        { customerId, sessionId: session.id },
        'Billing portal session created'
      );

      return {
        id: session.id,
        url: session.url,
      };
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to create billing portal session');
      throw this.handleStripeError(
        error,
        'Failed to create billing portal session'
      );
    }
  }

  /**
   * Create a price for a product
   *
   * @param params - Price creation parameters
   * @returns Created price
   * @throws {PaymentGatewayError} If creation fails
   *
   * @example
   * ```typescript
   * const price = await stripe.createPrice({
   *   productId: 'prod_123',
   *   amount: 2999, // $29.99
   *   currency: 'usd',
   *   interval: 'month',
   *   nickname: 'Pro Monthly'
   * });
   * ```
   */
  async createPrice(params: CreatePriceParams): Promise<PriceResult> {
    try {
      logger.info({ params }, 'Creating Stripe price');

      const priceParams: Stripe.PriceCreateParams = {
        product: params.productId,
        unit_amount: params.amount,
        currency: params.currency,
        recurring: {
          interval: params.interval,
          interval_count: params.intervalCount || 1,
        },
        nickname: params.nickname,
        metadata: params.metadata,
      };

      const price = await this.stripe.prices.create(priceParams);

      logger.info({ priceId: price.id }, 'Stripe price created');

      return {
        id: price.id,
        productId: price.product as string,
        amount: price.unit_amount!,
        currency: price.currency,
        interval: price.recurring!.interval,
        intervalCount: price.recurring!.interval_count,
        active: price.active,
      };
    } catch (error) {
      logger.error({ error, params }, 'Failed to create price');
      throw this.handleStripeError(error, 'Failed to create price');
    }
  }

  /**
   * Sync a pricing plan to Stripe (create/update product and prices)
   *
   * @param plan - Pricing plan to sync
   * @throws {PaymentGatewayError} If sync fails
   *
   * @example
   * ```typescript
   * await stripe.syncProduct({
   *   id: 'plan_pro',
   *   name: 'Pro Plan',
   *   description: 'For growing teams',
   *   prices: [
   *     { amount: 2999, currency: 'usd', interval: 'month' },
   *     { amount: 29990, currency: 'usd', interval: 'year' }
   *   ],
   *   features: ['Unlimited chats', 'Advanced analytics'],
   *   isActive: true
   * });
   * ```
   */
  async syncProduct(plan: PricingPlan): Promise<void> {
    try {
      logger.info({ planId: plan.id }, 'Syncing product to Stripe');

      let productId = plan.productId;

      // Create or update product
      if (productId) {
        // Update existing product
        await this.stripe.products.update(productId, {
          name: plan.name,
          description: plan.description,
          active: plan.isActive,
          metadata: {
            planId: plan.id,
            features: JSON.stringify(plan.features),
          },
        });
        logger.info({ productId }, 'Stripe product updated');
      } else {
        // Create new product
        const product = await this.stripe.products.create({
          name: plan.name,
          description: plan.description,
          active: plan.isActive,
          metadata: {
            planId: plan.id,
            features: JSON.stringify(plan.features),
          },
        });
        productId = product.id;
        logger.info({ productId }, 'Stripe product created');
      }

      // Create or update prices
      for (const tier of plan.prices) {
        if (tier.priceId) {
          // Update existing price (by archiving and creating new one)
          await this.stripe.prices.update(tier.priceId, { active: false });
          logger.debug({ priceId: tier.priceId }, 'Archived old price');
        }

        // Create new price
        const price = await this.stripe.prices.create({
          product: productId,
          unit_amount: tier.amount,
          currency: tier.currency,
          recurring: {
            interval: tier.interval,
            interval_count: tier.intervalCount || 1,
            trial_period_days: tier.trialDays,
          },
          metadata: {
            planId: plan.id,
            tierId: tier.id || '',
          },
        });

        logger.info(
          { priceId: price.id, interval: tier.interval },
          'Stripe price created'
        );
      }

      logger.info({ planId: plan.id, productId }, 'Product synced to Stripe');
    } catch (error) {
      logger.error({ error, planId: plan.id }, 'Failed to sync product');
      throw this.handleStripeError(error, 'Failed to sync product');
    }
  }

  /**
   * Construct and verify a webhook event from Stripe
   *
   * @param body - Raw request body (string or Buffer)
   * @param signature - Stripe signature header
   * @returns Verified webhook event
   * @throws {PaymentGatewayError} If verification fails
   *
   * @example
   * ```typescript
   * // In your webhook handler:
   * const event = await stripe.constructWebhookEvent(
   *   req.body,
   *   req.headers['stripe-signature']
   * );
   * await stripe.handleWebhookEvent(event);
   * ```
   */
  async constructWebhookEvent(
    body: string | Buffer,
    signature: string
  ): Promise<WebhookEvent> {
    try {
      if (!this.webhookSecret) {
        throw new PaymentGatewayError(
          'Webhook secret is not configured',
          'MISSING_WEBHOOK_SECRET',
          500
        );
      }

      logger.debug('Constructing webhook event');

      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret
      );

      logger.info({ eventType: event.type, eventId: event.id }, 'Webhook event verified');

      return {
        id: event.id,
        type: event.type as WebhookEventType,
        data: event.data.object,
        createdAt: new Date(event.created * 1000),
        raw: event,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to construct webhook event');
      throw this.handleStripeError(error, 'Invalid webhook signature');
    }
  }

  /**
   * Handle a webhook event (process based on event type)
   *
   * @param event - Webhook event to handle
   * @throws {PaymentGatewayError} If handling fails
   */
  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      logger.info({ eventType: event.type, eventId: event.id }, 'Handling webhook event');

      switch (event.type) {
        case WebhookEventType.CHECKOUT_COMPLETED:
          await this.handleCheckoutCompleted(event);
          break;

        case WebhookEventType.SUBSCRIPTION_CREATED:
        case WebhookEventType.SUBSCRIPTION_UPDATED:
          await this.handleSubscriptionUpdated(event);
          break;

        case WebhookEventType.SUBSCRIPTION_DELETED:
          await this.handleSubscriptionDeleted(event);
          break;

        case WebhookEventType.PAYMENT_SUCCEEDED:
          await this.handlePaymentSucceeded(event);
          break;

        case WebhookEventType.PAYMENT_FAILED:
          await this.handlePaymentFailed(event);
          break;

        case WebhookEventType.INVOICE_PAID:
          await this.handleInvoicePaid(event);
          break;

        case WebhookEventType.INVOICE_PAYMENT_FAILED:
          await this.handleInvoicePaymentFailed(event);
          break;

        default:
          logger.debug({ eventType: event.type }, 'Unhandled webhook event type');
      }

      logger.info({ eventType: event.type, eventId: event.id }, 'Webhook event handled');
    } catch (error) {
      logger.error({ error, event }, 'Failed to handle webhook event');
      throw this.handleStripeError(error, 'Failed to handle webhook event');
    }
  }

  /**
   * Handle checkout session completed event
   * Override this method to implement custom logic
   */
  protected async handleCheckoutCompleted(event: WebhookEvent): Promise<void> {
    const session = event.data as Stripe.Checkout.Session;
    logger.info(
      { sessionId: session.id, customerId: session.customer },
      'Checkout session completed'
    );
    // Implement your business logic here (e.g., activate subscription, send confirmation email)
  }

  /**
   * Handle subscription updated event
   * Override this method to implement custom logic
   */
  protected async handleSubscriptionUpdated(event: WebhookEvent): Promise<void> {
    const subscription = event.data as Stripe.Subscription;
    logger.info(
      { subscriptionId: subscription.id, status: subscription.status },
      'Subscription updated'
    );
    // Implement your business logic here (e.g., update database, notify user)
  }

  /**
   * Handle subscription deleted event
   * Override this method to implement custom logic
   */
  protected async handleSubscriptionDeleted(event: WebhookEvent): Promise<void> {
    const subscription = event.data as Stripe.Subscription;
    logger.info(
      { subscriptionId: subscription.id },
      'Subscription deleted'
    );
    // Implement your business logic here (e.g., revoke access, send cancellation email)
  }

  /**
   * Handle payment succeeded event
   * Override this method to implement custom logic
   */
  protected async handlePaymentSucceeded(event: WebhookEvent): Promise<void> {
    const paymentIntent = event.data as Stripe.PaymentIntent;
    logger.info(
      { paymentIntentId: paymentIntent.id, amount: paymentIntent.amount },
      'Payment succeeded'
    );
    // Implement your business logic here (e.g., fulfill order, send receipt)
  }

  /**
   * Handle payment failed event
   * Override this method to implement custom logic
   */
  protected async handlePaymentFailed(event: WebhookEvent): Promise<void> {
    const paymentIntent = event.data as Stripe.PaymentIntent;
    logger.warn(
      { paymentIntentId: paymentIntent.id },
      'Payment failed'
    );
    // Implement your business logic here (e.g., notify user, retry payment)
  }

  /**
   * Handle invoice paid event
   * Override this method to implement custom logic
   */
  protected async handleInvoicePaid(event: WebhookEvent): Promise<void> {
    const invoice = event.data as Stripe.Invoice;
    logger.info(
      { invoiceId: invoice.id, amount: invoice.amount_paid },
      'Invoice paid'
    );
    // Implement your business logic here (e.g., send invoice receipt)
  }

  /**
   * Handle invoice payment failed event
   * Override this method to implement custom logic
   */
  protected async handleInvoicePaymentFailed(event: WebhookEvent): Promise<void> {
    const invoice = event.data as Stripe.Invoice;
    logger.warn(
      { invoiceId: invoice.id },
      'Invoice payment failed'
    );
    // Implement your business logic here (e.g., notify user, suspend service)
  }

  /**
   * Map Stripe customer to CustomerResult
   */
  private mapCustomer(customer: Stripe.Customer): CustomerResult {
    return {
      id: customer.id,
      email: customer.email!,
      name: customer.name || undefined,
      metadata: customer.metadata,
      defaultPaymentMethodId:
        typeof customer.invoice_settings.default_payment_method === 'string'
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings.default_payment_method?.id,
    };
  }

  /**
   * Map Stripe subscription to SubscriptionResult
   */
  private mapSubscription(subscription: Stripe.Subscription): SubscriptionResult {
    return {
      id: subscription.id,
      customerId: subscription.customer as string,
      status: subscription.status as SubscriptionStatus,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : undefined,
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : undefined,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined,
      items: subscription.items.data.map((item) => ({
        id: item.id,
        priceId: item.price.id,
        quantity: item.quantity || 1,
      })),
      metadata: subscription.metadata,
    };
  }

  /**
   * Map Stripe payment method to PaymentMethod
   */
  private mapPaymentMethod(
    pm: Stripe.PaymentMethod,
    isDefault: boolean = false
  ): PaymentMethod {
    return {
      id: pm.id,
      type: pm.type,
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        : undefined,
      billingDetails: pm.billing_details
        ? {
            name: pm.billing_details.name || undefined,
            email: pm.billing_details.email || undefined,
            phone: pm.billing_details.phone || undefined,
            address: pm.billing_details.address
              ? {
                  city: pm.billing_details.address.city || undefined,
                  country: pm.billing_details.address.country || undefined,
                  line1: pm.billing_details.address.line1 || undefined,
                  line2: pm.billing_details.address.line2 || undefined,
                  postalCode: pm.billing_details.address.postal_code || undefined,
                  state: pm.billing_details.address.state || undefined,
                }
              : undefined,
          }
        : undefined,
      isDefault,
    };
  }

  /**
   * Handle Stripe errors and convert to PaymentGatewayError
   */
  private handleStripeError(error: any, message: string): PaymentGatewayError {
    if (error instanceof Stripe.errors.StripeError) {
      return new PaymentGatewayError(
        message + ': ' + error.message,
        error.code || error.type,
        error.statusCode,
        {
          type: error.type,
          raw: error.raw,
        }
      );
    }

    if (error instanceof PaymentGatewayError) {
      return error;
    }

    return new PaymentGatewayError(
      message + ': ' + (error.message || 'Unknown error'),
      'UNKNOWN_ERROR',
      500,
      error
    );
  }
}

/**
 * Create and export a singleton instance of the Stripe Payment Gateway
 *
 * @example
 * ```typescript
 * import { stripeGateway } from './services/payments/stripe';
 *
 * const customer = await stripeGateway.createCustomer(
 *   'org_123',
 *   'customer@example.com'
 * );
 * ```
 */
export const stripeGateway = new StripePaymentGateway(
  process.env.STRIPE_SECRET_KEY || '',
  process.env.STRIPE_WEBHOOK_SECRET
);
