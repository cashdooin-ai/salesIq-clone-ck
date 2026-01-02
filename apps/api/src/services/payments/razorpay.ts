import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../../config/index.js';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface RazorpayCustomer {
  id: string;
  entity: string;
  name: string;
  email: string;
  contact?: string;
  gstin?: string;
  notes?: Record<string, string>;
  created_at: number;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes?: Record<string, string>;
  created_at: number;
}

export interface RazorpaySubscription {
  id: string;
  entity: string;
  plan_id: string;
  customer_id: string;
  status: 'created' | 'authenticated' | 'active' | 'paused' | 'halted' | 'cancelled' | 'completed' | 'expired';
  current_start?: number;
  current_end?: number;
  ended_at?: number;
  quantity: number;
  notes?: Record<string, string>;
  charge_at?: number;
  start_at?: number;
  end_at?: number;
  auth_attempts: number;
  total_count: number;
  paid_count: number;
  customer_notify: number;
  created_at: number;
  expire_by?: number;
  short_url: string;
  has_scheduled_changes: boolean;
  change_scheduled_at?: number;
  source?: string;
  payment_method?: string;
}

export interface RazorpayPlan {
  id: string;
  entity: string;
  interval: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  item: {
    id: string;
    active: boolean;
    name: string;
    description?: string;
    amount: number;
    unit_amount: number;
    currency: string;
    type: string;
  };
  notes?: Record<string, string>;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id?: string;
  invoice_id?: string;
  international: boolean;
  method: 'card' | 'netbanking' | 'wallet' | 'emi' | 'upi' | 'cardless_emi' | 'paylater' | 'bank_transfer';
  amount_refunded: number;
  refund_status?: 'null' | 'partial' | 'full';
  captured: boolean;
  description?: string;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email?: string;
  contact?: string;
  customer_id?: string;
  notes?: Record<string, string>;
  fee?: number;
  tax?: number;
  error_code?: string;
  error_description?: string;
  error_source?: string;
  error_step?: string;
  error_reason?: string;
  acquirer_data?: Record<string, any>;
  created_at: number;
}

export interface RazorpayRefund {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  notes?: Record<string, string>;
  receipt?: string;
  acquirer_data?: Record<string, any>;
  created_at: number;
  batch_id?: string;
  status: 'pending' | 'processed' | 'failed';
  speed_processed: 'normal' | 'instant';
  speed_requested: 'normal' | 'optimum';
}

export interface RazorpayInvoice {
  id: string;
  entity: string;
  receipt?: string;
  invoice_number?: string;
  customer_id: string;
  customer_details: {
    id: string;
    name: string;
    email: string;
    contact: string;
    gstin?: string;
    billing_address?: any;
    shipping_address?: any;
  };
  order_id?: string;
  line_items: Array<{
    id?: string;
    item_id?: string;
    name: string;
    description?: string;
    amount: number;
    unit_amount: number;
    gross_amount: number;
    tax_amount: number;
    taxable_amount: number;
    net_amount: number;
    currency: string;
    type: string;
    tax_inclusive: boolean;
    hsn_code?: string;
    sac_code?: string;
    tax_rate?: number;
    unit?: string;
    quantity?: number;
    taxes?: Array<{
      tax_type?: string;
      rate?: number;
      amount?: number;
    }>;
  }>;
  payment_id?: string;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled' | 'expired' | 'deleted';
  expire_by?: number;
  issued_at?: number;
  paid_at?: number;
  cancelled_at?: number;
  expired_at?: number;
  sms_status?: string;
  email_status?: string;
  date?: number;
  terms?: string;
  partial_payment: boolean;
  gross_amount: number;
  tax_amount: number;
  taxable_amount: number;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  currency_symbol: string;
  description?: string;
  notes?: Record<string, string>;
  comment?: string;
  short_url: string;
  view_less: boolean;
  billing_start?: number;
  billing_end?: number;
  type: 'invoice' | 'link';
  group_taxes_discounts: boolean;
  created_at: number;
  idempotency_key?: string;
}

export interface RazorpayVirtualAccount {
  id: string;
  name: string;
  entity: string;
  status: 'active' | 'closed';
  description?: string;
  amount_expected?: number;
  notes?: Record<string, string>;
  amount_paid: number;
  customer_id?: string;
  receivers: Array<{
    id: string;
    entity: string;
    ifsc?: string;
    bank_name?: string;
    name?: string;
    notes?: Record<string, string>;
    account_number?: string;
    address?: string;
    username?: string;
  }>;
  close_by?: number;
  closed_at?: number;
  created_at: number;
}

