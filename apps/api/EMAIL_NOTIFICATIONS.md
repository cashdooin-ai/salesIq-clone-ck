# Email Notification System

This document describes the email notification system implemented in the Nexvo API.

## Overview

The email notification system provides transactional email functionality using:
- **Nodemailer** for SMTP email delivery
- **BullMQ** for asynchronous email queue processing
- **Redis** for job queue management
- Responsive HTML email templates with plain text fallbacks

## Architecture

```
┌─────────────────┐
│  Auth Routes    │──────┐
│  Conversations  │      │
└─────────────────┘      │
                         ▼
              ┌──────────────────┐
              │ Notification     │
              │ Service          │
              └──────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │ Email Queue      │
              │ (BullMQ)         │
              └──────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │ Email Service    │
              │ (Nodemailer)     │
              └──────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │ SMTP Server      │
              └──────────────────┘
```

## Components

### 1. Email Service (`src/services/email.ts`)

Low-level service for sending emails via SMTP.

**Features:**
- SMTP connection management
- Development mode (logs emails instead of sending)
- HTML and plain text support
- Bulk email sending
- Error handling and logging

**API:**
```typescript
import { emailService } from './services/email.js';

// Send a single email
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome</h1>',
  text: 'Welcome',
});

// Send using a template
await emailService.sendTemplateEmail(
  'user@example.com',
  template,
  { replyTo: 'support@example.com' }
);
```

### 2. Email Templates (`src/templates/emails/`)

Pre-built, responsive HTML email templates:

- **`welcome.ts`** - Welcome email after registration
- **`password-reset.ts`** - Password reset link
- **`new-conversation.ts`** - New chat notification for operators
- **`missed-chat.ts`** - Missed chat notification
- **`chat-transcript.ts`** - Chat transcript email

All templates use a common layout (`layout.ts`) with:
- Responsive design (mobile-friendly)
- Brand colors and styling
- Professional formatting
- Plain text fallbacks

**Example:**
```typescript
import { welcomeEmail } from './templates/emails/welcome.js';

const template = welcomeEmail({
  name: 'John Doe',
  email: 'john@example.com',
  organizationName: 'Acme Corp',
});

// template = { subject, html, text }
```

### 3. Email Queue (`src/queues/email.queue.ts`)

BullMQ-based queue for asynchronous email processing.

**Features:**
- Async processing (non-blocking)
- Automatic retries (3 attempts with exponential backoff)
- Rate limiting (10 emails/second)
- Concurrent processing (5 workers)
- Job monitoring and stats

**API:**
```typescript
import { queueEmail, queueBulkEmails } from './queues/email.queue.js';

// Queue a single email
await queueEmail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello</p>',
}, {
  userId: '123',
  type: 'welcome',
});

// Queue bulk emails
await queueBulkEmails([
  { emailOptions: {...}, metadata: {...} },
  { emailOptions: {...}, metadata: {...} },
]);
```

### 4. Notification Service (`src/services/notifications.ts`)

High-level service for sending notification emails.

**Methods:**
- `sendWelcomeEmail(userId)` - Send welcome email to new user
- `sendPasswordResetEmail(userId, token)` - Send password reset email
- `notifyNewConversation(conversationId, operatorIds?)` - Notify operators of new chat
- `notifyMissedChat(conversationId)` - Notify admins of missed chat
- `sendChatTranscript(conversationId, email)` - Send chat transcript

**Example:**
```typescript
import { notificationService } from './services/notifications.js';

// Send welcome email
await notificationService.sendWelcomeEmail(user.id);

// Notify operators of new conversation
await notificationService.notifyNewConversation(conversation.id);
```

## Configuration

Add the following environment variables to your `.env` file:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@nexvo.io
```

### Gmail Setup

1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASS`

### Other SMTP Providers

- **SendGrid**: smtp.sendgrid.net:587
- **Mailgun**: smtp.mailgun.org:587
- **AWS SES**: email-smtp.us-east-1.amazonaws.com:587
- **Postmark**: smtp.postmarkapp.com:587

## Development Mode

In development (`NODE_ENV=development`):

- If SMTP credentials are not provided, emails are logged to console instead of being sent
- Email preview endpoint available for testing templates

### Email Preview

Preview email templates in your browser:

```bash
# List all available templates
GET http://localhost:3001/api/v1/dev/email-templates

# Preview a specific template
GET http://localhost:3001/api/v1/dev/email-preview/welcome
GET http://localhost:3001/api/v1/dev/email-preview/password-reset
GET http://localhost:3001/api/v1/dev/email-preview/new-conversation
GET http://localhost:3001/api/v1/dev/email-preview/missed-chat
GET http://localhost:3001/api/v1/dev/email-preview/chat-transcript

# Check email queue stats
GET http://localhost:3001/api/v1/dev/email-queue-stats
```

