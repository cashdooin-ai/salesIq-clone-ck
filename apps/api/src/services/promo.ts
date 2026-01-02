import { prisma } from '@nexvo/database';
import type { PromoCode, DiscountType, PromoCodeUsage } from '@nexvo/database';

interface CreatePromoCodeInput {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  discountCurrency?: string;
  applicablePlans?: string[];
  validFrom?: Date;
  validUntil?: Date;
  maxUses?: number;
  maxUsesPerOrg?: number;
  durationMonths?: number;
  minAmount?: number;
  firstTimeOnly?: boolean;
  newSignupsOnly?: boolean;
  campaign?: string;
}

interface ValidatePromoCodeResult {
  valid: boolean;
  error?: string;
  promoCode?: PromoCode;
  discountAmount?: number;
  finalAmount?: number;
}

interface ApplyPromoCodeResult {
  success: boolean;
  error?: string;
  discountApplied?: number;
  promoCodeUsage?: PromoCodeUsage;
}

interface PromoCodeStats {
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  totalUses: number;
  maxUses: number | null;
  maxUsesPerOrg: number;
  totalDiscountGiven: number;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date | null;
  createdAt: Date;
}

interface PromoCodeFilters {
  isActive?: boolean;
  campaign?: string;
  discountType?: DiscountType;
  validOnly?: boolean;
}

class PromoService {
  /**
   * Create a new promo code
   */
  async createPromoCode(data: CreatePromoCodeInput): Promise<PromoCode> {
    try {
      const {
        code,
        description,
        discountType,
        discountValue,
        discountCurrency,
        applicablePlans = [],
        validFrom = new Date(),
        validUntil,
        maxUses,
        maxUsesPerOrg = 1,
        durationMonths,
        minAmount,
        firstTimeOnly = false,
        newSignupsOnly = false,
        campaign,
      } = data;

      // Validate discount value
      if (discountType === 'PERCENTAGE' && (discountValue <= 0 || discountValue > 100)) {
        throw new Error('Percentage discount must be between 1 and 100');
      }

      if (discountType === 'FIXED' && !discountCurrency) {
        throw new Error('Currency is required for fixed discount');
      }

      // Check if code already exists
      const existingCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (existingCode) {
        throw new Error('Promo code already exists');
      }

      // Create promo code
      const promoCode = await prisma.promoCode.create({
        data: {
          code: code.toUpperCase(),
          description,
          discountType,
          discountValue,
          discountCurrency,
          applicablePlans,
          validFrom,
          validUntil,
          maxUses,
          maxUsesPerOrg,
          durationMonths,
          minAmount,
          firstTimeOnly,
          newSignupsOnly,
          campaign,
          isActive: true,
          usedCount: 0,
        },
      });

      console.log(`[Promo Service] Created promo code: ${promoCode.code}`);
      return promoCode;
    } catch (error) {
      console.error('[Promo Service] Error creating promo code:', error);
      throw error;
    }
  }

