import { prisma } from '@nexvo/database';
import type {
  Subscription,
  PricingPlan,
  BillingCycle,
  SubscriptionStatus,
  PaymentGateway,
} from '@nexvo/database';

interface CreateSubscriptionInput {
  organizationId: string;
  planId: string;
  billingCycle: BillingCycle;
  paymentGateway: PaymentGateway;
  promoCode?: string;
  trialDays?: number;
}

interface SubscriptionWithPlan extends Subscription {
  plan: PricingPlan;
}

interface ChangeSubscriptionInput {
  subscriptionId: string;
  newPlanId: string;
  prorating: boolean;
}

interface SubscriptionHistory {
  subscriptionId: string;
  planName: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
}

/**
 * Payment Gateway Factory Pattern
 * Returns the appropriate payment gateway based on country or organization settings
 */
class PaymentGatewayFactory {
  /**
   * Determine payment gateway based on country
   * @param country ISO country code (e.g., "IN", "US")
   */
  static determinePaymentGateway(country: string): PaymentGateway {
    const countryCode = country.toUpperCase();

    // India - use Razorpay or Instamojo
    if (countryCode === 'IN') {
      return 'RAZORPAY';
    }

    // International - use Stripe
    return 'STRIPE';
  }

  /**
   * Get available payment gateways for a country
   */
  static getAvailableGateways(country: string): PaymentGateway[] {
    const countryCode = country.toUpperCase();

    if (countryCode === 'IN') {
      return ['RAZORPAY', 'INSTAMOJO', 'UPI'];
    }

    return ['STRIPE'];
  }
}

class SubscriptionService {
  /**
   * Get all active pricing plans
   */
  async getActivePlans(): Promise<PricingPlan[]> {
    try {
      const plans = await prisma.pricingPlan.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

      console.log(`[Subscription Service] Retrieved ${plans.length} active plans`);
      return plans;
    } catch (error) {
      console.error('[Subscription Service] Error fetching active plans:', error);
      throw new Error('Failed to fetch active pricing plans');
    }
  }