## User Notification Settings

Users can control which email notifications they receive via their settings:

```typescript
interface NotificationSettings {
  email?: {
    enabled?: boolean;
    newConversations?: boolean;
    missedChats?: boolean;
    mentions?: boolean;
    dailyDigest?: boolean;
  };
}
```

Settings are stored in the `User.settings` JSON field and checked before sending notifications.

## Usage Examples

### 1. Send Welcome Email on Registration

```typescript
// In auth.routes.ts
const user = organization.users[0];

// Send welcome email (async, non-blocking)
notificationService.sendWelcomeEmail(user.id).catch(err => {
  request.log.error({ err, userId: user.id }, 'Failed to send welcome email');
});
```

### 2. Password Reset Flow

```typescript
// Request password reset
const resetToken = jwt.sign(
  { userId: user.id, type: 'password-reset' },
  config.jwtSecret,
  { expiresIn: '1h' }
);

await notificationService.sendPasswordResetEmail(user.id, resetToken);
```

### 3. Notify Operators of New Chat

```typescript
// In conversation creation logic
const conversation = await prisma.conversation.create({...});

// Notify all online operators
await notificationService.notifyNewConversation(conversation.id);

// Or notify specific operators
await notificationService.notifyNewConversation(
  conversation.id,
  [operator1.id, operator2.id]
);
```

### 4. Send Chat Transcript

```typescript
// When conversation is closed or user requests transcript
await notificationService.sendChatTranscript(
  conversation.id,
  'customer@example.com'
);
```

## Monitoring

### Queue Statistics

```typescript
import { getEmailQueueStats } from './queues/email.queue.js';

const stats = await getEmailQueueStats();
// {
//   waiting: 5,
//   active: 2,
//   completed: 1000,
//   failed: 3,
//   delayed: 0,
//   total: 1010
// }
```

### Logs

The email system logs all operations:

```
[Email Service] SMTP transporter initialized
[Email Queue] Email queued: { jobId: '1', to: 'user@example.com', subject: 'Welcome' }
[Email Worker] Processing email job: { jobId: '1', ... }
[Email Service] Email sent: { messageId: '<...>', to: 'user@example.com', subject: 'Welcome' }
[Email Worker] Completed job: 1
```

## Error Handling

### Automatic Retries

Failed emails are automatically retried:
- **Attempt 1**: Immediate
- **Attempt 2**: After 2 seconds
- **Attempt 3**: After 4 seconds (exponential backoff)

### Error Logging

All errors are logged with context:

```typescript
console.error('[Email Service] Failed to send email:', {
  error: 'Connection timeout',
  to: 'user@example.com',
  subject: 'Welcome',
});
```

### Graceful Degradation

If the email service fails:
- The main application continues to work
- Errors are logged but don't crash the server
- Failed jobs are kept in Redis for 7 days for debugging

## Testing

### 1. Test Email Service

```typescript
import { emailService } from './services/email.js';

// Verify SMTP connection
const isConnected = await emailService.verifyConnection();
console.log('SMTP connected:', isConnected);
```

### 2. Test Templates

Use the email preview endpoint to visually inspect templates.

### 3. Test Queue

```typescript
import { queueEmail } from './queues/email.queue.js';

// Queue a test email
const job = await queueEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<p>This is a test</p>',
});

console.log('Job queued:', job.id);
```

## Production Checklist

Before deploying to production:

- [ ] Set up SMTP credentials in environment variables
- [ ] Test email delivery with real SMTP server
- [ ] Configure proper `EMAIL_FROM` address
- [ ] Set up email monitoring/alerting
- [ ] Review rate limiting settings
- [ ] Test all email templates
- [ ] Verify unsubscribe links (if applicable)
- [ ] Set up SPF/DKIM/DMARC records for your domain
- [ ] Test email deliverability to major providers (Gmail, Outlook, etc.)

## Troubleshooting

### Emails not sending

1. Check SMTP credentials in `.env`
2. Verify SMTP server is accessible
3. Check email queue stats for failed jobs
4. Review logs for error messages

### Emails going to spam

1. Set up SPF, DKIM, and DMARC records
2. Use a dedicated sending domain
3. Maintain good sender reputation
4. Include unsubscribe links
5. Use a reputable SMTP service

### Queue processing slow

1. Check Redis connection
2. Increase worker concurrency
3. Review rate limiting settings
4. Monitor queue stats

## Future Enhancements

Potential improvements:

- Email template builder UI
- A/B testing for email templates
- Email analytics (open rates, click rates)
- Unsubscribe management
- Email scheduling
- Multi-language support
- Email webhooks (delivery status)
- Template versioning
