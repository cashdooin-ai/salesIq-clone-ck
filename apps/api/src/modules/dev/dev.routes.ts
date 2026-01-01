import { FastifyInstance } from 'fastify';
import { config } from '../../config/index.js';
import {
  welcomeEmail,
  passwordResetEmail,
  newConversationEmail,
  missedChatEmail,
  chatTranscriptEmail,
} from '../../templates/emails/index.js';
import { getEmailQueueStats } from '../../queues/email.queue.js';

/**
 * Development-only routes for testing and previewing features
 */
export async function devRoutes(fastify: FastifyInstance) {
  // Only enable in development
  if (!config.isDev) {
    return;
  }

  fastify.addHook('preHandler', async (request, reply) => {
    // Add a warning header
    reply.header('X-Dev-Mode', 'true');
  });

  /**
   * Preview email templates
   * GET /api/v1/dev/email-preview/:template
   */
  fastify.get('/email-preview/:template', async (request, reply) => {
    const { template } = request.params as { template: string };

    let emailTemplate;

    try {
      switch (template) {
        case 'welcome':
          emailTemplate = welcomeEmail({
            name: 'John Doe',
            email: 'john@example.com',
            organizationName: 'Acme Corp',
            dashboardUrl: `${config.webUrl}/dashboard`,
          });
          break;

        case 'password-reset':
          emailTemplate = passwordResetEmail({
            name: 'Jane Smith',
            resetUrl: `${config.webUrl}/reset-password?token=sample-token-123`,
            expiresIn: '1 hour',
          });
          break;

        case 'new-conversation':
          emailTemplate = newConversationEmail({
            operatorName: 'Sarah Johnson',
            visitorName: 'Michael Brown',
            visitorEmail: 'michael@example.com',
            message: 'Hi, I need help with my recent order. The tracking number shows delivered but I haven\'t received it yet.',
            conversationUrl: `${config.webUrl}/conversations/sample-123`,
            priority: 'HIGH',
            pageUrl: 'https://example.com/orders/track',
          });
          break;

        case 'missed-chat':
          emailTemplate = missedChatEmail({
            operatorName: 'Alex Wilson',
            visitorName: 'Emily Davis',
            visitorEmail: 'emily@example.com',
            message: 'Hello? Is anyone there? I have a question about pricing.',
            conversationUrl: `${config.webUrl}/conversations/sample-456`,
            missedAt: new Date(),
            pageUrl: 'https://example.com/pricing',
          });
          break;

        case 'chat-transcript':
          emailTemplate = chatTranscriptEmail({
            recipientName: 'Customer',
            conversationId: 'conv-789',
            messages: [
              {
                sender: 'Robert Lee',
                senderType: 'VISITOR',
                message: 'Hi, I need help with my account setup.',
                timestamp: new Date(Date.now() - 600000),
              },
              {
                sender: 'Support Agent',
                senderType: 'OPERATOR',
                message: 'Hello Robert! I\'d be happy to help you with your account setup. What specifically do you need assistance with?',
                timestamp: new Date(Date.now() - 540000),
              },
              {
                sender: 'Robert Lee',
                senderType: 'VISITOR',
                message: 'I can\'t seem to connect my payment method.',
                timestamp: new Date(Date.now() - 480000),
              },
              {
                sender: 'Support Agent',
                senderType: 'OPERATOR',
                message: 'I see. Let me guide you through the process. First, go to Settings > Billing.',
                timestamp: new Date(Date.now() - 420000),
              },
              {
                sender: 'Robert Lee',
                senderType: 'VISITOR',
                message: 'Got it, thanks!',
                timestamp: new Date(Date.now() - 360000),
              },
            ],
            startedAt: new Date(Date.now() - 600000),
            endedAt: new Date(Date.now() - 300000),
            visitorName: 'Robert Lee',
            operatorName: 'Support Agent',
            rating: 5,
            feedback: 'Very helpful and quick response!',
          });
          break;

        default:
          return reply.status(404).send({
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: `Template '${template}' not found`,
              availableTemplates: [
                'welcome',
                'password-reset',
                'new-conversation',
                'missed-chat',
                'chat-transcript',
              ],
            },
          });
      }

      // Return HTML for browser preview
      reply.type('text/html');
      return emailTemplate.html;
    } catch (error) {
      console.error('[Dev] Email preview error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PREVIEW_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate preview',
        },
      });
    }
  });

  /**
   * List all available email templates
   * GET /api/v1/dev/email-templates
   */
  fastify.get('/email-templates', async (request, reply) => {
    return {
      success: true,
      data: {
        templates: [
          {
            name: 'welcome',
            description: 'Welcome email sent after user registration',
            previewUrl: `${config.apiUrl}/api/v1/dev/email-preview/welcome`,
          },
          {
            name: 'password-reset',
            description: 'Password reset email with reset link',
            previewUrl: `${config.apiUrl}/api/v1/dev/email-preview/password-reset`,
          },
          {
            name: 'new-conversation',
            description: 'New chat notification for operators',
            previewUrl: `${config.apiUrl}/api/v1/dev/email-preview/new-conversation`,
          },
          {
            name: 'missed-chat',
            description: 'Missed chat notification',
            previewUrl: `${config.apiUrl}/api/v1/dev/email-preview/missed-chat`,
          },
          {
            name: 'chat-transcript',
            description: 'Chat transcript email',
            previewUrl: `${config.apiUrl}/api/v1/dev/email-preview/chat-transcript`,
          },
        ],
      },
    };
  });

  /**
   * Get email queue statistics
   * GET /api/v1/dev/email-queue-stats
   */
  fastify.get('/email-queue-stats', async (request, reply) => {
    try {
      const stats = await getEmailQueueStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('[Dev] Queue stats error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'QUEUE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get queue stats',
        },
      });
    }
  });

  console.log('[Dev Routes] Development routes registered');
  console.log('[Dev Routes] Email preview available at: /api/v1/dev/email-preview/:template');
}
