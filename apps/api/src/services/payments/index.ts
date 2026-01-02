/**
 * Payment Services Module
 * Exports all payment gateway services including Stripe and India-specific payments
 */

// Shared Types
export * from './types';

// Stripe Service (International)
export {
  StripePaymentGateway,
  stripeGateway,
} from './stripe';

// Instamojo Service
export {
  InstamojoService,
  createInstamojoService,
  type InstamojoConfig,
  type PaymentRequestParams,
  type InstamojoPaymentRequest,
  type InstamojoPayment,
  type PaymentDetails,
  type RefundParams,
  type RefundDetails,
  type ListPaymentsResponse,
} from './instamojo';

// Paytm Service
export {
  PaytmService,
  createPaytmService,
  type PaytmConfig,
  type TransactionParams,
  type TransactionResponse,
  type TransactionStatus,
  type RefundParams as PaytmRefundParams,
  type RefundResponse,
  type SubscriptionParams,
  type SubscriptionStatus,
} from './paytm';

// UPI Service
export {
  UPIService,
  createUPIService,
  type UPIConfig,
  type UPILinkParams,
  type UPIQRCodeOptions,
  type UPIResponse,
  type VPAValidationResult,
  type CollectRequestParams,
} from './upi';