  /**
   * Get a pricing plan by ID
   */
  async getPlanById(planId: string): Promise<PricingPlan | null> {
    try {
      const plan = await prisma.pricingPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        console.warn(`[Subscription Service] Plan not found: ${planId}`);
        return null;
      }

      return plan;
    } catch (error) {
      console.error('[Subscription Service] Error fetching plan:', error);
      throw new Error('Failed to fetch pricing plan');
    }
  }

  /**
   * Create a new subscription
   */
  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionWithPlan> {
    try {
      const { organizationId, planId, billingCycle, paymentGateway, promoCode, trialDays = 14 } = input;

      // Fetch the plan
      const plan = await this.getPlanById(planId);
      if (!plan) {
        throw new Error('Pricing plan not found');
      }

      // Get organization
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Calculate pricing based on billing cycle and currency
      let pricePerPeriod = 0;
      const currency = organization.currency || 'USD';

      if (currency === 'USD') {
        pricePerPeriod = billingCycle === 'MONTHLY' ? plan.priceMonthlyUSD : plan.priceYearlyUSD;
      } else if (currency === 'INR') {
        pricePerPeriod = billingCycle === 'MONTHLY' ? plan.priceMonthlyINR : plan.priceYearlyINR;
      }

      // Calculate trial end date
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      // Calculate current period end
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      if (billingCycle === 'MONTHLY') {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      } else if (billingCycle === 'YEARLY') {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      } else if (billingCycle === 'QUARTERLY') {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
      }

      // Handle promo code if provided
      let discountPercent = 0;
      let discountEndsAt: Date | undefined;

      if (promoCode) {
        const promo = await prisma.promoCode.findUnique({
          where: { code: promoCode },
        });

        if (promo && promo.isActive) {
          if (promo.discountType === 'PERCENTAGE') {
            discountPercent = promo.discountValue;
          }

          if (promo.durationMonths) {
            discountEndsAt = new Date();
            discountEndsAt.setMonth(discountEndsAt.getMonth() + promo.durationMonths);
          }
        }
      }

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          organizationId,
          planId,
          billingCycle,
          currency,
          status: 'TRIALING',
          pricePerPeriod,
          trialEndsAt,
          currentPeriodStart,
          currentPeriodEnd,
          paymentGateway,
          discountPercent,
          discountEndsAt,
        },
        include: {
          plan: true,
        },
      });

      // Update organization plan
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          plan: plan.name.toUpperCase() as any,
        },
      });

      console.log(`[Subscription Service] Created subscription: ${subscription.id} for org: ${organizationId}`);
      return subscription;
    } catch (error) {
      console.error('[Subscription Service] Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediate: boolean = false,
    reason?: string
  ): Promise<Subscription> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const updateData: any = {
        canceledAt: new Date(),
        cancelReason: reason,
      };

      if (immediate) {
        updateData.status = 'CANCELED';
        updateData.currentPeriodEnd = new Date();
      } else {
        updateData.cancelAtPeriodEnd = true;
      }

      const canceledSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: updateData,
      });

      console.log(`[Subscription Service] Canceled subscription: ${subscriptionId} (immediate: ${immediate})`);
      return canceledSubscription;
    } catch (error) {
      console.error('[Subscription Service] Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'ACTIVE') {
        throw new Error('Can only pause active subscriptions');
      }

      const pausedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'PAUSED',
        },
      });

      console.log(`[Subscription Service] Paused subscription: ${subscriptionId}`);
      return pausedSubscription;
    } catch (error) {
      console.error('[Subscription Service] Error pausing subscription:', error);
      throw error;
    }
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'PAUSED') {
        throw new Error('Can only resume paused subscriptions');
      }

      const resumedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
        },
      });

      console.log(`[Subscription Service] Resumed subscription: ${subscriptionId}`);
      return resumedSubscription;
    } catch (error) {
      console.error('[Subscription Service] Error resuming subscription:', error);
      throw error;
    }
  }

  /**
   * Change subscription plan
   */
  async changeSubscription(input: ChangeSubscriptionInput): Promise<Subscription> {
    try {
      const { subscriptionId, newPlanId, prorating } = input;

      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          plan: true,
          organization: true,
        },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const newPlan = await this.getPlanById(newPlanId);
      if (!newPlan) {
        throw new Error('New plan not found');
      }

      // Calculate new price
      const currency = subscription.currency;
      let newPricePerPeriod = 0;

      if (currency === 'USD') {
        newPricePerPeriod = subscription.billingCycle === 'MONTHLY'
          ? newPlan.priceMonthlyUSD
          : newPlan.priceYearlyUSD;
      } else if (currency === 'INR') {
        newPricePerPeriod = subscription.billingCycle === 'MONTHLY'
          ? newPlan.priceMonthlyINR
          : newPlan.priceYearlyINR;
      }

      // Handle proration if enabled
      if (prorating && subscription.status === 'ACTIVE') {
        const now = new Date();
        const periodStart = subscription.currentPeriodStart;
        const periodEnd = subscription.currentPeriodEnd;

        const totalPeriodMs = periodEnd.getTime() - periodStart.getTime();
        const remainingMs = periodEnd.getTime() - now.getTime();
        const usageRatio = 1 - (remainingMs / totalPeriodMs);

        // Calculate prorated amount
        const oldPlanUsed = Math.floor(subscription.pricePerPeriod * usageRatio);
        const newPlanRemaining = Math.floor(newPricePerPeriod * (1 - usageRatio));

        console.log(`[Subscription Service] Proration - Old: ${oldPlanUsed}, New: ${newPlanRemaining}`);

        // Could create a proration invoice here
      }

      // Update subscription
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          planId: newPlanId,
          pricePerPeriod: newPricePerPeriod,
        },
      });

      // Update organization plan
      await prisma.organization.update({
        where: { id: subscription.organizationId },
        data: {
          plan: newPlan.name.toUpperCase() as any,
        },
      });

      console.log(`[Subscription Service] Changed subscription ${subscriptionId} to plan ${newPlanId}`);
      return updatedSubscription;
    } catch (error) {
      console.error('[Subscription Service] Error changing subscription:', error);
      throw error;
    }
  }

  /**
   * Get current subscription for an organization
   */
  async getSubscription(organizationId: string): Promise<SubscriptionWithPlan | null> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          organizationId,
          status: {
            in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED'],
          },
        },
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return subscription;
    } catch (error) {
      console.error('[Subscription Service] Error fetching subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription history for an organization
   */
  async getSubscriptionHistory(organizationId: string): Promise<SubscriptionHistory[]> {
    try {
      const subscriptions = await prisma.subscription.findMany({
        where: { organizationId },
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const history: SubscriptionHistory[] = subscriptions.map(sub => ({
        subscriptionId: sub.id,
        planName: sub.plan.displayName,
        status: sub.status,
        startDate: sub.currentPeriodStart,
        endDate: sub.canceledAt || (sub.status === 'CANCELED' ? sub.currentPeriodEnd : null),
        billingCycle: sub.billingCycle,
        amount: sub.pricePerPeriod,
        currency: sub.currency,
      }));

      return history;
    } catch (error) {
      console.error('[Subscription Service] Error fetching subscription history:', error);
      throw error;
    }
  }

  /**
   * Renew a subscription
   */
  async renewSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Calculate new period
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();

      if (subscription.billingCycle === 'MONTHLY') {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      } else if (subscription.billingCycle === 'YEARLY') {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      } else if (subscription.billingCycle === 'QUARTERLY') {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
      }

      const renewedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: false,
        },
      });

      console.log(`[Subscription Service] Renewed subscription: ${subscriptionId}`);
      return renewedSubscription;
    } catch (error) {
      console.error('[Subscription Service] Error renewing subscription:', error);
      throw error;
    }
  }

  /**
   * Handle trial end - convert to active or cancel
   */
  async handleTrialEnd(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          organization: true,
        },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'TRIALING') {
        throw new Error('Subscription is not in trial period');
      }

      // Check if payment method is set up
      const hasPaymentMethod =
        subscription.organization.stripeCustomerId ||
        subscription.organization.razorpayCustomerId;

      if (hasPaymentMethod) {
        // Activate subscription
        const updatedSubscription = await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'ACTIVE',
          },
        });

        console.log(`[Subscription Service] Trial ended, activated subscription: ${subscriptionId}`);
        return updatedSubscription;
      } else {
        // Cancel subscription if no payment method
        const updatedSubscription = await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'CANCELED',
            canceledAt: new Date(),
            cancelReason: 'Trial ended without payment method',
          },
        });

        console.log(`[Subscription Service] Trial ended, canceled subscription: ${subscriptionId}`);
        return updatedSubscription;
      }
    } catch (error) {
      console.error('[Subscription Service] Error handling trial end:', error);
      throw error;
    }
  }

  /**
   * Sync subscription with payment gateway
   */
  async syncWithPaymentGateway(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Here you would integrate with actual payment gateway APIs
      // For now, we'll just log the sync attempt
      console.log(`[Subscription Service] Syncing subscription ${subscriptionId} with ${subscription.paymentGateway}`);

      // Example: Fetch subscription status from Stripe/Razorpay
      // const gatewayStatus = await this.fetchFromGateway(subscription);
      // Update local status based on gateway status

      return subscription;
    } catch (error) {
      console.error('[Subscription Service] Error syncing with payment gateway:', error);
      throw error;
    }
  }

  /**
   * Determine payment gateway based on country
   */
  determinePaymentGateway(country: string): PaymentGateway {
    return PaymentGatewayFactory.determinePaymentGateway(country);
  }

  /**
   * Get available payment gateways for a country
   */
  getAvailableGateways(country: string): PaymentGateway[] {
    return PaymentGatewayFactory.getAvailableGateways(country);
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();

// Export class for testing
export { SubscriptionService, PaymentGatewayFactory };

// Export types
export type {
  CreateSubscriptionInput,
  SubscriptionWithPlan,
  ChangeSubscriptionInput,
  SubscriptionHistory,
};
