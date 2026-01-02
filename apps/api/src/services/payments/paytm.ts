import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'paytm-service' });

export interface PaytmConfig {
  merchantId: string;
  merchantKey: string;
  website: string;
  industryType: string;
  channelId?: string;
  sandbox?: boolean;
}

export interface TransactionParams {
  orderId: string;
  amount: number;
  customerId: string;
  callbackUrl: string;
  email?: string;
  mobile?: string;
  custId?: string;
}

export interface TransactionResponse {
  orderId: string;
  mid: string;
  txnToken: string;
  resultInfo: {
    resultStatus: string;
    resultCode: string;
    resultMsg: string;
  };
}

export interface TransactionStatus {
  orderId: string;
  mid: string;
  txnId: string;
  txnAmount: string;
  paymentMode: string;
  currency: string;
  txnDate: string;
  status: string;
  respCode: string;
  respMsg: string;
  gatewayName: string;
  bankTxnId: string;
  bankName: string;
}

export interface RefundParams {
  orderId: string;
  refId: string;
  refundAmount: number;
  txnId?: string;
  txnType?: 'REFUND';
}

export interface RefundResponse {
  orderId: string;
  refundId: string;
  txnId: string;
  refundAmount: string;
  resultInfo: {
    resultStatus: string;
    resultCode: string;
    resultMsg: string;
  };
}

export interface SubscriptionParams {
  subscriptionId: string;
  planId: string;
  customerId: string;
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  frequencyUnit: number;
  startDate: string;
  expiryDate?: string;
  enableRetry?: boolean;
}

export interface SubscriptionStatus {
  subscriptionId: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
  nextPaymentDate: string;
  lastPaymentDate?: string;
  failureCount: number;
}

/**
 * Paytm Payment Gateway Service
 * Handles transactions, refunds, subscriptions, and UPI payments for Indian market
 */
export class PaytmService {
  private client: AxiosInstance;
  private config: PaytmConfig;
  private baseUrl: string;
  private transactionUrl: string;

