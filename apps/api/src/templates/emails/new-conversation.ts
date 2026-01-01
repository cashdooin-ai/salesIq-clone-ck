import { EmailTemplate } from '../../services/email.js';
import { emailLayout } from './layout.js';
import { config } from '../../config/index.js';

export interface NewConversationEmailData {
  operatorName: string;
  visitorName: string;
  visitorEmail?: string;
  message: string;
  conversationUrl: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  pageUrl?: string;
}

export function newConversationEmail(data: NewConversationEmailData): EmailTemplate {
  const priorityLabels = {
    LOW: '🟢 Low',
    NORMAL: '🔵 Normal',
    HIGH: '🟠 High',
    URGENT: '🔴 Urgent',
  };

  const priority = data.priority || 'NORMAL';
  const priorityLabel = priorityLabels[priority];

  const html = emailLayout(
    `
    <h1>New Conversation</h1>

    <p>Hi ${data.operatorName},</p>

    <p>
      You have a new conversation from <strong>${data.visitorName}</strong>.
      ${data.visitorEmail ? `(${data.visitorEmail})` : ''}
    </p>

    <div class="info-box">
      <p style="margin: 0 0 8px 0;"><strong>Priority:</strong> ${priorityLabel}</p>
      ${data.pageUrl ? `<p style="margin: 0 0 8px 0;"><strong>Page:</strong> ${data.pageUrl}</p>` : ''}
      <p style="margin: 0;"><strong>Message:</strong></p>
      <p style="margin: 8px 0 0 0; font-size: 14px; font-style: italic;">
        "${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}"
      </p>
    </div>

    <center>
      <a href="${data.conversationUrl}" class="button">View Conversation</a>
    </center>

    <p class="text-muted" style="margin-top: 30px;">
      Reply quickly to provide the best customer experience! 🚀
    </p>

    <p>
      Best regards,<br>
      Nexvo Notifications
    </p>
    `,
    `New conversation from ${data.visitorName}`
  );

  const text = `
New Conversation

Hi ${data.operatorName},

You have a new conversation from ${data.visitorName}${data.visitorEmail ? ` (${data.visitorEmail})` : ''}.

Priority: ${priorityLabel}
${data.pageUrl ? `Page: ${data.pageUrl}` : ''}

Message:
"${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}"

View Conversation: ${data.conversationUrl}

Reply quickly to provide the best customer experience!

Best regards,
Nexvo Notifications

---
© ${new Date().getFullYear()} Nexvo. All rights reserved.
  `.trim();

  return {
    subject: `New conversation from ${data.visitorName}`,
    html,
    text,
  };
}