  /**
   * Validate a promo code for use
   */
  async validatePromoCode(
    code: string,
    organizationId: string,
    planId?: string,
    amount?: number
  ): Promise<ValidatePromoCodeResult> {
    try {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          usages: {
            where: {
              organizationId,
            },
          },
        },
      });

      if (!promoCode) {
        return {
          valid: false,
          error: 'Invalid promo code',
        };
      }

      // Check if active
      if (!promoCode.isActive) {
        return {
          valid: false,
          error: 'This promo code is no longer active',
        };
      }

      // Check validity period
      const now = new Date();
      if (promoCode.validFrom > now) {
        return {
          valid: false,
          error: 'This promo code is not yet valid',
        };
      }

      if (promoCode.validUntil && promoCode.validUntil < now) {
        return {
          valid: false,
          error: 'This promo code has expired',
        };
      }

      // Check max uses
      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return {
          valid: false,
          error: 'This promo code has reached its maximum number of uses',
        };
      }

      // Check max uses per organization
      const organizationUsageCount = promoCode.usages.length;
      if (organizationUsageCount >= promoCode.maxUsesPerOrg) {
        return {
          valid: false,
          error: 'You have already used this promo code',
        };
      }

      // Check applicable plans
      if (planId && promoCode.applicablePlans.length > 0 && !promoCode.applicablePlans.includes(planId)) {
        return {
          valid: false,
          error: 'This promo code is not applicable to your selected plan',
        };
      }

      // Check minimum amount
      if (amount !== undefined && promoCode.minAmount && amount < promoCode.minAmount) {
        return {
          valid: false,
          error: `This promo code requires a minimum purchase amount`,
        };
      }

      // Check first time only
      if (promoCode.firstTimeOnly) {
        const hasExistingSubscription = await prisma.subscription.findFirst({
          where: {
            organizationId,
            status: {
              in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
            },
          },
        });

        if (hasExistingSubscription) {
          return {
            valid: false,
            error: 'This promo code is only valid for first-time subscribers',
          };
        }
      }

      // Check new signups only
      if (promoCode.newSignupsOnly) {
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
        });

        if (organization) {
          const daysSinceCreation = Math.floor(
            (now.getTime() - organization.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Consider "new" if created within last 7 days
          if (daysSinceCreation > 7) {
            return {
              valid: false,
              error: 'This promo code is only valid for new signups',
            };
          }
        }
      }

      // Calculate discount amount if amount is provided
      let discountAmount = 0;
      let finalAmount = amount || 0;

      if (amount !== undefined) {
        if (promoCode.discountType === 'PERCENTAGE') {
          discountAmount = Math.floor((amount * promoCode.discountValue) / 100);
        } else if (promoCode.discountType === 'FIXED') {
          discountAmount = promoCode.discountValue;
        }

        finalAmount = Math.max(0, amount - discountAmount);
      }

      console.log(`[Promo Service] Validated promo code: ${code} for org: ${organizationId}`);
      return {
        valid: true,
        promoCode,
        discountAmount,
        finalAmount,
      };
    } catch (error) {
      console.error('[Promo Service] Error validating promo code:', error);
      return {
        valid: false,
        error: 'Failed to validate promo code',
      };
    }
  }

  /**
   * Apply a promo code and record usage
   */
  async applyPromoCode(
    code: string,
    organizationId: string,
    amount: number,
    currency: string
  ): Promise<ApplyPromoCodeResult> {
    try {
      // First validate the promo code
      const validation = await this.validatePromoCode(code, organizationId, undefined, amount);

      if (!validation.valid || !validation.promoCode) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const promoCode = validation.promoCode;
      const discountApplied = validation.discountAmount || 0;

      // Create usage record
      const usage = await prisma.promoCodeUsage.create({
        data: {
          promoCodeId: promoCode.id,
          organizationId,
          discountApplied,
          currency,
        },
      });

      // Increment used count
      await prisma.promoCode.update({
        where: { id: promoCode.id },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });

      console.log(`[Promo Service] Applied promo code: ${code} for org: ${organizationId}, discount: ${discountApplied}`);

      return {
        success: true,
        discountApplied,
        promoCodeUsage: usage,
      };
    } catch (error) {
      console.error('[Promo Service] Error applying promo code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply promo code',
      };
    }
  }

  /**
   * Get statistics for a promo code
   */
  async getPromoCodeStats(code: string): Promise<PromoCodeStats | null> {
    try {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          usages: true,
        },
      });

      if (!promoCode) {
        return null;
      }

      // Calculate total discount given
      const totalDiscountGiven = promoCode.usages.reduce(
        (sum, usage) => sum + usage.discountApplied,
        0
      );

      const stats: PromoCodeStats = {
        code: promoCode.code,
        description: promoCode.description,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        totalUses: promoCode.usedCount,
        maxUses: promoCode.maxUses,
        maxUsesPerOrg: promoCode.maxUsesPerOrg,
        totalDiscountGiven,
        isActive: promoCode.isActive,
        validFrom: promoCode.validFrom,
        validUntil: promoCode.validUntil,
        createdAt: promoCode.createdAt,
      };

      return stats;
    } catch (error) {
      console.error('[Promo Service] Error fetching promo code stats:', error);
      throw error;
    }
  }

  /**
   * Deactivate a promo code
   */
  async deactivatePromoCode(code: string): Promise<PromoCode> {
    try {
      const promoCode = await prisma.promoCode.update({
        where: { code: code.toUpperCase() },
        data: {
          isActive: false,
        },
      });

      console.log(`[Promo Service] Deactivated promo code: ${code}`);
      return promoCode;
    } catch (error) {
      console.error('[Promo Service] Error deactivating promo code:', error);
      throw error;
    }
  }

  /**
   * Reactivate a promo code
   */
  async reactivatePromoCode(code: string): Promise<PromoCode> {
    try {
      const promoCode = await prisma.promoCode.update({
        where: { code: code.toUpperCase() },
        data: {
          isActive: true,
        },
      });

      console.log(`[Promo Service] Reactivated promo code: ${code}`);
      return promoCode;
    } catch (error) {
      console.error('[Promo Service] Error reactivating promo code:', error);
      throw error;
    }
  }

  /**
   * List promo codes with filters
   */
  async listPromoCodes(filters: PromoCodeFilters = {}): Promise<PromoCode[]> {
    try {
      const { isActive, campaign, discountType, validOnly = false } = filters;

      const where: any = {};

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      if (campaign) {
        where.campaign = campaign;
      }

      if (discountType) {
        where.discountType = discountType;
      }

      if (validOnly) {
        const now = new Date();
        where.validFrom = { lte: now };
        where.OR = [
          { validUntil: null },
          { validUntil: { gte: now } },
        ];
      }

      const promoCodes = await prisma.promoCode.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });

      console.log(`[Promo Service] Listed ${promoCodes.length} promo codes`);
      return promoCodes;
    } catch (error) {
      console.error('[Promo Service] Error listing promo codes:', error);
      throw error;
    }
  }

  /**
   * Get promo code by code
   */
  async getPromoCode(code: string): Promise<PromoCode | null> {
    try {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      return promoCode;
    } catch (error) {
      console.error('[Promo Service] Error fetching promo code:', error);
      throw error;
    }
  }

  /**
   * Update a promo code
   */
  async updatePromoCode(
    code: string,
    data: Partial<CreatePromoCodeInput>
  ): Promise<PromoCode> {
    try {
      const updateData: any = {};

      if (data.description !== undefined) updateData.description = data.description;
      if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
      if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
      if (data.maxUsesPerOrg !== undefined) updateData.maxUsesPerOrg = data.maxUsesPerOrg;
      if (data.applicablePlans !== undefined) updateData.applicablePlans = data.applicablePlans;

      const promoCode = await prisma.promoCode.update({
        where: { code: code.toUpperCase() },
        data: updateData,
      });

      console.log(`[Promo Service] Updated promo code: ${code}`);
      return promoCode;
    } catch (error) {
      console.error('[Promo Service] Error updating promo code:', error);
      throw error;
    }
  }

  /**
   * Delete a promo code
   */
  async deletePromoCode(code: string): Promise<void> {
    try {
      // Check if the promo code has been used
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          usages: true,
        },
      });

      if (!promoCode) {
        throw new Error('Promo code not found');
      }

      if (promoCode.usages.length > 0) {
        throw new Error('Cannot delete a promo code that has been used. Consider deactivating it instead.');
      }

      await prisma.promoCode.delete({
        where: { code: code.toUpperCase() },
      });

      console.log(`[Promo Service] Deleted promo code: ${code}`);
    } catch (error) {
      console.error('[Promo Service] Error deleting promo code:', error);
      throw error;
    }
  }

  /**
   * Get usage history for a promo code
   */
  async getPromoCodeUsageHistory(code: string): Promise<PromoCodeUsage[]> {
    try {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!promoCode) {
        throw new Error('Promo code not found');
      }

      const usages = await prisma.promoCodeUsage.findMany({
        where: {
          promoCodeId: promoCode.id,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          usedAt: 'desc',
        },
      });

      return usages;
    } catch (error) {
      console.error('[Promo Service] Error fetching usage history:', error);
      throw error;
    }
  }

  /**
   * Check if organization has used a promo code
   */
  async hasOrganizationUsedPromoCode(organizationId: string, code: string): Promise<boolean> {
    try {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!promoCode) {
        return false;
      }

      const usage = await prisma.promoCodeUsage.findUnique({
        where: {
          promoCodeId_organizationId: {
            promoCodeId: promoCode.id,
            organizationId,
          },
        },
      });

      return !!usage;
    } catch (error) {
      console.error('[Promo Service] Error checking promo code usage:', error);
      return false;
    }
  }

  /**
   * Generate a random promo code
   */
  generateRandomCode(length: number = 8, prefix?: string): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix ? `${prefix}-` : '';

    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return code;
  }

  /**
   * Bulk create promo codes (useful for campaigns)
   */
  async bulkCreatePromoCodes(
    baseData: CreatePromoCodeInput,
    count: number,
    prefix?: string
  ): Promise<PromoCode[]> {
    try {
      const promoCodes: PromoCode[] = [];

      for (let i = 0; i < count; i++) {
        const code = this.generateRandomCode(8, prefix);

        const promoCode = await this.createPromoCode({
          ...baseData,
          code,
        });

        promoCodes.push(promoCode);
      }

      console.log(`[Promo Service] Bulk created ${count} promo codes`);
      return promoCodes;
    } catch (error) {
      console.error('[Promo Service] Error bulk creating promo codes:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const promoService = new PromoService();

// Export class for testing
export { PromoService };

// Export types
export type {
  CreatePromoCodeInput,
  ValidatePromoCodeResult,
  ApplyPromoCodeResult,
  PromoCodeStats,
  PromoCodeFilters,
};
