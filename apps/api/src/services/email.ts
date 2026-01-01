import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/index.js';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = config.isDev;
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter
   */
  private initializeTransporter() {
    try {
      // In development, use a different strategy
      if (this.isDevelopment) {
        // Use a test account or log emails
        console.log('[Email Service] Running in development mode');

        // If SMTP credentials are provided, use them
        if (config.smtp.user && config.smtp.pass) {
          this.transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.port === 465,
            auth: {
              user: config.smtp.user,
              pass: config.smtp.pass,
            },
          });
          console.log('[Email Service] SMTP configured with credentials');
        } else {
          // Create a mock transporter for development
          this.transporter = nodemailer.createTransport({
            jsonTransport: true,
          });
          console.log('[Email Service] Using mock transporter (emails will be logged)');
        }
      } else {
        // Production - require SMTP credentials
        if (!config.smtp.user || !config.smtp.pass) {
          throw new Error('SMTP credentials are required in production');
        }

        this.transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.port === 465,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
          },
        });
        console.log('[Email Service] SMTP transporter initialized');
      }
    } catch (error) {
      console.error('[Email Service] Failed to initialize transporter:', error);
      this.transporter = null;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.error('[Email Service] Transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('[Email Service] SMTP connection verified');
      return true;
    } catch (error) {
      console.error('[Email Service] SMTP connection failed:', error);
      return false;
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      const error = 'Email transporter not initialized';
      console.error('[Email Service]', error);
      return { success: false, error };
    }

    try {
      const mailOptions = {
        from: options.from || config.smtp.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments,
      };

      // In development with mock transporter, just log the email
      if (this.isDevelopment && !config.smtp.user) {
        console.log('\n========== EMAIL (Development Mode) ==========');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('From:', mailOptions.from);
        console.log('HTML Length:', mailOptions.html.length);
        if (mailOptions.text) {
          console.log('Text:', mailOptions.text);
        }
        console.log('=============================================\n');

        return {
          success: true,
          messageId: `dev-${Date.now()}@nexvo.local`,
        };
      }

      const info = await this.transporter.sendMail(mailOptions);

      console.log('[Email Service] Email sent:', {
        messageId: info.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Email Service] Failed to send email:', {
        error: errorMessage,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send an email using a template
   */
  async sendTemplateEmail(
    to: string | string[],
    template: EmailTemplate,
    options?: Partial<EmailOptions>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      ...options,
    });
  }

  /**
   * Send bulk emails (with rate limiting consideration)
   */
  async sendBulkEmails(emails: EmailOptions[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{ success: boolean; messageId?: string; error?: string }>;
  }> {
    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email))
    );

    const processedResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    const successful = processedResults.filter(r => r.success).length;
    const failed = processedResults.length - successful;

    console.log('[Email Service] Bulk send completed:', {
      total: emails.length,
      successful,
      failed,
    });

    return {
      successful,
      failed,
      results: processedResults,
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export class for testing
export { EmailService };
