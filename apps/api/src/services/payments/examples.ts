/**
 * Payment Gateway Usage Examples
 *
 * This file demonstrates how to use the Stripe payment gateway
 * in various scenarios within the Nexvo SalesIQ application.
 */

import { stripeGateway } from './stripe';
import type {
  CheckoutSessionParams,
  SubscriptionParams,
  PaymentIntentParams,
  PricingPlan,
} from './types';

/**
 * Example 1: Organization Signup Flow
 * When a new organization signs up and selects a plan
 */
export async function handleOrganizationSignup(
  organizationId: string,
  email: string,
  name: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  try {
    // Step 1: Create customer in Stripe
    const customer = await stripeGateway.createCustomer(
      organizationId,
      email,
      name,
      {
        organizationId,
        source: 'web_signup',
      }
    );

    console.log('Customer created:', customer.id);

    // Step 2: Create checkout session with trial
    const session = await stripeGateway.createCheckoutSession({
      customerId: customer.id,
      priceId,
      successUrl,
      cancelUrl,
      trialDays: 14, // 14-day trial
      allowPromotionCodes: true,
      metadata: {
        organizationId,
      },
    });

    console.log('Checkout session created:', session.url);

    // Return the checkout URL to redirect user
    return {
      customerId: customer.id,
      checkoutUrl: session.url,
      sessionId: session.sessionId,
    };
  } catch (error) {
    console.error('Error in signup flow:', error);
    throw error;
  }
}

/**
 * Example 2: Upgrade/Downgrade Plan
 * When a user changes their subscription plan
 */
export async function handlePlanChange(
  subscriptionId: string,
  newPriceId: string,
  prorationBehavior: 'create_prorations' | 'none' = 'create_prorations'
) {
  try {
    // Update subscription to new price
    const subscription = await stripeGateway.updateSubscription(
      subscriptionId,
      newPriceId,
      prorationBehavior
    );

    console.log('Subscription updated:', subscription.id);
    console.log('New status:', subscription.status);

    return subscription;
  } catch (error) {
    console.error('Error changing plan:', error);
    throw error;
  }
}

/**
 * Example 3: Cancel Subscription
 * When a user cancels their subscription
 */
