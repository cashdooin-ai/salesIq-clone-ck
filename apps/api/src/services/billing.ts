import { prisma } from '@nexvo/database';
import type { Invoice, InvoiceStatus } from '@nexvo/database';
import { emailService } from './email.js';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface CreateInvoiceInput {
  organizationId: string;
  subscriptionId?: string;
  lineItems: LineItem[];
  dueDate?: Date;
  notes?: string;
}

interface TaxCalculation {
  taxAmount: number;
  taxRate: number;
  taxType: string;
}

interface InvoiceWithDetails extends Invoice {
  organization?: {
    id: string;
    name: string;
    billingEmail: string | null;
    billingCountry: string | null;
  };
  subscription?: {
    id: string;
    plan: {
      displayName: string;
    };
  } | null;
}

class BillingService {
  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    try {
      const { organizationId, subscriptionId, lineItems, dueDate, notes } = input;

      // Get organization
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Calculate subtotal
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

      // Calculate tax
      const taxCalc = await this.calculateTax(
        subtotal,
        organization.billingCountry || 'US',
        organization.taxId || undefined
      );

      // Calculate total
      const total = subtotal + taxCalc.taxAmount;
      const amountDue = total;

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Set due date (default: 7 days from now)
      const invoiceDueDate = dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Get period from subscription if provided
      let periodStart: Date | undefined;
      let periodEnd: Date | undefined;

      if (subscriptionId) {
        const subscription = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
        });

