import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'instamojo-service' });

export interface InstamojoConfig {
  apiKey: string;
  authToken: string;
  sandbox?: boolean;
}

export interface PaymentRequestParams {
  amount: number;
  purpose: string;
  buyerName: string;
  email: string;
  phone: string;
  redirectUrl: string;
  webhookUrl?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  allowRepeatedPayments?: boolean;
}

export interface InstamojoPaymentRequest {
  id: string;
  phone: string;
  email: string;
  buyer_name: string;
  amount: string;
  purpose: string;
  status: string;
  payments: InstamojoPayment[];
  send_sms: boolean;
  send_email: boolean;
  sms_status: string;
  email_status: string;
  shorturl: string;
  longurl: string;
  redirect_url: string;
  webhook: string;
  allow_repeated_payments: boolean;
  created_at: string;
  modified_at: string;
}

export interface InstamojoPayment {
  payment_id: string;
  quantity: number;
  status: string;
  link_slug: string;
  link_title: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  currency: string;
  unit_price: string;
  amount: string;
  fees: string;
  variants: string;
  custom_fields: Record<string, any>;
  affiliate_id: string;
  affiliate_commission: string;
  created_at: string;
  payment_request: string;
}

export interface PaymentDetails {
  payment_id: string;
  payment_request_id: string;
  status: 'Credit' | 'Pending' | 'Failed';
  amount: string;
  fees: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  currency: string;
  instrument_type: string;
  created_at: string;
}

export interface RefundParams {
  paymentId: string;
  type: 'RFD' | 'TNR' | 'QFL' | 'QNR' | 'EWN' | 'TAN' | 'PTH';
  body?: string;
}

export interface RefundDetails {
  refund: {
    id: string;
    payment_id: string;
    status: string;
    type: string;
    body: string;
    refund_amount: string;
    total_amount: string;
    created_at: string;
  };
  success: boolean;
  message: string;
}

export interface ListPaymentsResponse {
  payments: InstamojoPayment[];
  count: number;
  next: string | null;
  previous: string | null;
}

/**
 * Instamojo Payment Gateway Service
 * Handles payment requests, refunds, and webhook verification for Indian payments
 */
export class InstamojoService {
  private client: AxiosInstance;
  private config: InstamojoConfig;
  private baseUrl: string;

