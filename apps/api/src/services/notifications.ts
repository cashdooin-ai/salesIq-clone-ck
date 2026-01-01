import { prisma } from '@nexvo/database';
import { queueEmail } from '../queues/email.queue.js';
import {
  welcomeEmail,
  passwordResetEmail,
  newConversationEmail,
  missedChatEmail,
  chatTranscriptEmail,
  ChatMessage,
} from '../templates/emails/index.js';
import { config } from '../config/index.js';

export interface NotificationSettings {
  email?: {
    enabled?: boolean;
    newConversations?: boolean;
    missedChats?: boolean;
    mentions?: boolean;
    dailyDigest?: boolean;
  };
  push?: {
    enabled?: boolean;
    newConversations?: boolean;
    newMessages?: boolean;
  };
  sound?: {
    enabled?: boolean;
  };
}

class NotificationService {
  /**
   * Send welcome email to a new user
   */
  async sendWelcomeEmail(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: true,
        },
      });

      if (!user) {
        console.error('[Notifications] User not found:', userId);
        return { success: false, error: 'User not found' };
      }

      const template = welcomeEmail({
        name: user.name,
        email: user.email,
        organizationName: user.organization.name,
        dashboardUrl: `${config.webUrl}/dashboard`,
      });

      await queueEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }, {
        userId: user.id,
        type: 'welcome',
      });

      console.log('[Notifications] Welcome email queued:', {
        userId: user.id,
        email: user.email,
      });

      return { success: true };
    } catch (error) {
      console.error('[Notifications] Failed to send welcome email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userId: string, resetToken: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        console.error('[Notifications] User not found:', userId);
        return { success: false, error: 'User not found' };
      }

      const resetUrl = `${config.webUrl}/reset-password?token=${resetToken}`;

      const template = passwordResetEmail({
        name: user.name,
        resetUrl,
        expiresIn: '1 hour',
      });

      await queueEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }, {
        userId: user.id,
        type: 'password-reset',
      });

      console.log('[Notifications] Password reset email queued:', {
        userId: user.id,
        email: user.email,
      });

      return { success: true };
    } catch (error) {
      console.error('[Notifications] Failed to send password reset email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Notify operators about a new conversation
   */
  async notifyNewConversation(
    conversationId: string,
    operatorIds?: string[]
  ) {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          visitor: true,
          operator: true,
          organization: true,
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      });

      if (!conversation) {
        console.error('[Notifications] Conversation not found:', conversationId);
        return { success: false, error: 'Conversation not found' };
      }

      // Get operators to notify
      let operators: Array<{ id: string; email: string; name: string; settings: any }>;

      if (operatorIds && operatorIds.length > 0) {
        // Notify specific operators
        operators = await prisma.user.findMany({
          where: {
            id: { in: operatorIds },
            organizationId: conversation.organizationId,
          },
          select: {
            id: true,
            email: true,
            name: true,
            settings: true,
          },
        });
      } else {
        // Notify all online operators in the organization
        operators = await prisma.user.findMany({
          where: {
            organizationId: conversation.organizationId,
            role: { in: ['OPERATOR', 'SUPERVISOR', 'ADMIN', 'OWNER'] },
            status: { in: ['ONLINE', 'AWAY'] },
          },
          select: {
            id: true,
            email: true,
            name: true,
            settings: true,
          },
        });
      }

      if (operators.length === 0) {
        console.log('[Notifications] No operators to notify');
        return { success: true, notified: 0 };
      }

      const firstMessage = conversation.messages[0];
      if (!firstMessage) {
        console.log('[Notifications] No messages in conversation');
        return { success: true, notified: 0 };
      }

      // Queue emails for each operator
      const conversationUrl = `${config.webUrl}/conversations/${conversation.id}`;

      for (const operator of operators) {
        // Check notification settings
        const settings = operator.settings as NotificationSettings | null;
        const emailEnabled = settings?.email?.enabled !== false;
        const newConversationsEnabled = settings?.email?.newConversations !== false;

        if (!emailEnabled || !newConversationsEnabled) {
          console.log('[Notifications] Email notifications disabled for operator:', operator.id);
          continue;
        }

        const template = newConversationEmail({
          operatorName: operator.name,
          visitorName: conversation.visitor.name || 'Anonymous',
          visitorEmail: conversation.visitor.email || undefined,
          message: firstMessage.content,
          conversationUrl,
          priority: conversation.priority,
        });

        await queueEmail({
          to: operator.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        }, {
          conversationId: conversation.id,
          operatorId: operator.id,
          type: 'new-conversation',
        });
      }

      console.log('[Notifications] New conversation notifications queued:', {
        conversationId: conversation.id,
        operators: operators.length,
      });

      return { success: true, notified: operators.length };
    } catch (error) {
      console.error('[Notifications] Failed to notify new conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Notify about a missed chat
   */
  async notifyMissedChat(conversationId: string) {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          visitor: true,
          operator: true,
          organization: true,
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      });

      if (!conversation) {
        console.error('[Notifications] Conversation not found:', conversationId);
        return { success: false, error: 'Conversation not found' };
      }

      // Get all admins and supervisors
      const admins = await prisma.user.findMany({
        where: {
          organizationId: conversation.organizationId,
          role: { in: ['SUPERVISOR', 'ADMIN', 'OWNER'] },
        },
        select: {
          id: true,
          email: true,
          name: true,
          settings: true,
        },
      });

      if (admins.length === 0) {
        console.log('[Notifications] No admins to notify about missed chat');
        return { success: true, notified: 0 };
      }

      const firstMessage = conversation.messages[0];
      if (!firstMessage) {
        return { success: true, notified: 0 };
      }

      const conversationUrl = `${config.webUrl}/conversations/${conversation.id}`;

      for (const admin of admins) {
        // Check notification settings
        const settings = admin.settings as NotificationSettings | null;
        const emailEnabled = settings?.email?.enabled !== false;
        const missedChatsEnabled = settings?.email?.missedChats !== false;

        if (!emailEnabled || !missedChatsEnabled) {
          continue;
        }

        const template = missedChatEmail({
          operatorName: admin.name,
          visitorName: conversation.visitor.name || 'Anonymous',
          visitorEmail: conversation.visitor.email || undefined,
          message: firstMessage.content,
          conversationUrl,
          missedAt: conversation.createdAt,
        });

        await queueEmail({
          to: admin.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        }, {
          conversationId: conversation.id,
          adminId: admin.id,
          type: 'missed-chat',
        });
      }

      console.log('[Notifications] Missed chat notifications queued:', {
        conversationId: conversation.id,
        admins: admins.length,
      });

      return { success: true, notified: admins.length };
    } catch (error) {
      console.error('[Notifications] Failed to notify missed chat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send chat transcript to an email address
   */
  async sendChatTranscript(conversationId: string, email: string) {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          visitor: true,
          operator: true,
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: true,
            },
          },
        },
      });

      if (!conversation) {
        console.error('[Notifications] Conversation not found:', conversationId);
        return { success: false, error: 'Conversation not found' };
      }

      // Format messages
      const messages: ChatMessage[] = conversation.messages.map(msg => ({
        sender: msg.senderType === 'VISITOR'
          ? conversation.visitor.name || 'Visitor'
          : msg.sender?.name || 'Operator',
        senderType: msg.senderType as 'VISITOR' | 'OPERATOR' | 'BOT',
        message: msg.content,
        timestamp: msg.createdAt,
      }));

      const template = chatTranscriptEmail({
        recipientName: conversation.visitor.name || 'Customer',
        conversationId: conversation.id,
        messages,
        startedAt: conversation.createdAt,
        endedAt: conversation.closedAt || undefined,
        visitorName: conversation.visitor.name || 'Anonymous',
        operatorName: conversation.operator?.name,
        rating: conversation.rating || undefined,
        feedback: conversation.feedback || undefined,
      });

      await queueEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }, {
        conversationId: conversation.id,
        type: 'chat-transcript',
      });

      console.log('[Notifications] Chat transcript queued:', {
        conversationId: conversation.id,
        email,
      });

      return { success: true };
    } catch (error) {
      console.error('[Notifications] Failed to send chat transcript:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export class for testing
export { NotificationService };
