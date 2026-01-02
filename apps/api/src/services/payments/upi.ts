import axios from 'axios';
import QRCode from 'qrcode';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'upi-service' });

export interface UPIConfig {
  // Default payee VPA for business
  defaultPayeeVPA?: string;
  // Merchant name
  merchantName?: string;
  // Merchant code (if using payment gateway for VPA validation)
  merchantCode?: string;
  // API credentials for VPA validation (optional)
  validationApiKey?: string;
  validationApiUrl?: string;
}

export interface UPILinkParams {
  payeeVPA: string;
  payeeName?: string;
  amount: number;
  transactionNote: string;
  transactionRef: string;
  merchantCode?: string;
  currency?: string;
}

export interface UPIQRCodeOptions {
  width?: number;
  height?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
}

export interface UPIResponse {
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  txnId?: string;
  txnRef?: string;
  amount?: number;
  responseCode?: string;
  approvalRefNo?: string;
  errorMessage?: string;
}

export interface VPAValidationResult {
  isValid: boolean;
  accountExists?: boolean;
  nameAtBank?: string;
  errorMessage?: string;
}

export interface CollectRequestParams {
  payerVPA: string;
  amount: number;
  note: string;
  transactionRef: string;
  merchantVPA?: string;
  expiryMinutes?: number;
}

/**
 * UPI Payment Service
 * Handles direct UPI payments, QR code generation, and VPA validation
 */
export class UPIService {
  private config: UPIConfig;

  constructor(config: UPIConfig = {}) {
    this.config = config;
    logger.info('UPI service initialized');
  }

  /**
   * Generate UPI payment link
   * @param params UPI link parameters
   * @returns UPI payment URL
   *
   * Format: upi://pay?pa=<VPA>&pn=<Name>&am=<Amount>&tn=<Note>&tr=<Ref>&mc=<MCC>&cu=<Currency>
   */
  generateUPILink(params: UPILinkParams): string {
    try {
      logger.info(
        { payeeVPA: params.payeeVPA, amount: params.amount },
        'Generating UPI link'
      );

      // Validate VPA format
      if (!this.isValidVPAFormat(params.payeeVPA)) {
        throw new Error('Invalid VPA format');
      }

      // Build UPI URL parameters
      const upiParams: Record<string, string> = {
        pa: params.payeeVPA, // Payee address
        pn: encodeURIComponent(params.payeeName || this.config.merchantName || 'Merchant'), // Payee name
        am: params.amount.toFixed(2), // Amount
        tn: encodeURIComponent(params.transactionNote), // Transaction note
        tr: params.transactionRef, // Transaction reference
        cu: params.currency || 'INR', // Currency
      };

      // Add merchant code if provided
      if (params.merchantCode || this.config.merchantCode) {
        upiParams.mc = params.merchantCode || this.config.merchantCode || '';
      }

      // Build UPI URL
      const queryString = Object.entries(upiParams)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

      const upiLink = `upi://pay?${queryString}`;

      logger.info({ upiLink }, 'UPI link generated successfully');

      return upiLink;
    } catch (error: any) {
      logger.error({ error: error.message, params }, 'Failed to generate UPI link');
      throw new Error(`UPI link generation failed: ${error.message}`);
    }
  }

