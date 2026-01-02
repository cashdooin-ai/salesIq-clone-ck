/**
 * Payment Gateway Types
 *
 * Shared types and interfaces for all payment gateway implementations.
 * This provides a consistent API across different payment providers (Stripe, PayPal, etc.)
 */

import Stripe from 'stripe';

/**
 * Pricing plan structure
 */
export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  productId?: string; // External product ID from payment gateway
  prices: PricingTier[];
  features: string[];
  isActive: boolean;
}

/**
 * Pricing tier for a plan (monthly, yearly, etc.)
 */
export interface PricingTier {
  id?: string;
  priceId?: string; // External price ID from payment gateway
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  trialDays?: number;
}

/**
 * Parameters for creating a checkout session
 */
export interface CheckoutSessionParams {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  promoCode?: string;
  quantity?: number;
  allowPromotionCodes?: boolean;
  billingAddressCollection?: 'auto' | 'required';
  metadata?: Record<string, string>;
  mode?: 'payment' | 'subscription' | 'setup';
  trialDays?: number;
}

/**
 * Result from creating a checkout session
 */
export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  expiresAt: Date;
}

/**
 * Parameters for creating a subscription
 */
export interface SubscriptionParams {
  customerId: string;
  priceId: string;
  trialDays?: number;
  quantity?: number;
  metadata?: Record<string, string>;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  paymentBehavior?: 'default_incomplete' | 'error_if_incomplete' | 'allow_incomplete' | 'pending_if_incomplete';
  defaultPaymentMethod?: string;
  items?: Array<{
    priceId: string;
    quantity?: number;
  }>;
}

/**
 * Subscription result
 */
export interface SubscriptionResult {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  items: SubscriptionItem[];
  metadata?: Record<string, string>;
}

/**
 * Subscription item
 */
export interface SubscriptionItem {
  id: string;
  priceId: string;
  quantity: number;
}

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

/**
 * Parameters for creating a payment intent
 */
export interface PaymentIntentParams {
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  captureMethod?: 'automatic' | 'manual';
  confirmationMethod?: 'automatic' | 'manual';
  setupFutureUsage?: 'on_session' | 'off_session';
}

/**
 * Payment intent result
 */
export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  status: PaymentIntentStatus;
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
}

/**
 * Payment intent status
 */
export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

/**
 * Payment method information
 */
export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postalCode?: string;
      state?: string;
    };
  };
  isDefault?: boolean;
}

/**
 * Parameters for creating a price
 */
export interface CreatePriceParams {
  productId: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  nickname?: string;
  metadata?: Record<string, string>;
}

/**
 * Price result
 */
export interface PriceResult {
  id: string;
  productId: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  active: boolean;
}

/**
 * Customer information
 */
export interface CustomerResult {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
  defaultPaymentMethodId?: string;
}

/**
 * Billing portal session result
 */
export interface BillingPortalSessionResult {
  id: string;
  url: string;
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  CHECKOUT_COMPLETED = 'checkout.session.completed',
  CHECKOUT_EXPIRED = 'checkout.session.expired',
  SUBSCRIPTION_CREATED = 'customer.subscription.created',
  SUBSCRIPTION_UPDATED = 'customer.subscription.updated',
  SUBSCRIPTION_DELETED = 'customer.subscription.deleted',
  SUBSCRIPTION_TRIAL_ENDING = 'customer.subscription.trial_will_end',
  PAYMENT_SUCCEEDED = 'payment_intent.succeeded',
  PAYMENT_FAILED = 'payment_intent.payment_failed',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
  INVOICE_UPCOMING = 'invoice.upcoming',
  PAYMENT_METHOD_ATTACHED = 'payment_method.attached',
  PAYMENT_METHOD_DETACHED = 'payment_method.detached',
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
}

/**
 * Webhook event
 */
export interface WebhookEvent {
  id: string;
  type: WebhookEventType | string;
  data: any;
  createdAt: Date;
  raw?: Stripe.Event;
}

/**
 * Payment Gateway Interface
 *
 * All payment gateway implementations should implement this interface
 * to ensure consistency across different providers.
 */
export interface PaymentGatewayInterface {
  /**
   * Create a customer in the payment gateway
   */
  createCustomer(
    organizationId: string,
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<CustomerResult>;

  /**
   * Get customer by ID
   */
  getCustomer(customerId: string): Promise<CustomerResult>;

  /**
   * Update customer information
   */
  updateCustomer(
    customerId: string,
    data: {
      email?: string;
      name?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<CustomerResult>;

  /**
   * Delete a customer
   */
  deleteCustomer(customerId: string): Promise<void>;

  /**
   * Create a checkout session for subscription or one-time payment
   */
  createCheckoutSession(
    params: CheckoutSessionParams
  ): Promise<CheckoutSessionResult>;

  /**
   * Create a subscription
   */
  createSubscription(
    params: SubscriptionParams
  ): Promise<SubscriptionResult>;

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): Promise<SubscriptionResult>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(
    subscriptionId: string,
    immediate: boolean
  ): Promise<SubscriptionResult>;

  /**
   * Pause a subscription
   */
  pauseSubscription(subscriptionId: string): Promise<SubscriptionResult>;

  /**
   * Resume a paused subscription
   */
  resumeSubscription(subscriptionId: string): Promise<SubscriptionResult>;

  /**
   * Update a subscription to a different price
   */
  updateSubscription(
    subscriptionId: string,
    newPriceId: string,
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
  ): Promise<SubscriptionResult>;

  /**
   * Create a payment intent for one-time payments
   */
  createPaymentIntent(
    params: PaymentIntentParams
  ): Promise<PaymentIntentResult>;

  /**
   * Get payment methods for a customer
   */
  getPaymentMethods(customerId: string): Promise<PaymentMethod[]>;

  /**
   * Attach a payment method to a customer
   */
  attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<PaymentMethod>;

  /**
   * Detach a payment method from a customer
   */
  detachPaymentMethod(paymentMethodId: string): Promise<void>;

  /**
   * Set default payment method for a customer
   */
  setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<CustomerResult>;

  /**
   * Create a billing portal session for customer to manage subscription
   */
  createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<BillingPortalSessionResult>;

  /**
   * Create a price for a product
   */
  createPrice(params: CreatePriceParams): Promise<PriceResult>;

  /**
   * Sync a pricing plan to the payment gateway
   * Creates or updates products and prices
   */
  syncProduct(plan: PricingPlan): Promise<void>;

  /**
   * Construct and verify a webhook event
   */
  constructWebhookEvent(
    body: string | Buffer,
    signature: string
  ): Promise<WebhookEvent>;

  /**
   * Handle a webhook event
   */
  handleWebhookEvent(event: WebhookEvent): Promise<void>;
}

/**
 * Payment gateway error
 */
export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}