  constructor(config: InstamojoConfig) {
    this.config = config;
    this.baseUrl = config.sandbox
      ? 'https://test.instamojo.com/api/1.1/'
      : 'https://www.instamojo.com/api/1.1/';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Api-Key': config.apiKey,
        'X-Auth-Token': config.authToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error(
          {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
          },
          'Instamojo API error'
        );
        throw error;
      }
    );

    logger.info(
      { sandbox: config.sandbox, baseUrl: this.baseUrl },
      'Instamojo service initialized'
    );
  }

  /**
   * Create a payment request
   * @param params Payment request parameters
   * @returns Payment request details with payment URL
   */
  async createPaymentRequest(
    params: PaymentRequestParams
  ): Promise<InstamojoPaymentRequest> {
    try {
      logger.info({ purpose: params.purpose, amount: params.amount }, 'Creating payment request');

      const payload = {
        amount: params.amount.toFixed(2),
        purpose: params.purpose,
        buyer_name: params.buyerName,
        email: params.email,
        phone: params.phone,
        redirect_url: params.redirectUrl,
        webhook: params.webhookUrl || undefined,
        send_email: params.sendEmail !== false,
        send_sms: params.sendSms !== false,
        allow_repeated_payments: params.allowRepeatedPayments || false,
      };

      const response = await this.client.post('payment-requests/', payload);

      if (!response.data.success) {
        throw new Error(
          response.data.message || 'Failed to create payment request'
        );
      }

      const paymentRequest = response.data.payment_request;

      logger.info(
        { requestId: paymentRequest.id, longurl: paymentRequest.longurl },
        'Payment request created successfully'
      );

      return paymentRequest;
    } catch (error: any) {
      logger.error({ error: error.message, params }, 'Failed to create payment request');
      throw new Error(
        `Instamojo payment request failed: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Get payment details by payment ID
   * @param paymentId The payment ID
   * @returns Payment details
   */
  async getPaymentDetails(paymentId: string): Promise<PaymentDetails> {
    try {
      logger.info({ paymentId }, 'Fetching payment details');

      const response = await this.client.get(`payments/${paymentId}/`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch payment details');
      }

      logger.info(
        { paymentId, status: response.data.payment.status },
        'Payment details retrieved'
      );

      return response.data.payment;
    } catch (error: any) {
      logger.error({ error: error.message, paymentId }, 'Failed to fetch payment details');
      throw new Error(
        `Failed to get payment details: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Get payment request details by request ID
   * @param requestId The payment request ID
   * @returns Payment request details
   */
  async getPaymentRequestDetails(requestId: string): Promise<InstamojoPaymentRequest> {
    try {
      logger.info({ requestId }, 'Fetching payment request details');

      const response = await this.client.get(`payment-requests/${requestId}/`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || 'Failed to fetch payment request details'
        );
      }

      logger.info(
        { requestId, status: response.data.payment_request.status },
        'Payment request details retrieved'
      );

      return response.data.payment_request;
    } catch (error: any) {
      logger.error(
        { error: error.message, requestId },
        'Failed to fetch payment request details'
      );
      throw new Error(
        `Failed to get payment request details: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Create a refund
   * @param params Refund parameters
   * @returns Refund details
   *
   * Refund types:
   * - RFD: Duplicate/delayed payment
   * - TNR: Product/service no longer available
   * - QFL: Customer not satisfied
   * - QNR: Product lost/damaged
   * - EWN: Digital download issue
   * - TAN: Event/course cancellation
   * - PTH: Other
   */
  async createRefund(params: RefundParams): Promise<RefundDetails> {
    try {
      logger.info({ paymentId: params.paymentId, type: params.type }, 'Creating refund');

      const payload = {
        payment_id: params.paymentId,
        type: params.type,
        body: params.body || 'Refund requested',
      };

      const response = await this.client.post('refunds/', payload);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create refund');
      }

      logger.info(
        { refundId: response.data.refund.id, paymentId: params.paymentId },
        'Refund created successfully'
      );

      return response.data;
    } catch (error: any) {
      logger.error({ error: error.message, params }, 'Failed to create refund');
      throw new Error(
        `Failed to create refund: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * List all payments with pagination
   * @param limit Number of results per page (default: 20, max: 50)
   * @param page Page number (default: 1)
   * @returns List of payments
   */
  async listPayments(
    limit: number = 20,
    page: number = 1
  ): Promise<ListPaymentsResponse> {
    try {
      logger.info({ limit, page }, 'Listing payments');

      const response = await this.client.get('payments/', {
        params: {
          limit: Math.min(limit, 50),
          page,
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to list payments');
      }

      logger.info(
        { count: response.data.count, page },
        'Payments list retrieved'
      );

      return {
        payments: response.data.payments,
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to list payments');
      throw new Error(
        `Failed to list payments: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Verify webhook signature
   * @param payload Webhook payload as string
   * @param signature MAC signature from webhook header
   * @returns True if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const computedSignature = crypto
        .createHmac('sha1', this.config.authToken)
        .update(payload)
        .digest('hex');

      const isValid = computedSignature === signature;

      logger.info({ isValid }, 'Webhook signature verification');

      return isValid;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to verify webhook signature');
      return false;
    }
  }

  /**
   * Validate payment callback
   * @param paymentId Payment ID from callback
   * @param paymentRequestId Payment request ID from callback
   * @returns True if payment is successful
   */
  async validatePaymentCallback(
    paymentId: string,
    paymentRequestId: string
  ): Promise<boolean> {
    try {
      const payment = await this.getPaymentDetails(paymentId);
      const paymentRequest = await this.getPaymentRequestDetails(paymentRequestId);

      const isValid =
        payment.status === 'Credit' &&
        payment.payment_request_id === paymentRequestId &&
        paymentRequest.payments.some((p) => p.payment_id === paymentId);

      logger.info(
        { paymentId, paymentRequestId, isValid },
        'Payment callback validation'
      );

      return isValid;
    } catch (error: any) {
      logger.error(
        { error: error.message, paymentId, paymentRequestId },
        'Payment callback validation failed'
      );
      return false;
    }
  }

  /**
   * Check if service is configured properly
   * @returns True if configuration is valid
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.authToken);
  }

  /**
   * Get service mode (sandbox/production)
   * @returns Service mode
   */
  getMode(): 'sandbox' | 'production' {
    return this.config.sandbox ? 'sandbox' : 'production';
  }
}

/**
 * Create Instamojo service instance
 * @param config Instamojo configuration
 * @returns Instamojo service instance
 */
export function createInstamojoService(config: InstamojoConfig): InstamojoService {
  return new InstamojoService(config);
}