        if (subscription) {
          periodStart = subscription.currentPeriodStart;
          periodEnd = subscription.currentPeriodEnd;
        }
      }

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          organizationId,
          subscriptionId,
          invoiceNumber,
          subtotal,
          discount: 0,
          tax: taxCalc.taxAmount,
          total,
          amountPaid: 0,
          amountDue,
          currency: organization.currency,
          taxRate: taxCalc.taxRate,
          taxType: taxCalc.taxType,
          status: 'PENDING',
          issuedAt: new Date(),
          dueAt: invoiceDueDate,
          periodStart,
          periodEnd,
          lineItems: lineItems as any,
          notes,
        },
      });

      console.log(`[Billing Service] Created invoice: ${invoice.invoiceNumber} for org: ${organizationId}`);
      return invoice;
    } catch (error) {
      console.error('[Billing Service] Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Generate a unique invoice number
   */
  async generateInvoiceNumber(): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      // Get the count of invoices this month
      const startOfMonth = new Date(year, now.getMonth(), 1);
      const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);

      const count = await prisma.invoice.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      const sequence = String(count + 1).padStart(4, '0');
      const invoiceNumber = `INV-${year}${month}-${sequence}`;

      console.log(`[Billing Service] Generated invoice number: ${invoiceNumber}`);
      return invoiceNumber;
    } catch (error) {
      console.error('[Billing Service] Error generating invoice number:', error);
      throw new Error('Failed to generate invoice number');
    }
  }

  /**
   * Calculate tax based on country and amount
   */
  async calculateTax(
    amount: number,
    country: string,
    taxId?: string
  ): Promise<TaxCalculation> {
    try {
      const countryCode = country.toUpperCase();
      let taxRate = 0;
      let taxType = 'None';

      // India - GST 18%
      if (countryCode === 'IN') {
        taxRate = 18;
        taxType = 'GST';

        // If valid GST number provided, might apply reverse charge or different rules
        if (taxId && taxId.startsWith('GST')) {
          console.log(`[Billing Service] Valid GST number provided: ${taxId}`);
        }
      }
      // European Union - VAT (varies by country, using 20% as example)
      else if (['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'SE', 'PL'].includes(countryCode)) {
        taxRate = 20;
        taxType = 'VAT';
      }
      // Canada - GST/HST
      else if (countryCode === 'CA') {
        taxRate = 13; // HST (varies by province)
        taxType = 'HST';
      }
      // Australia - GST
      else if (countryCode === 'AU') {
        taxRate = 10;
        taxType = 'GST';
      }
      // US - Generally no federal sales tax, would need state-level logic
      else if (countryCode === 'US') {
        taxRate = 0;
        taxType = 'None';
      }

      const taxAmount = Math.floor((amount * taxRate) / 100);

      console.log(`[Billing Service] Tax calculation - Country: ${country}, Rate: ${taxRate}%, Amount: ${taxAmount}`);

      return {
        taxAmount,
        taxRate,
        taxType,
      };
    } catch (error) {
      console.error('[Billing Service] Error calculating tax:', error);
      // Return zero tax on error
      return {
        taxAmount: 0,
        taxRate: 0,
        taxType: 'None',
      };
    }
  }

  /**
   * Mark invoice as paid
   */
  async markInvoiceAsPaid(invoiceId: string, paymentId: string): Promise<Invoice> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Get payment details
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const amountPaid = invoice.amountPaid + payment.amount;
      const amountDue = invoice.total - amountPaid;

      let status: InvoiceStatus = 'PENDING';
      if (amountDue <= 0) {
        status = 'PAID';
      } else if (amountPaid > 0) {
        status = 'PARTIALLY_PAID';
      }

      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid,
          amountDue: Math.max(0, amountDue),
          status,
          paidAt: status === 'PAID' ? new Date() : invoice.paidAt,
        },
      });

      console.log(`[Billing Service] Marked invoice ${invoice.invoiceNumber} as ${status}`);
      return updatedInvoice;
    } catch (error) {
      console.error('[Billing Service] Error marking invoice as paid:', error);
      throw error;
    }
  }

  /**
   * Send invoice email to customer
   */
  async sendInvoiceEmail(invoiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          organization: true,
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (!invoice.organization.billingEmail) {
        throw new Error('No billing email address on file');
      }

      // Format currency
      const formatCurrency = (amount: number, currency: string) => {
        const value = amount / 100; // Convert from cents/paise
        if (currency === 'USD') {
          return `$${value.toFixed(2)}`;
        } else if (currency === 'INR') {
          return `₹${value.toFixed(2)}`;
        }
        return `${value.toFixed(2)} ${currency}`;
      };

      // Build line items HTML
      const lineItemsHtml = (invoice.lineItems as LineItem[])
        .map(
          (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice, invoice.currency)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.amount, invoice.currency)}</td>
        </tr>
      `
        )
        .join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice ${invoice.invoiceNumber}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h1 style="margin: 0; color: #6366f1; font-size: 28px;">Nexvo</h1>
            <p style="margin: 10px 0 0 0; color: #666;">Customer Engagement Platform</p>
          </div>

          <div style="background: white; padding: 30px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h2 style="margin-top: 0; color: #111;">Invoice ${invoice.invoiceNumber}</h2>

            <div style="margin-bottom: 30px;">
              <p style="margin: 5px 0;"><strong>Bill To:</strong> ${invoice.organization.name}</p>
              <p style="margin: 5px 0;"><strong>Invoice Date:</strong> ${invoice.issuedAt.toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Due Date:</strong> ${invoice.dueAt.toLocaleDateString()}</p>
              ${invoice.periodStart && invoice.periodEnd ? `
              <p style="margin: 5px 0;"><strong>Billing Period:</strong> ${invoice.periodStart.toLocaleDateString()} - ${invoice.periodEnd.toLocaleDateString()}</p>
              ` : ''}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
            </table>

            <div style="text-align: right; margin-bottom: 30px;">
              <p style="margin: 8px 0;"><strong>Subtotal:</strong> ${formatCurrency(invoice.subtotal, invoice.currency)}</p>
              ${invoice.discount > 0 ? `
              <p style="margin: 8px 0; color: #10b981;"><strong>Discount:</strong> -${formatCurrency(invoice.discount, invoice.currency)}</p>
              ` : ''}
              ${invoice.tax > 0 ? `
              <p style="margin: 8px 0;"><strong>${invoice.taxType} (${invoice.taxRate}%):</strong> ${formatCurrency(invoice.tax, invoice.currency)}</p>
              ` : ''}
              <p style="margin: 8px 0; font-size: 20px; color: #6366f1;"><strong>Total:</strong> ${formatCurrency(invoice.total, invoice.currency)}</p>
              ${invoice.amountPaid > 0 ? `
              <p style="margin: 8px 0; color: #10b981;"><strong>Amount Paid:</strong> ${formatCurrency(invoice.amountPaid, invoice.currency)}</p>
              ` : ''}
              <p style="margin: 8px 0; font-size: 18px; color: #dc2626;"><strong>Amount Due:</strong> ${formatCurrency(invoice.amountDue, invoice.currency)}</p>
            </div>

            ${invoice.notes ? `
            <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
              <p style="margin: 0; font-size: 14px;"><strong>Notes:</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">${invoice.notes}</p>
            </div>
            ` : ''}
          </div>

          <div style="margin-top: 30px; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>Thank you for your business!</p>
            <p style="margin-top: 10px;">If you have any questions, please contact us at support@nexvo.io</p>
          </div>
        </body>
        </html>
      `;

      const result = await emailService.sendEmail({
        to: invoice.organization.billingEmail,
        subject: `Invoice ${invoice.invoiceNumber} from Nexvo`,
        html: emailHtml,
      });

      console.log(`[Billing Service] Sent invoice email for ${invoice.invoiceNumber}`);
      return result;
    } catch (error) {
      console.error('[Billing Service] Error sending invoice email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all invoices for an organization
   */
  async getInvoices(organizationId: string): Promise<Invoice[]> {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { organizationId },
        orderBy: {
          issuedAt: 'desc',
        },
      });

      return invoices;
    } catch (error) {
      console.error('[Billing Service] Error fetching invoices:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: string): Promise<InvoiceWithDetails | null> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              billingEmail: true,
              billingCountry: true,
            },
          },
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      return invoice;
    } catch (error) {
      console.error('[Billing Service] Error fetching invoice:', error);
      throw error;
    }
  }

  /**
   * Generate invoice PDF
   * This is a placeholder - in production, you'd use a library like PDFKit or Puppeteer
   */
  async generateInvoicePDF(invoiceId: string): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // In a real implementation, you would:
      // 1. Generate PDF using PDFKit, Puppeteer, or similar
      // 2. Upload to S3 or storage service
      // 3. Update invoice with PDF URL
      // 4. Return the PDF URL

      console.log(`[Billing Service] PDF generation requested for invoice: ${invoice.invoiceNumber}`);
      console.log('[Billing Service] PDF generation not implemented - would generate and upload PDF here');

      // Placeholder - return success with mock URL
      const pdfUrl = `/invoices/${invoice.invoiceNumber}.pdf`;

      // Update invoice with PDF URL
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          pdfUrl,
        },
      });

      return {
        success: true,
        pdfUrl,
      };
    } catch (error) {
      console.error('[Billing Service] Error generating PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Void an invoice
   */
  async voidInvoice(invoiceId: string): Promise<Invoice> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'PAID') {
        throw new Error('Cannot void a paid invoice. Please issue a refund instead.');
      }

      const voidedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'VOID',
          amountDue: 0,
        },
      });

      console.log(`[Billing Service] Voided invoice: ${invoice.invoiceNumber}`);
      return voidedInvoice;
    } catch (error) {
      console.error('[Billing Service] Error voiding invoice:', error);
      throw error;
    }
  }

  /**
   * Check for overdue invoices and update status
   */
  async checkOverdueInvoices(): Promise<number> {
    try {
      const now = new Date();

      const result = await prisma.invoice.updateMany({
        where: {
          status: 'PENDING',
          dueAt: {
            lt: now,
          },
        },
        data: {
          status: 'OVERDUE',
        },
      });

      console.log(`[Billing Service] Marked ${result.count} invoices as overdue`);
      return result.count;
    } catch (error) {
      console.error('[Billing Service] Error checking overdue invoices:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const billingService = new BillingService();

// Export class for testing
export { BillingService };

// Export types
export type {
  LineItem,
  CreateInvoiceInput,
  TaxCalculation,
  InvoiceWithDetails,
};