export interface RazorpayQRCode {
  id: string;
  entity: string;
  created_at: number;
  name: string;
  usage: 'single_use' | 'multiple_use';
  type: 'upi_qr';
  image_url: string;
  payment_amount?: number;
  status: 'active' | 'closed';
  description?: string;
  fixed_amount: boolean;
  payments_amount_received: number;
  payments_count_received: number;
  notes?: Record<string, string>;
  customer_id?: string;
  close_by?: number;
  closed_at?: number;
}

export interface UpiIntentOptions {
  amount: number;
  currency: string;
  receipt: string;
  description?: string;
  customer?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  notes?: Record<string, string>;
}

export interface UpiCollectOptions {
  amount: number;
  currency: string;
  vpa: string;
  receipt: string;
  description?: string;
  customer?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  notes?: Record<string, string>;
}

export interface BankAccountValidationResult {
  valid: boolean;
  name_at_bank?: string;
  account_number?: string;
  ifsc?: string;
  error?: string;
}

export interface GSTInvoiceOptions {
  customer_id: string;
  line_items: Array<{
    name: string;
    description?: string;
    amount: number;
    currency: string;
    quantity?: number;
    hsn_code?: string;
    sac_code?: string;
    tax_rate?: number;
    tax_inclusive?: boolean;
  }>;
  supply_state_code?: string;
  customer_gstin?: string;
  description?: string;
  notes?: Record<string, string>;
}

// ============================================
// RAZORPAY SERVICE CLASS
// ============================================

