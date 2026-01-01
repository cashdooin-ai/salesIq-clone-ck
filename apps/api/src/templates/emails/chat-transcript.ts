import { EmailTemplate } from '../../services/email.js';
import { emailLayout } from './layout.js';
import { config } from '../../config/index.js';

export interface ChatMessage {
  sender: string;
  senderType: 'VISITOR' | 'OPERATOR' | 'BOT';
  message: string;
  timestamp: Date;
}

export interface ChatTranscriptEmailData {
  recipientName: string;
  conversationId: string;
  messages: ChatMessage[];
  startedAt: Date;
  endedAt?: Date;
  visitorName: string;
  operatorName?: string;
  rating?: number;
  feedback?: string;
}

export function chatTranscriptEmail(data: ChatTranscriptEmailData): EmailTemplate {
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessages = () => {
    return data.messages
      .map(msg => {
        const senderStyle = msg.senderType === 'VISITOR'
          ? 'background-color: #f3f4f6; border-left: 3px solid #667eea;'
          : 'background-color: #ede9fe; border-left: 3px solid #764ba2;';

        return `
          <div style="${senderStyle} padding: 12px; margin: 8px 0; border-radius: 4px;">
            <p style="margin: 0 0 4px 0; font-weight: 600; font-size: 13px; color: #6b7280;">
              ${msg.sender}
              <span style="font-weight: 400; font-size: 12px;">
                (${formatTime(msg.timestamp)})
              </span>
            </p>
            <p style="margin: 0; font-size: 14px; color: #374151;">
              ${msg.message}
            </p>
          </div>
        `;
      })
      .join('');
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const html = emailLayout(
    `
    <h1>Chat Transcript</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Here's the transcript of your conversation with ${data.operatorName || 'our team'}.
    </p>

    <div class="info-box">
      <p style="margin: 0 0 5px 0;"><strong>Conversation ID:</strong> <span class="code">${data.conversationId}</span></p>
      <p style="margin: 0 0 5px 0;"><strong>Started:</strong> ${formatTime(data.startedAt)}</p>
      ${data.endedAt ? `<p style="margin: 0 0 5px 0;"><strong>Ended:</strong> ${formatTime(data.endedAt)}</p>` : ''}
      <p style="margin: 0;"><strong>Participants:</strong> ${data.visitorName}${data.operatorName ? ` & ${data.operatorName}` : ''}</p>
    </div>

    <h2>Messages</h2>

    ${renderMessages()}

    ${data.rating || data.feedback ? `
      <hr class="divider">

      <h2>Feedback</h2>

      ${data.rating ? `
        <p>
          <strong>Rating:</strong> ${renderStars(data.rating)} (${data.rating}/5)
        </p>
      ` : ''}

      ${data.feedback ? `
        <div class="info-box">
          <p style="margin: 0; font-style: italic;">"${data.feedback}"</p>
        </div>
      ` : ''}
    ` : ''}

    <hr class="divider">

    <p class="text-muted">
      Thank you for using Nexvo. If you have any questions about this conversation,
      feel free to reach out to us.
    </p>

    <p>
      Best regards,<br>
      The Nexvo Team
    </p>
    `,
    'Your chat transcript from Nexvo'
  );

  const textMessages = data.messages
    .map(msg => `[${formatTime(msg.timestamp)}] ${msg.sender}: ${msg.message}`)
    .join('\n');

  const text = `
Chat Transcript

Hi ${data.recipientName},

Here's the transcript of your conversation with ${data.operatorName || 'our team'}.

Conversation ID: ${data.conversationId}
Started: ${formatTime(data.startedAt)}
${data.endedAt ? `Ended: ${formatTime(data.endedAt)}` : ''}
Participants: ${data.visitorName}${data.operatorName ? ` & ${data.operatorName}` : ''}

Messages:
${textMessages}

${data.rating ? `\nRating: ${data.rating}/5 stars` : ''}
${data.feedback ? `\nFeedback: "${data.feedback}"` : ''}

Thank you for using Nexvo. If you have any questions about this conversation,
feel free to reach out to us.

Best regards,
The Nexvo Team

---
© ${new Date().getFullYear()} Nexvo. All rights reserved.
  `.trim();

  return {
    subject: 'Your Chat Transcript from Nexvo',
    html,
    text,
  };
}
