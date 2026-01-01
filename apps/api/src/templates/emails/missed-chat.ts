import { EmailTemplate } from '../../services/email.js';
import { emailLayout } from './layout.js';
import { config } from '../../config/index.js';

export interface MissedChatEmailData {
  operatorName: string;
  visitorName: string;
  visitorEmail?: string;
  message: string;
  conversationUrl: string;
  missedAt: Date;
  pageUrl?: string;
}

export function missedChatEmail(data: MissedChatEmailData): EmailTemplate {
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const html = emailLayout(
    `
    <h1>⚠️ Missed Chat</h1>

    <p>Hi ${data.operatorName},</p>

    <p>
      You missed a chat from <strong>${data.visitorName}</strong>
      ${data.visitorEmail ? `(${data.visitorEmail})` : ''}
      at ${formatTime(data.missedAt)}.
    </p>

    <div class="info-box">
      <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${formatTime(data.missedAt)}</p>
      ${data.pageUrl ? `<p style="margin: 0 0 8px 0;"><strong>Page:</strong> ${data.pageUrl}</p>` : ''}
      <p style="margin: 0;"><strong>Message:</strong></p>
      <p style="margin: 8px 0 0 0; font-size: 14px; font-style: italic;">
        "${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}"
      </p>
    </div>

    <p>
      The visitor may still be waiting for a response. Consider reaching out via email
      ${data.visitorEmail ? `at <strong>${data.visitorEmail}</strong>` : 'if available'}
      to provide assistance.
    </p>

    <center>
      <a href="${data.conversationUrl}" class="button">View Conversation</a>
    </center>

    <hr class="divider">

    <p class="text-muted">
      <strong>Tip:</strong> Enable desktop notifications and keep the dashboard open
      to never miss a chat again!
    </p>

    <p>
      Best regards,<br>
      Nexvo Notifications
    </p>
    `,
    `Missed chat from ${data.visitorName}`
  );

  const text = `
⚠️ Missed Chat

Hi ${data.operatorName},

You missed a chat from ${data.visitorName}${data.visitorEmail ? ` (${data.visitorEmail})` : ''} at ${formatTime(data.missedAt)}.

Time: ${formatTime(data.missedAt)}
${data.pageUrl ? `Page: ${data.pageUrl}` : ''}

Message:
"${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}"

The visitor may still be waiting for a response. Consider reaching out via email${data.visitorEmail ? ` at ${data.visitorEmail}` : ' if available'} to provide assistance.

View Conversation: ${data.conversationUrl}

Tip: Enable desktop notifications and keep the dashboard open to never miss a chat again!

Best regards,
Nexvo Notifications

---
© ${new Date().getFullYear()} Nexvo. All rights reserved.
  `.trim();

  return {
    subject: `⚠️ Missed chat from ${data.visitorName}`,
    html,
    text,
  };
}