class RazorpayService {
  private razorpay: Razorpay | null = null;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = config.isDev;
    this.initializeRazorpay();
  }

  /**
   * Initialize Razorpay instance with API credentials
   */
  private initializeRazorpay() {
    try {
      const keyId = config.razorpay?.keyId;
      const keySecret = config.razorpay?.keySecret;

      if (!keyId || !keySecret) {
        console.warn('[Razorpay Service] Credentials not configured. Payment features will be limited.');
        if (!this.isDevelopment) {
          throw new Error('Razorpay credentials are required in production');
        }
        return;
      }

      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      console.log('[Razorpay Service] Initialized successfully');
    } catch (error) {
      console.error('[Razorpay Service] Failed to initialize:', error);
      this.razorpay = null;
    }
  }

  /**
   * Ensure Razorpay is initialized before operations
   */
  private ensureInitialized() {
    if (!this.razorpay) {
      throw new Error('Razorpay is not initialized. Please check your configuration.');
    }
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  /**
   * Create a new Razorpay customer
   */
  async createCustomer(
    organizationId: string,
    email: string,
    name: string,
    contact?: string,
    gstin?: string
  ): Promise<RazorpayCustomer> {
    this.ensureInitialized();

    try {
      const customer = await this.razorpay!.customers.create({
        name,
        email,
        contact,
        gstin,
        notes: {
          organization_id: organizationId,
          created_via: 'nexvo_api',
        },
        fail_existing: '0', // Return existing customer if email matches
      });

      console.log('[Razorpay Service] Customer created:', customer.id);
      return customer as RazorpayCustomer;
    } catch (error) {
      console.error('[Razorpay Service] Failed to create customer:', error);
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch customer details
   */
  async fetchCustomer(customerId: string): Promise<RazorpayCustomer> {
    this.ensureInitialized();

    try {
      const customer = await this.razorpay!.customers.fetch(customerId);
      return customer as RazorpayCustomer;
    } catch (error) {
      console.error('[Razorpay Service] Failed to fetch customer:', error);
      throw new Error(`Failed to fetch customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Edit customer details
   */
  async editCustomer(
    customerId: string,
    updates: {
      name?: string;
      email?: string;
      contact?: string;
      gstin?: string;
      notes?: Record<string, string>;
    }
  ): Promise<RazorpayCustomer> {
    this.ensureInitialized();

    try {
      const customer = await this.razorpay!.customers.edit(customerId, updates);
      console.log('[Razorpay Service] Customer updated:', customerId);
      return customer as RazorpayCustomer;
    } catch (error) {
      console.error('[Razorpay Service] Failed to edit customer:', error);
      throw new Error(`Failed to edit customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  /**
   * Create a new order for payment
   */
  async createOrder(
    amount: number,
    currency: string = 'INR',
    receipt: string,
    notes?: Record<string, string>
  ): Promise<RazorpayOrder> {
    this.ensureInitialized();

    try {
      // Amount should be in paise (smallest currency unit)
      const amountInPaise = Math.round(amount * 100);

      const order = await this.razorpay!.orders.create({
        amount: amountInPaise,
        currency,
        receipt,
        notes: {
          ...notes,
          created_via: 'nexvo_api',
        },
      });

      console.log('[Razorpay Service] Order created:', order.id);
      return order as RazorpayOrder;
    } catch (error) {
      console.error('[Razorpay Service] Failed to create order:', error);
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch order details
   */
  async fetchOrder(orderId: string): Promise<RazorpayOrder> {
    this.ensureInitialized();

    try {
      const order = await this.razorpay!.orders.fetch(orderId);
      return order as RazorpayOrder;
    } catch (error) {
      console.error('[Razorpay Service] Failed to fetch order:', error);
      throw new Error(`Failed to fetch order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch all payments for an order
   */
  async fetchOrderPayments(orderId: string): Promise<RazorpayPayment[]> {
    this.ensureInitialized();

    try {
      const payments = await this.razorpay!.orders.fetchPayments(orderId);
      return payments.items as RazorpayPayment[];
    } catch (error) {
      console.error('[Razorpay Service] Failed to fetch order payments:', error);
      throw new Error(`Failed to fetch order payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Create a new subscription
   */
  async createSubscription(
    planId: string,
    customerId: string,
    totalCount?: number,
    startAt?: number,
    options?: {
      quantity?: number;
      addons?: Array<{ item: { name: string; amount: number; currency: string } }>;
      notes?: Record<string, string>;
      notify?: boolean;
      offer_id?: string;
    }
  ): Promise<RazorpaySubscription> {
    this.ensureInitialized();

    try {
      const subscription = await this.razorpay!.subscriptions.create({
        plan_id: planId,
        customer_id: customerId,
        total_count: totalCount,
        start_at: startAt,
        quantity: options?.quantity || 1,
        addons: options?.addons,
        notes: {
          ...options?.notes,
          created_via: 'nexvo_api',
        },
        customer_notify: options?.notify ? 1 : 0,
        offer_id: options?.offer_id,
      });

      console.log('[Razorpay Service] Subscription created:', subscription.id);
      return subscription as RazorpaySubscription;
    } catch (error) {
      console.error('[Razorpay Service] Failed to create subscription:', error);
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = false): Promise<RazorpaySubscription> {
    this.ensureInitialized();

    try {
      const subscription = await this.razorpay!.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
      console.log('[Razorpay Service] Subscription cancelled:', subscriptionId);
      return subscription as RazorpaySubscription;
    } catch (error) {
      console.error('[Razorpay Service] Failed to cancel subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(subscriptionId: string, pauseAt?: 'now' | number): Promise<RazorpaySubscription> {
    this.ensureInitialized();

    try {
      const subscription = await this.razorpay!.subscriptions.pause(subscriptionId, {
        pause_at: pauseAt || 'now',
      });
      console.log('[Razorpay Service] Subscription paused:', subscriptionId);
      return subscription as RazorpaySubscription;
    } catch (error) {
      console.error('[Razorpay Service] Failed to pause subscription:', error);
      throw new Error(`Failed to pause subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resume a subscription
   */
  async resumeSubscription(subscriptionId: string, resumeAt?: 'now' | number): Promise<RazorpaySubscription> {
    this.ensureInitialized();

    try {
      const subscription = await this.razorpay!.subscriptions.resume(subscriptionId, {
        resume_at: resumeAt || 'now',
      });
      console.log('[Razorpay Service] Subscription resumed:', subscriptionId);
      return subscription as RazorpaySubscription;
    } catch (error) {
      console.error('[Razorpay Service] Failed to resume subscription:', error);
      throw new Error(`Failed to resume subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch subscription details
   */
  async fetchSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
    this.ensureInitialized();

    try {
      const subscription = await this.razorpay!.subscriptions.fetch(subscriptionId);
      return subscription as RazorpaySubscription;
    } catch (error) {
      console.error('[Razorpay Service] Failed to fetch subscription:', error);
      throw new Error(`Failed to fetch subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // PLAN MANAGEMENT
  // ============================================

  /**
   * Create a subscription plan
   */
  async createPlan(
    planName: string,
    amount: number,
    currency: string,
    interval: number,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    description?: string
  ): Promise<RazorpayPlan> {
    this.ensureInitialized();

    try {
      // Amount should be in paise
      const amountInPaise = Math.round(amount * 100);

      const plan = await this.razorpay!.plans.create({
        period,
        interval,
        item: {
          name: planName,
          description,
          amount: amountInPaise,
          currency,
        },
        notes: {
          created_via: 'nexvo_api',
        },
      });

      console.log('[Razorpay Service] Plan created:', plan.id);
      return plan as RazorpayPlan;
    } catch (error) {
      console.error('[Razorpay Service] Failed to create plan:', error);
      throw new Error(`Failed to create plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch plan details
   */
  async fetchPlan(planId: string): Promise<RazorpayPlan> {
    this.ensureInitialized();

    try {
      const plan = await this.razorpay!.plans.fetch(planId);
      return plan as RazorpayPlan;
    } catch (error) {
      console.error('[Razorpay Service] Failed to fetch plan:', error);
      throw new Error(`Failed to fetch plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // PAYMENT MANAGEMENT
  // ============================================

  /**
   * Fetch payment details
   */
  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    this.ensureInitialized();

    try {
      const payment = await this.razorpay!.payments.fetch(paymentId);
      return payment as RazorpayPayment;
    } catch (error) {
      console.error('[Razorpay Service] Failed to fetch payment:', error);
      throw new Error(`Failed to fetch payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Capture a payment (for authorized payments)
   */
  async capturePayment(paymentId: string, amount: number, currency: string = 'INR'): Promise<RazorpayPayment> {
    this.ensureInitialized();

    try {
      // Amount should be in paise
      const amountInPaise = Math.round(amount * 100);

      const payment = await this.razorpay!.payments.capture(paymentId, amountInPaise, currency);
      console.log('[Razorpay Service] Payment captured:', paymentId);
      return payment as RazorpayPayment;
    } catch (error) {
      console.error('[Razorpay Service] Failed to capture payment:', error);
      throw new Error(`Failed to capture payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    paymentId: string,
    amount?: number,
    notes?: Record<string, string>,
    speed?: 'normal' | 'optimum'
  ): Promise<RazorpayRefund> {
    this.ensureInitialized();

    try {
      const refundData: any = {
        notes: {
          ...notes,
          refunded_via: 'nexvo_api',
        },
      };

      if (amount !== undefined) {
        // Amount should be in paise
        refundData.amount = Math.round(amount * 100);
      }

      if (speed) {
        refundData.speed = speed;
      }

      const refund = await this.razorpay!.payments.refund(paymentId, refundData);
      console.log('[Razorpay Service] Payment refunded:', paymentId);
      return refund as RazorpayRefund;
    } catch (error) {
      console.error('[Razorpay Service] Failed to refund payment:', error);
      throw new Error(`Failed to refund payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch all refunds for a payment
   */
  async fetchPaymentRefunds(paymentId: string): Promise<RazorpayRefund[]> {
    this.ensureInitialized();

    try {
      const refunds = await this.razorpay!.payments.fetchMultipleRefund(paymentId);
      return refunds.items as RazorpayRefund[];
    } catch (error) {
      console.error('[Razorpay Service] Failed to fetch refunds:', error);
      throw new Error(`Failed to fetch refunds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // SIGNATURE VERIFICATION
  // ============================================

  /**
   * Verify payment signature for order payment
   */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    try {
      const keySecret = config.razorpay?.keySecret;
      if (!keySecret) {
        throw new Error('Razorpay key secret not configured');
      }

      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValid = generatedSignature === signature;

      if (isValid) {
        console.log('[Razorpay Service] Payment signature verified successfully');
      } else {
        console.error('[Razorpay Service] Payment signature verification failed');
      }

      return isValid;
    } catch (error) {
      console.error('[Razorpay Service] Failed to verify payment signature:', error);
      return false;
    }
  }

  /**
   * Verify subscription signature
   */
  verifySubscriptionSignature(subscriptionId: string, paymentId: string, signature: string): boolean {
    try {
      const keySecret = config.razorpay?.keySecret;
      if (!keySecret) {
        throw new Error('Razorpay key secret not configured');
      }

      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${paymentId}|${subscriptionId}`)
        .digest('hex');

      const isValid = generatedSignature === signature;

      if (isValid) {
        console.log('[Razorpay Service] Subscription signature verified successfully');
      } else {
        console.error('[Razorpay Service] Subscription signature verification failed');
      }

      return isValid;
    } catch (error) {
      console.error('[Razorpay Service] Failed to verify subscription signature:', error);
      return false;
    }
  }

  // ============================================
  // INVOICE MANAGEMENT
  // ============================================

  /**
   * Create an invoice
   */
  async createInvoice(
    customerId: string,
    lineItems: Array<{
      name: string;
      description?: string;
      amount: number;
      currency: string;
      quantity?: number;
    }>,
    description?: string,
    options?: {
      type?: 'invoice' | 'link';
      date?: number;
      expire_by?: number;
      sms_notify?: boolean;
      email_notify?: boolean;
      partial_payment?: boolean;
      customer_gstin?: string;
      supply_state_code?: string;
      notes?: Record<string, string>;
    }
  ): Promise<RazorpayInvoice> {
    this.ensureInitialized();

    try {
      // Convert line items to proper format with amounts in paise
      const formattedLineItems = lineItems.map(item => ({
        name: item.name,
        description: item.description,
        amount: Math.round(item.amount * 100),
        currency: item.currency,
        quantity: item.quantity || 1,
      }));

      const invoiceData: any = {
        type: options?.type || 'invoice',
        customer_id: customerId,
        line_items: formattedLineItems,
        description,
        sms_notify: options?.sms_notify ? 1 : 0,
        email_notify: options?.email_notify ? 1 : 0,
        partial_payment: options?.partial_payment || false,
        notes: {
          ...options?.notes,
          created_via: 'nexvo_api',
        },
      };

      if (options?.date) {
        invoiceData.date = options.date;
      }

      if (options?.expire_by) {
        invoiceData.expire_by = options.expire_by;
      }

      if (options?.customer_gstin) {
        invoiceData.customer = {
          gstin: options.customer_gstin,
        };
      }

      if (options?.supply_state_code) {
        invoiceData.supply_state_code = options.supply_state_code;
      }

      const invoice = await this.razorpay!.invoices.create(invoiceData);
      console.log('[Razorpay Service] Invoice created:', invoice.id);
      return invoice as RazorpayInvoice;
    } catch (error) {
      console.error('[Razorpay Service] Failed to create invoice:', error);
      throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a GST-compliant invoice
   */
  async createGSTInvoice(options: GSTInvoiceOptions): Promise<RazorpayInvoice> {
    this.ensureInitialized();

    try {
      const formattedLineItems = options.line_items.map(item => {
        const lineItem: any = {
          name: item.name,
          amount: Math.round(item.amount * 100),
          currency: item.currency,
          quantity: item.quantity || 1,
        };

        if (item.description) {
          lineItem.description = item.description;
        }

        if (item.hsn_code) {
          lineItem.hsn_code = item.hsn_code;
        }

        if (item.sac_code) {
          lineItem.sac_code = item.sac_code;
        }

        if (item.tax_rate !== undefined) {
          lineItem.tax_rate = item.tax_rate;
        }

        if (item.tax_inclusive !== undefined) {
          lineItem.tax_inclusive = item.tax_inclusive;
        }

        return lineItem;
      });

      const invoiceData: any = {
        type: 'invoice',
        customer_id: options.customer_id,
        line_items: formattedLineItems,
        description: options.description,
        notes: {
          ...options.notes,
          created_via: 'nexvo_api',
          gst_invoice: 'true',
        },
      };

      if (options.customer_gstin) {
        invoiceData.customer = {
          gstin: options.customer_gstin,
        };
      }

      if (options.supply_state_code) {
        invoiceData.supply_state_code = options.supply_state_code;
      }

      const invoice = await this.razorpay!.invoices.create(invoiceData);
      console.log('[Razorpay Service] GST Invoice created:', invoice.id);
      return invoice as RazorpayInvoice;
    } catch (error) {
      console.error('[Razorpay Service] Failed to create GST invoice:', error);
      throw new Error(`Failed to create GST invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch invoice details
   */
  async fetchInvoice(invoiceId: string): Promise<RazorpayInvoice> {
    this.ensureInitialized();

    try {
      const invoice = await this.razorpay!.invoices.fetch(invoiceId);
      return invoice as RazorpayInvoice;
    } catch (error) {
      console.error('[Razorpay Service] Failed to fetch invoice:', error);
      throw new Error(`Failed to fetch invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: string): Promise<RazorpayInvoice> {
    this.ensureInitialized();

    try {
      const invoice = await this.razorpay!.invoices.cancel(invoiceId);
      console.log('[Razorpay Service] Invoice cancelled:', invoiceId);
      return invoice as RazorpayInvoice;
    } catch (error) {
      console.error('[Razorpay Service] Failed to cancel invoice:', error);
      throw new Error(`Failed to cancel invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // VIRTUAL ACCOUNT MANAGEMENT
  // ============================================

  /**
   * Create a virtual account for collecting payments
   */
  async createVirtualAccount(
    customerId: string,
    receivers: Array<'bank_account' | 'vpa'>,
    options?: {
      description?: string;
      amount_expected?: number;
      notes?: Record<string, string>;
      close_by?: number;
    }
  ): Promise<RazorpayVirtualAccount> {
    this.ensureInitialized();

    try {
      const receiverTypes = receivers.map(type => ({ types: [type] }));

      const virtualAccountData: any = {
        receivers: receiverTypes,
        description: options?.description,
        customer_id: customerId,
        notes: {
          ...options?.notes,
          created_via: 'nexvo_api',
        },
      };

      if (options?.amount_expected !== undefined) {
        virtualAccountData.amount_expected = Math.round(options.amount_expected * 100);
      }

      if (options?.close_by) {
        virtualAccountData.close_by = options.close_by;
      }

      const virtualAccount = await this.razorpay!.virtualAccounts.create(virtualAccountData);
      console.log('[Razorpay Service] Virtual account created:', virtualAccount.id);
      return virtualAccount as RazorpayVirtualAccount;
    } catch (error) {
      console.error('[Razorpay Service] Failed to create virtual account:', error);
      throw new Error(`Failed to create virtual account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch virtual account details
   */
  async fetchVirtualAccount(virtualAccountId: string): Promise<RazorpayVirtualAccount> {
    this.ensureInitialized();

    try {
      const virtualAccount = await this.razorpay!.virtualAccounts.fetch(virtualAccountId);
      return virtualAccount as RazorpayVirtualAccount;
    } catch (error) {
      console.error('[Razorpay Service] Failed to fetch virtual account:', error);
      throw new Error(`Failed to fetch virtual account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close a virtual account
   */
  async closeVirtualAccount(virtualAccountId: string): Promise<RazorpayVirtualAccount> {
    this.ensureInitialized();

    try {
      const virtualAccount = await this.razorpay!.virtualAccounts.close(virtualAccountId);
      console.log('[Razorpay Service] Virtual account closed:', virtualAccountId);
      return virtualAccount as RazorpayVirtualAccount;
    } catch (error) {
      console.error('[Razorpay Service] Failed to close virtual account:', error);
      throw new Error(`Failed to close virtual account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // INDIA-SPECIFIC PAYMENT METHODS
  // ============================================

  /**
   * Create UPI intent payment (for mobile apps)
   */
  async createUPIIntent(options: UpiIntentOptions): Promise<RazorpayOrder> {
    this.ensureInitialized();

    try {
      const amountInPaise = Math.round(options.amount * 100);

      const order = await this.razorpay!.orders.create({
        amount: amountInPaise,
        currency: options.currency,
        receipt: options.receipt,
        notes: {
          ...options.notes,
          payment_method: 'upi_intent',
          created_via: 'nexvo_api',
        },
        method: 'upi',
      });

      console.log('[Razorpay Service] UPI Intent order created:', order.id);
      return order as RazorpayOrder;
    } catch (error) {
      console.error('[Razorpay Service] Failed to create UPI intent:', error);
      throw new Error(`Failed to create UPI intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create UPI collect request (for VPA)
   */
  async createUPICollect(options: UpiCollectOptions): Promise<RazorpayPayment> {
    this.ensureInitialized();

    try {
      const amountInPaise = Math.round(options.amount * 100);

      // First create an order
      const order = await this.razorpay!.orders.create({
        amount: amountInPaise,
        currency: options.currency,
        receipt: options.receipt,
        notes: {
          ...options.notes,
          payment_method: 'upi_collect',
          vpa: options.vpa,
          created_via: 'nexvo_api',
        },
      });

      console.log('[Razorpay Service] UPI Collect order created:', order.id);

      // Note: Actual UPI collect is initiated from client side with the VPA
      // This returns the order which can be used to initiate UPI collect
      return order as any;
    } catch (error) {
      console.error('[Razorpay Service] Failed to create UPI collect:', error);
      throw new Error(`Failed to create UPI collect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create QR code for payment collection
   */
  async createQRCode(options: {
    name: string;
    usage: 'single_use' | 'multiple_use';
    type: 'upi_qr';
    fixed_amount?: boolean;
    payment_amount?: number;
    description?: string;
    customer_id?: string;
    close_by?: number;
    notes?: Record<string, string>;
  }): Promise<RazorpayQRCode> {
    this.ensureInitialized();

    try {
      const qrData: any = {
        name: options.name,
        usage: options.usage,
        type: options.type,
        fixed_amount: options.fixed_amount || false,
        description: options.description,
        customer_id: options.customer_id,
        close_by: options.close_by,
        notes: {
          ...options.notes,
          created_via: 'nexvo_api',
        },
      };

      if (options.payment_amount !== undefined) {
        qrData.payment_amount = Math.round(options.payment_amount * 100);
      }

      const qrCode = await this.razorpay!.qrCode.create(qrData);
      console.log('[Razorpay Service] QR Code created:', qrCode.id);
      return qrCode as RazorpayQRCode;
    } catch (error) {
      console.error('[Razorpay Service] Failed to create QR code:', error);
      throw new Error(`Failed to create QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch QR code details
   */
  async fetchQRCode(qrCodeId: string): Promise<RazorpayQRCode> {
    this.ensureInitialized();

    try {
      const qrCode = await this.razorpay!.qrCode.fetch(qrCodeId);
      return qrCode as RazorpayQRCode;
    } catch (error) {
      console.error('[Razorpay Service] Failed to fetch QR code:', error);
      throw new Error(`Failed to fetch QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close a QR code
   */
  async closeQRCode(qrCodeId: string): Promise<RazorpayQRCode> {
    this.ensureInitialized();

    try {
      const qrCode = await this.razorpay!.qrCode.close(qrCodeId);
      console.log('[Razorpay Service] QR Code closed:', qrCodeId);
      return qrCode as RazorpayQRCode;
    } catch (error) {
      console.error('[Razorpay Service] Failed to close QR code:', error);
      throw new Error(`Failed to close QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate bank account details (IFSC, Account Number)
   */
  async validateBankAccount(
    accountNumber: string,
    ifsc: string,
    name?: string
  ): Promise<BankAccountValidationResult> {
    this.ensureInitialized();

    try {
      // Use Razorpay's fund account validation API
      const fundAccount = await this.razorpay!.fundAccount.create({
        contact_id: 'temp_contact', // Temporary contact for validation
        account_type: 'bank_account',
        bank_account: {
          name: name || 'Account Holder',
          ifsc,
          account_number: accountNumber,
        },
      });

      console.log('[Razorpay Service] Bank account validated successfully');
      return {
        valid: true,
        name_at_bank: (fundAccount as any).bank_account?.name,
        account_number: accountNumber,
        ifsc,
      };
    } catch (error) {
      console.error('[Razorpay Service] Bank account validation failed:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  // ============================================
  // WEBHOOK MANAGEMENT
  // ============================================

  /**
   * Construct and verify webhook event
   */
  constructWebhookEvent(body: string | Buffer, signature: string, secret?: string): any {
    try {
      const webhookSecret = secret || config.razorpay?.webhookSecret;
      if (!webhookSecret) {
        throw new Error('Webhook secret not configured');
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('[Razorpay Service] Webhook signature verification failed');
        throw new Error('Invalid webhook signature');
      }

      const event = typeof body === 'string' ? JSON.parse(body) : JSON.parse(body.toString());
      console.log('[Razorpay Service] Webhook event verified:', event.event);

      return event;
    } catch (error) {
      console.error('[Razorpay Service] Failed to construct webhook event:', error);
      throw new Error(`Failed to construct webhook event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Convert amount from rupees to paise
   */
  toPaise(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert amount from paise to rupees
   */
  toRupees(amount: number): number {
    return amount / 100;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string = 'INR'): string {
    const rupees = this.toRupees(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
    }).format(rupees);
  }

  /**
   * Generate receipt ID with prefix
   */
  generateReceiptId(prefix: string = 'RCPT'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const razorpayService = new RazorpayService();

// Export class for testing
export { RazorpayService };