  /**
   * Generate UPI QR code
   * @param upiLink UPI payment link
   * @param options QR code generation options
   * @returns QR code as base64 data URL
   */
  async generateQRCode(
    upiLink: string,
    options: UPIQRCodeOptions = {}
  ): Promise<string> {
    try {
      logger.info('Generating UPI QR code');

      const qrOptions = {
        width: options.width || 300,
        height: options.height || 300,
        margin: options.margin || 2,
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        color: {
          dark: options.color?.dark || '#000000',
          light: options.color?.light || '#FFFFFF',
        },
      };

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(upiLink, qrOptions);

      logger.info('UPI QR code generated successfully');

      return qrCodeDataUrl;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate QR code');
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate UPI QR code as buffer
   * @param upiLink UPI payment link
   * @param options QR code generation options
   * @returns QR code as PNG buffer
   */
  async generateQRCodeBuffer(
    upiLink: string,
    options: UPIQRCodeOptions = {}
  ): Promise<Buffer> {
    try {
      logger.info('Generating UPI QR code buffer');

      const qrOptions = {
        width: options.width || 300,
        margin: options.margin || 2,
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        color: {
          dark: options.color?.dark || '#000000',
          light: options.color?.light || '#FFFFFF',
        },
      };

      // Generate QR code as buffer
      const qrCodeBuffer = await QRCode.toBuffer(upiLink, qrOptions);

      logger.info('UPI QR code buffer generated successfully');

      return qrCodeBuffer;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate QR code buffer');
      throw new Error(`QR code buffer generation failed: ${error.message}`);
    }
  }

  /**
   * Parse UPI response string from payment app callback
   * @param responseString Response string from UPI app
   * @returns Parsed UPI response
   *
   * Format: txnId=<ID>&txnRef=<Ref>&Status=<Status>&responseCode=<Code>&ApprovalRefNo=<RefNo>
   */
  parseUPIResponse(responseString: string): UPIResponse {
    try {
      logger.info('Parsing UPI response');

      const params = new URLSearchParams(responseString);

      const response: UPIResponse = {
        status: this.mapStatusCode(params.get('Status') || params.get('status')),
        txnId: params.get('txnId') || params.get('txnid') || undefined,
        txnRef: params.get('txnRef') || params.get('txnref') || undefined,
        responseCode: params.get('responseCode') || params.get('responsecode') || undefined,
        approvalRefNo: params.get('ApprovalRefNo') || params.get('approvalrefno') || undefined,
      };

      // Parse amount if present
      const amount = params.get('amount') || params.get('am');
      if (amount) {
        response.amount = parseFloat(amount);
      }

      // Check for error message
      const errorMsg = params.get('errorMessage') || params.get('errormessage');
      if (errorMsg) {
        response.errorMessage = errorMsg;
      }

      logger.info({ response }, 'UPI response parsed successfully');

      return response;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to parse UPI response');
      throw new Error(`UPI response parsing failed: ${error.message}`);
    }
  }

  /**
   * Validate VPA format
   * @param vpa Virtual Payment Address
   * @returns True if format is valid
   */
  isValidVPAFormat(vpa: string): boolean {
    // VPA format: username@bankname
    // Examples: user@paytm, 9876543210@ybl, user.name@oksbi
    const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return vpaRegex.test(vpa);
  }

  /**
   * Validate VPA using payment gateway API
   * @param vpa Virtual Payment Address to validate
   * @returns VPA validation result
   */
  async validateVPA(vpa: string): Promise<VPAValidationResult> {
    try {
      logger.info({ vpa }, 'Validating VPA');

      // Check format first
      if (!this.isValidVPAFormat(vpa)) {
        return {
          isValid: false,
          errorMessage: 'Invalid VPA format',
        };
      }

      // If validation API is not configured, return format validation only
      if (!this.config.validationApiUrl || !this.config.validationApiKey) {
        logger.warn('VPA validation API not configured, only format validation performed');
        return {
          isValid: true,
          accountExists: undefined,
          errorMessage: 'VPA format is valid, but account existence not verified',
        };
      }

      // Call validation API (example using Razorpay VPA validation)
      const response = await axios.post(
        this.config.validationApiUrl,
        {
          vpa: vpa,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.validationApiKey}`,
          },
          timeout: 10000,
        }
      );

      const isValid = response.data.success === true;
      const nameAtBank = response.data.customer_name || undefined;

      logger.info({ vpa, isValid, nameAtBank }, 'VPA validation completed');

      return {
        isValid,
        accountExists: isValid,
        nameAtBank,
      };
    } catch (error: any) {
      logger.error({ error: error.message, vpa }, 'VPA validation failed');

      // Return format validation on API failure
      return {
        isValid: this.isValidVPAFormat(vpa),
        accountExists: undefined,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Create UPI collect request
   * Note: This requires integration with a payment gateway that supports UPI collect
   * @param params Collect request parameters
   * @returns Collect request response
   */
  async createCollectRequest(params: CollectRequestParams): Promise<any> {
    try {
      logger.info(
        { payerVPA: params.payerVPA, amount: params.amount },
        'Creating UPI collect request'
      );

      // Validate payer VPA
      if (!this.isValidVPAFormat(params.payerVPA)) {
        throw new Error('Invalid payer VPA format');
      }

      // Validate merchant VPA
      const merchantVPA = params.merchantVPA || this.config.defaultPayeeVPA;
      if (!merchantVPA) {
        throw new Error('Merchant VPA not configured');
      }

      if (!this.isValidVPAFormat(merchantVPA)) {
        throw new Error('Invalid merchant VPA format');
      }

      // This is a placeholder - actual implementation requires payment gateway integration
      // For example, using Razorpay UPI, Paytm, or PhonePe collect API

      if (!this.config.validationApiUrl) {
        throw new Error(
          'UPI collect API not configured. Please integrate with a payment gateway that supports UPI collect requests.'
        );
      }

      const collectRequest = {
        payer_vpa: params.payerVPA,
        payee_vpa: merchantVPA,
        amount: params.amount,
        note: params.note,
        transaction_ref: params.transactionRef,
        expiry_minutes: params.expiryMinutes || 15,
      };

      const response = await axios.post(
        `${this.config.validationApiUrl}/collect`,
        collectRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.validationApiKey}`,
          },
          timeout: 30000,
        }
      );

      logger.info(
        { transactionRef: params.transactionRef, status: response.data.status },
        'UPI collect request created'
      );

      return response.data;
    } catch (error: any) {
      logger.error({ error: error.message, params }, 'Failed to create collect request');
      throw new Error(
        `UPI collect request failed: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Generate UPI intent URL for mobile apps
   * @param params UPI link parameters
   * @returns UPI intent URL for Android
   */
  generateUPIIntent(params: UPILinkParams): string {
    const upiLink = this.generateUPILink(params);
    // Android intent format
    return `intent://${upiLink.replace('upi://', '')}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
  }

  /**
   * Generate transaction reference ID
   * @param prefix Optional prefix for the reference
   * @returns Unique transaction reference
   */
  generateTransactionRef(prefix: string = 'UPI'): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Map status code to standard status
   * @param statusCode Status code from UPI response
   * @returns Standard status
   */
  private mapStatusCode(statusCode: string | null): 'SUCCESS' | 'FAILURE' | 'PENDING' {
    if (!statusCode) return 'PENDING';

    const code = statusCode.toUpperCase();

    if (code === 'SUCCESS' || code === 'S' || code === 'SUBMITTED') {
      return 'SUCCESS';
    } else if (code === 'FAILURE' || code === 'F' || code === 'FAILED') {
      return 'FAILURE';
    } else {
      return 'PENDING';
    }
  }

  /**
   * Verify UPI transaction using checksum
   * @param txnData Transaction data
   * @param receivedChecksum Checksum received
   * @param secret Merchant secret key
   * @returns True if checksum is valid
   */
  verifyTransactionChecksum(
    txnData: Record<string, any>,
    receivedChecksum: string,
    secret: string
  ): boolean {
    try {
      // Sort keys and create parameter string
      const sortedKeys = Object.keys(txnData).sort();
      const paramStr = sortedKeys
        .map((key) => `${key}=${txnData[key]}`)
        .join('&');

      // Generate checksum
      const computedChecksum = crypto
        .createHmac('sha256', secret)
        .update(paramStr)
        .digest('hex');

      const isValid = computedChecksum === receivedChecksum;

      logger.info({ isValid }, 'Transaction checksum verification');

      return isValid;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Checksum verification failed');
      return false;
    }
  }

  /**
   * Get popular UPI apps for displaying payment options
   * @returns List of UPI app configurations
   */
  getPopularUPIApps(): Array<{
    name: string;
    package: string;
    vpaPattern: string;
  }> {
    return [
      {
        name: 'Google Pay',
        package: 'com.google.android.apps.nbu.paisa.user',
        vpaPattern: '@okaxis|@okhdfcbank|@okicici',
      },
      {
        name: 'PhonePe',
        package: 'com.phonepe.app',
        vpaPattern: '@ybl',
      },
      {
        name: 'Paytm',
        package: 'net.one97.paytm',
        vpaPattern: '@paytm',
      },
      {
        name: 'Amazon Pay',
        package: 'in.amazon.mShop.android.shopping',
        vpaPattern: '@apl',
      },
      {
        name: 'BHIM',
        package: 'in.org.npci.upiapp',
        vpaPattern: '@upi',
      },
      {
        name: 'WhatsApp',
        package: 'com.whatsapp',
        vpaPattern: '@wa',
      },
    ];
  }

  /**
   * Check if service is configured properly
   * @returns True if basic configuration is valid
   */
  isConfigured(): boolean {
    return !!(this.config.defaultPayeeVPA || this.config.merchantName);
  }
}

/**
 * Create UPI service instance
 * @param config UPI configuration
 * @returns UPI service instance
 */
export function createUPIService(config?: UPIConfig): UPIService {
  return new UPIService(config);
}
