// Nexvo API - Billing Validation Schemas
// Zod schemas for billing-related request validation

import { z } from 'zod';

// ============================================================================
// Common Enums
// ============================================================================

export const BillingCycleEnum = z.enum(['MONTHLY', 'YEARLY']);
export const PaymentGatewayEnum = z.enum(['STRIPE', 'PAYPAL', 'RAZORPAY']);
export const PaymentStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
]);
export const InvoiceStatusEnum = z.enum(['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE']);
export const SubscriptionStatusEnum = z.enum([
  'ACTIVE',
  'PAST_DUE',
  'PAUSED',
  'CANCELLED',
  'EXPIRED',
  'TRIALING',
]);

// ============================================================================
// Subscription Schemas
// ============================================================================

export const createSubscriptionSchema = z.object({
  planId: z.string().uuid('Plan ID must be a valid UUID'),
  billingCycle: BillingCycleEnum,
  paymentGateway: PaymentGatewayEnum.optional(),
  promoCode: z.string().min(1).max(50).optional(),
});

export const updateSubscriptionSchema = z.object({
  planId: z.string().uuid('Plan ID must be a valid UUID'),
  prorating: z.boolean().optional().default(true),
});

export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().optional().default(false),
  reason: z
    .string()
    .max(500, 'Cancellation reason must be less than 500 characters')
    .optional(),
});

// ============================================================================
// Checkout Schemas
// ============================================================================

export const createCheckoutSchema = z.object({
  planId: z.string().uuid('Plan ID must be a valid UUID'),
  billingCycle: BillingCycleEnum,
  successUrl: z.string().url('Success URL must be a valid URL'),
  cancelUrl: z.string().url('Cancel URL must be a valid URL'),
  promoCode: z.string().min(1).max(50).optional(),
});

export const verifyCheckoutSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

// ============================================================================
// Promo Code Schemas
// ============================================================================

export const validatePromoCodeSchema = z.object({
  code: z.string().min(1, 'Promo code is required').max(50),
  planId: z.string().uuid('Plan ID must be a valid UUID').optional(),
});

export const applyPromoCodeSchema = z.object({
  code: z.string().min(1, 'Promo code is required').max(50),
});

// ============================================================================
// Payment Method Schemas
// ============================================================================

export const addPaymentMethodSchema = z.object({
  type: z.enum(['CARD', 'BANK_ACCOUNT', 'PAYPAL', 'UPI']),
  token: z.string().min(1, 'Payment method token is required'),
  isDefault: z.boolean().optional().default(false),
  metadata: z.record(z.any()).optional(),
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const invoiceQuerySchema = z.object({
  status: InvoiceStatusEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const paymentQuerySchema = z.object({
  status: PaymentStatusEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const usageHistoryQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ============================================================================
// Route Parameter Schemas
// ============================================================================

export const idParamSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
});

export const paymentMethodIdParamSchema = z.object({
  id: z.string().min(1, 'Payment method ID is required'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type VerifyCheckoutInput = z.infer<typeof verifyCheckoutSchema>;
export type ValidatePromoCodeInput = z.infer<typeof validatePromoCodeSchema>;
export type ApplyPromoCodeInput = z.infer<typeof applyPromoCodeSchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
export type UsageHistoryQuery = z.infer<typeof usageHistoryQuerySchema>;