export async function handleSubscriptionCancellation(
  subscriptionId: string,
  immediate: boolean = false
) {
  try {
    const subscription = await stripeGateway.cancelSubscription(
      subscriptionId,
      immediate
    );

    if (immediate) {
      console.log('Subscription canceled immediately');
      // Revoke access immediately
    } else {
      console.log('Subscription will cancel at period end');
      console.log('Access until:', subscription.currentPeriodEnd);
    }

    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Example 4: One-time Payment for Add-ons
 * When a user purchases additional features or credits
 */
export async function handleOneTimePayment(
  customerId: string,
  amount: number,
  description: string,
  metadata?: Record<string, string>
) {
  try {
    const paymentIntent = await stripeGateway.createPaymentIntent({
      amount,
      currency: 'usd',
      customerId,
      description,
      metadata,
      setupFutureUsage: 'off_session', // Save payment method for future use
    });

    console.log('Payment intent created:', paymentIntent.id);

    // Return client secret to frontend for payment confirmation
    return {
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

/**
 * Example 5: Manage Payment Methods
 * Add and set default payment method
 */
export async function handlePaymentMethodUpdate(
  customerId: string,
  paymentMethodId: string
) {
  try {
    // Attach payment method to customer
    await stripeGateway.attachPaymentMethod(customerId, paymentMethodId);

    // Set as default
    await stripeGateway.setDefaultPaymentMethod(customerId, paymentMethodId);

    console.log('Default payment method updated');

    // Get all payment methods
    const methods = await stripeGateway.getPaymentMethods(customerId);

    return methods;
  } catch (error) {
    console.error('Error updating payment method:', error);
    throw error;
  }
}

/**
 * Example 6: Customer Billing Portal
 * Allow customers to manage their subscription
 */
export async function handleBillingPortalAccess(
  customerId: string,
  returnUrl: string
) {
  try {
    const portal = await stripeGateway.createBillingPortalSession(
      customerId,
      returnUrl
    );

    console.log('Billing portal session created');

    // Redirect user to portal.url
    return portal.url;
  } catch (error) {
    console.error('Error creating billing portal:', error);
    throw error;
  }
}

/**
 * Example 7: Sync Pricing Plans
 * Synchronize your pricing plans with Stripe
 */
export async function syncPricingPlans() {
  try {
    // Define your pricing plans
    const plans: PricingPlan[] = [
      {
        id: 'plan_starter',
        name: 'Starter Plan',
        description: 'Perfect for small teams',
        prices: [
          {
            amount: 999, // $9.99
            currency: 'usd',
            interval: 'month',
          },
          {
            amount: 9990, // $99.90 (save 16%)
            currency: 'usd',
            interval: 'year',
          },
        ],
        features: [
          'Up to 1,000 chats/month',
          'Basic analytics',
          'Email support',
        ],
        isActive: true,
      },
      {
        id: 'plan_professional',
        name: 'Professional Plan',
        description: 'For growing businesses',
        prices: [
          {
            amount: 2999, // $29.99
            currency: 'usd',
            interval: 'month',
          },
          {
            amount: 29990, // $299.90 (save 16%)
            currency: 'usd',
            interval: 'year',
          },
        ],
        features: [
          'Unlimited chats',
          'Advanced analytics',
          'Priority support',
          'Custom branding',
        ],
        isActive: true,
      },
      {
        id: 'plan_enterprise',
        name: 'Enterprise Plan',
        description: 'For large organizations',
        prices: [
          {
            amount: 9999, // $99.99
            currency: 'usd',
            interval: 'month',
          },
          {
            amount: 99990, // $999.90 (save 16%)
            currency: 'usd',
            interval: 'year',
          },
        ],
        features: [
          'Unlimited everything',
          'Dedicated support',
          'SLA guarantee',
          'Custom integrations',
        ],
        isActive: true,
      },
    ];

    // Sync all plans to Stripe
    for (const plan of plans) {
      await stripeGateway.syncProduct(plan);
      console.log(`Synced plan: ${plan.name}`);
    }

    console.log('All pricing plans synced successfully');
  } catch (error) {
    console.error('Error syncing pricing plans:', error);
    throw error;
  }
}

/**
 * Example 8: Pause and Resume Subscription
 * Temporary pause for customer retention
 */
export async function handleSubscriptionPause(
  subscriptionId: string,
  action: 'pause' | 'resume'
) {
  try {
    let subscription;

    if (action === 'pause') {
      subscription = await stripeGateway.pauseSubscription(subscriptionId);
      console.log('Subscription paused');
      // Keep limited access or show "paused" state in UI
    } else {
      subscription = await stripeGateway.resumeSubscription(subscriptionId);
      console.log('Subscription resumed');
      // Restore full access
    }

    return subscription;
  } catch (error) {
    console.error('Error managing subscription pause:', error);
    throw error;
  }
}

/**
 * Example 9: Apply Promo Code
 * Create checkout with promotional code
 */
export async function handlePromoCheckout(
  customerId: string,
  priceId: string,
  promoCode: string,
  successUrl: string,
  cancelUrl: string
) {
  try {
    const session = await stripeGateway.createCheckoutSession({
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      promoCode, // Will be validated by Stripe
      allowPromotionCodes: true,
    });

    console.log('Checkout with promo code created:', session.url);

    return session;
  } catch (error) {
    console.error('Error creating promo checkout:', error);
    throw error;
  }
}

/**
 * Example 10: Webhook Event Handler
 * Process Stripe webhook events
 */
export async function processStripeWebhook(
  rawBody: Buffer,
  signature: string
) {
  try {
    // Construct and verify event
    const event = await stripeGateway.constructWebhookEvent(
      rawBody,
      signature
    );

    console.log('Webhook event received:', event.type);

    // Handle the event
    await stripeGateway.handleWebhookEvent(event);

    // Additional custom handling
    switch (event.type) {
      case 'checkout.session.completed':
        // Activate user's subscription in your database
        console.log('Checkout completed - activate subscription');
        break;

      case 'customer.subscription.deleted':
        // Revoke user access
        console.log('Subscription deleted - revoke access');
        break;

      case 'invoice.payment_failed':
        // Send payment failed notification
        console.log('Payment failed - notify user');
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
}

/**
 * Example 11: Create Custom Price
 * Create a custom price for enterprise deals
 */
export async function createCustomPrice(
  productId: string,
  customAmount: number,
  interval: 'month' | 'year'
) {
  try {
    const price = await stripeGateway.createPrice({
      productId,
      amount: customAmount,
      currency: 'usd',
      interval,
      nickname: `Custom ${interval}ly price`,
      metadata: {
        type: 'custom',
        createdAt: new Date().toISOString(),
      },
    });

    console.log('Custom price created:', price.id);

    return price;
  } catch (error) {
    console.error('Error creating custom price:', error);
    throw error;
  }
}

/**
 * Example 12: Get Customer Subscription Details
 * Retrieve complete subscription information
 */
export async function getCustomerSubscriptionDetails(subscriptionId: string) {
  try {
    const subscription = await stripeGateway.getSubscription(subscriptionId);

    console.log('Subscription details:');
    console.log('- Status:', subscription.status);
    console.log('- Current period:', subscription.currentPeriodStart, 'to', subscription.currentPeriodEnd);
    console.log('- Cancel at period end:', subscription.cancelAtPeriodEnd);

    if (subscription.trialEnd) {
      console.log('- Trial ends:', subscription.trialEnd);
    }

    return subscription;
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
}