  constructor(config: PaytmConfig) {
    this.config = {
      ...config,
      channelId: config.channelId || 'WEB',
    };

    // Set URLs based on environment
    if (config.sandbox) {
      this.baseUrl = 'https://securegw-stage.paytm.in';
      this.transactionUrl = 'https://securegw-stage.paytm.in/theia/api/v1';
    } else {
      this.baseUrl = 'https://securegw.paytm.in';
      this.transactionUrl = 'https://securegw.paytm.in/theia/api/v1';
    }

    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
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
          'Paytm API error'
        );
        throw error;
      }
    );

    logger.info(
      { sandbox: config.sandbox, baseUrl: this.baseUrl },
      'Paytm service initialized'
    );
  }

  /**
   * Generate checksum for Paytm API calls
   * @param params Parameters to generate checksum for
   * @returns Checksum string
   */
  generateChecksum(params: Record<string, any>): string {
    try {
      // Sort parameters
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            acc[key] = params[key];
          }
          return acc;
        }, {} as Record<string, any>);

      // Create parameter string
      const paramStr = Object.entries(sortedParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

      // Generate checksum using HMAC SHA256
      const checksum = crypto
        .createHmac('sha256', this.config.merchantKey)
        .update(paramStr)
        .digest('hex');

      logger.debug({ params: sortedParams }, 'Generated checksum');

      return checksum;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate checksum');
      throw new Error(`Checksum generation failed: ${error.message}`);
    }
  }

  /**
   * Verify checksum received from Paytm
   * @param params Parameters received
   * @param receivedChecksum Checksum to verify
   * @returns True if checksum is valid
   */
  verifyChecksum(params: Record<string, any>, receivedChecksum: string): boolean {
    try {
      const computedChecksum = this.generateChecksum(params);
      const isValid = computedChecksum === receivedChecksum;

      logger.info({ isValid }, 'Checksum verification');

      return isValid;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Checksum verification failed');
      return false;
    }
  }

  /**
   * Initiate a transaction and get payment token
   * @param params Transaction parameters
   * @returns Transaction response with token
   */
  async initiateTransaction(params: TransactionParams): Promise<TransactionResponse> {
    try {
      logger.info(
        { orderId: params.orderId, amount: params.amount },
        'Initiating transaction'
      );

      const requestBody = {
        body: {
          requestType: 'Payment',
          mid: this.config.merchantId,
          websiteName: this.config.website,
          orderId: params.orderId,
          callbackUrl: params.callbackUrl,
          txnAmount: {
            value: params.amount.toFixed(2),
            currency: 'INR',
          },
          userInfo: {
            custId: params.custId || params.customerId,
            email: params.email,
            mobile: params.mobile,
          },
        },
      };

      // Generate checksum for the request
      const checksum = this.generateChecksum({
        mid: this.config.merchantId,
        orderId: params.orderId,
      });

      const response = await this.client.post(
        `${this.transactionUrl}/initiateTransaction`,
        requestBody,
        {
          params: { mid: this.config.merchantId, orderId: params.orderId },
          headers: {
            'x-mid': this.config.merchantId,
            'x-checksum': checksum,
          },
        }
      );

      if (response.data.body.resultInfo.resultStatus !== 'S') {
        throw new Error(
          response.data.body.resultInfo.resultMsg || 'Transaction initiation failed'
        );
      }

      logger.info(
        { orderId: params.orderId, txnToken: response.data.body.txnToken },
        'Transaction initiated successfully'
      );

      return {
        orderId: params.orderId,
        mid: this.config.merchantId,
        txnToken: response.data.body.txnToken,
        resultInfo: response.data.body.resultInfo,
      };
    } catch (error: any) {
      logger.error({ error: error.message, params }, 'Failed to initiate transaction');
      throw new Error(
        `Paytm transaction initiation failed: ${error.response?.data?.body?.resultInfo?.resultMsg || error.message}`
      );
    }
  }

  /**
   * Get transaction status
   * @param orderId Order ID to check status for
   * @returns Transaction status details
   */
  async getTransactionStatus(orderId: string): Promise<TransactionStatus> {
    try {
      logger.info({ orderId }, 'Fetching transaction status');

      const requestBody = {
        body: {
          mid: this.config.merchantId,
          orderId: orderId,
        },
      };

      // Generate checksum
      const checksum = this.generateChecksum({
        mid: this.config.merchantId,
        orderId: orderId,
      });

      const response = await this.client.post(
        `${this.transactionUrl}/showPaymentPage`,
        requestBody,
        {
          headers: {
            'x-mid': this.config.merchantId,
            'x-checksum': checksum,
          },
        }
      );

      const txnInfo = response.data.body;

      logger.info(
        { orderId, status: txnInfo.resultInfo.resultStatus },
        'Transaction status retrieved'
      );

      return {
        orderId: txnInfo.orderId || orderId,
        mid: txnInfo.mid,
        txnId: txnInfo.txnId,
        txnAmount: txnInfo.txnAmount,
        paymentMode: txnInfo.paymentMode,
        currency: txnInfo.currency || 'INR',
        txnDate: txnInfo.txnDate,
        status: txnInfo.resultInfo.resultStatus,
        respCode: txnInfo.resultInfo.resultCode,
        respMsg: txnInfo.resultInfo.resultMsg,
        gatewayName: txnInfo.gatewayName,
        bankTxnId: txnInfo.bankTxnId,
        bankName: txnInfo.bankName,
      };
    } catch (error: any) {
      logger.error({ error: error.message, orderId }, 'Failed to fetch transaction status');
      throw new Error(
        `Failed to get transaction status: ${error.response?.data?.body?.resultInfo?.resultMsg || error.message}`
      );
    }
  }

  /**
   * Process a refund
   * @param params Refund parameters
   * @returns Refund response
   */
  async processRefund(params: RefundParams): Promise<RefundResponse> {
    try {
      logger.info(
        { orderId: params.orderId, refundAmount: params.refundAmount },
        'Processing refund'
      );

      const requestBody = {
        body: {
          mid: this.config.merchantId,
          orderId: params.orderId,
          txnId: params.txnId,
          txnType: params.txnType || 'REFUND',
          refundAmount: params.refundAmount.toFixed(2),
          refId: params.refId,
        },
      };

      // Generate checksum
      const checksum = this.generateChecksum({
        mid: this.config.merchantId,
        orderId: params.orderId,
        refId: params.refId,
      });

      const response = await this.client.post(
        `${this.baseUrl}/refund/apply`,
        requestBody,
        {
          headers: {
            'x-mid': this.config.merchantId,
            'x-checksum': checksum,
          },
        }
      );

      if (response.data.body.resultInfo.resultStatus !== 'TXN_SUCCESS') {
        throw new Error(
          response.data.body.resultInfo.resultMsg || 'Refund processing failed'
        );
      }

      logger.info(
        { orderId: params.orderId, refundId: response.data.body.refundId },
        'Refund processed successfully'
      );

      return {
        orderId: params.orderId,
        refundId: response.data.body.refundId,
        txnId: response.data.body.txnId,
        refundAmount: params.refundAmount.toFixed(2),
        resultInfo: response.data.body.resultInfo,
      };
    } catch (error: any) {
      logger.error({ error: error.message, params }, 'Failed to process refund');
      throw new Error(
        `Paytm refund failed: ${error.response?.data?.body?.resultInfo?.resultMsg || error.message}`
      );
    }
  }

  /**
   * Create a subscription
   * @param params Subscription parameters
   * @returns Subscription creation response
   */
  async createSubscription(params: SubscriptionParams): Promise<any> {
    try {
      logger.info(
        { subscriptionId: params.subscriptionId, planId: params.planId },
        'Creating subscription'
      );

      const requestBody = {
        body: {
          mid: this.config.merchantId,
          subscriptionId: params.subscriptionId,
          planId: params.planId,
          customerId: params.customerId,
          amount: params.amount.toFixed(2),
          frequency: params.frequency,
          frequencyUnit: params.frequencyUnit,
          startDate: params.startDate,
          expiryDate: params.expiryDate,
          enableRetry: params.enableRetry !== false,
        },
      };

      // Generate checksum
      const checksum = this.generateChecksum({
        mid: this.config.merchantId,
        subscriptionId: params.subscriptionId,
      });

      const response = await this.client.post(
        `${this.baseUrl}/subscription/create`,
        requestBody,
        {
          headers: {
            'x-mid': this.config.merchantId,
            'x-checksum': checksum,
          },
        }
      );

      if (response.data.body.resultInfo.resultStatus !== 'S') {
        throw new Error(
          response.data.body.resultInfo.resultMsg || 'Subscription creation failed'
        );
      }

      logger.info(
        { subscriptionId: params.subscriptionId },
        'Subscription created successfully'
      );

      return response.data.body;
    } catch (error: any) {
      logger.error({ error: error.message, params }, 'Failed to create subscription');
      throw new Error(
        `Paytm subscription creation failed: ${error.response?.data?.body?.resultInfo?.resultMsg || error.message}`
      );
    }
  }

  /**
   * Fetch subscription status
   * @param subscriptionId Subscription ID
   * @returns Subscription status
   */
  async fetchSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
    try {
      logger.info({ subscriptionId }, 'Fetching subscription status');

      const requestBody = {
        body: {
          mid: this.config.merchantId,
          subscriptionId: subscriptionId,
        },
      };

      // Generate checksum
      const checksum = this.generateChecksum({
        mid: this.config.merchantId,
        subscriptionId: subscriptionId,
      });

      const response = await this.client.post(
        `${this.baseUrl}/subscription/status`,
        requestBody,
        {
          headers: {
            'x-mid': this.config.merchantId,
            'x-checksum': checksum,
          },
        }
      );

      const subInfo = response.data.body;

      logger.info(
        { subscriptionId, status: subInfo.status },
        'Subscription status retrieved'
      );

      return {
        subscriptionId: subInfo.subscriptionId,
        status: subInfo.status,
        nextPaymentDate: subInfo.nextPaymentDate,
        lastPaymentDate: subInfo.lastPaymentDate,
        failureCount: subInfo.failureCount || 0,
      };
    } catch (error: any) {
      logger.error(
        { error: error.message, subscriptionId },
        'Failed to fetch subscription status'
      );
      throw new Error(
        `Failed to get subscription status: ${error.response?.data?.body?.resultInfo?.resultMsg || error.message}`
      );
    }
  }

  /**
   * Validate UPI VPA (Virtual Payment Address)
   * @param vpa UPI VPA to validate (e.g., user@paytm)
   * @returns True if VPA is valid
   */
  async validateUPIVPA(vpa: string): Promise<boolean> {
    try {
      logger.info({ vpa }, 'Validating UPI VPA');

      const requestBody = {
        body: {
          mid: this.config.merchantId,
          vpa: vpa,
        },
      };

      // Generate checksum
      const checksum = this.generateChecksum({
        mid: this.config.merchantId,
        vpa: vpa,
      });

      const response = await this.client.post(
        `${this.baseUrl}/v1/vpa/validate`,
        requestBody,
        {
          headers: {
            'x-mid': this.config.merchantId,
            'x-checksum': checksum,
          },
        }
      );

      const isValid = response.data.body.resultInfo.resultStatus === 'S';

      logger.info({ vpa, isValid }, 'UPI VPA validation result');

      return isValid;
    } catch (error: any) {
      logger.error({ error: error.message, vpa }, 'UPI VPA validation failed');
      return false;
    }
  }

  /**
   * Initiate UPI collect request
   * @param orderId Order ID
   * @param amount Amount to collect
   * @param vpa Customer's UPI VPA
   * @returns Collect request response
   */
  async initiateUPICollect(
    orderId: string,
    amount: number,
    vpa: string
  ): Promise<any> {
    try {
      logger.info({ orderId, amount, vpa }, 'Initiating UPI collect request');

      const requestBody = {
        body: {
          mid: this.config.merchantId,
          orderId: orderId,
          amount: amount.toFixed(2),
          vpa: vpa,
          paymentMode: 'UPI',
        },
      };

      // Generate checksum
      const checksum = this.generateChecksum({
        mid: this.config.merchantId,
        orderId: orderId,
      });

      const response = await this.client.post(
        `${this.transactionUrl}/processTransaction`,
        requestBody,
        {
          headers: {
            'x-mid': this.config.merchantId,
            'x-checksum': checksum,
          },
        }
      );

      logger.info(
        { orderId, status: response.data.body.resultInfo.resultStatus },
        'UPI collect request initiated'
      );

      return response.data.body;
    } catch (error: any) {
      logger.error(
        { error: error.message, orderId, vpa },
        'Failed to initiate UPI collect'
      );
      throw new Error(
        `UPI collect failed: ${error.response?.data?.body?.resultInfo?.resultMsg || error.message}`
      );
    }
  }

  /**
   * Get payment page URL for browser redirect
   * @param orderId Order ID
   * @param txnToken Transaction token from initiateTransaction
   * @returns Payment page URL
   */
  getPaymentPageUrl(orderId: string, txnToken: string): string {
    const basePaymentUrl = this.config.sandbox
      ? 'https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage'
      : 'https://securegw.paytm.in/theia/api/v1/showPaymentPage';

    return `${basePaymentUrl}?mid=${this.config.merchantId}&orderId=${orderId}&token=${txnToken}`;
  }

  /**
   * Check if service is configured properly
   * @returns True if configuration is valid
   */
  isConfigured(): boolean {
    return !!(
      this.config.merchantId &&
      this.config.merchantKey &&
      this.config.website &&
      this.config.industryType
    );
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
 * Create Paytm service instance
 * @param config Paytm configuration
 * @returns Paytm service instance
 */
export function createPaytmService(config: PaytmConfig): PaytmService {
  return new PaytmService(config);
}
