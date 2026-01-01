import { EmailTemplate } from '../../services/email.js';
import { emailLayout, htmlToText } from './layout.js';
import { config } from '../../config/index.js';

export interface WelcomeEmailData {
  name: string;
  email: string;
  organizationName: string;
  dashboardUrl?: string;
}

export function welcomeEmail(data: WelcomeEmailData): EmailTemplate {
  const dashboardUrl = data.dashboardUrl || config.webUrl;

  const html = emailLayout(
    `
    <h1>Welcome to Nexvo! 🎉</h1>

    <p>Hi ${data.name},</p>

    <p>
      Thank you for signing up! We're excited to have <strong>${data.organizationName}</strong>
      on board with Nexvo, the next-generation customer engagement platform.
    </p>

    <h2>Get Started</h2>

    <p>Here's what you can do next:</p>

    <div class="info-box">
      <p style="margin: 0 0 10px 0;"><strong>1. Install the Chat Widget</strong></p>
      <p style="margin: 0 0 15px 0; font-size: 14px;">
        Add our chat widget to your website and start engaging with your visitors in real-time.
      </p>

      <p style="margin: 0 0 10px 0;"><strong>2. Customize Your Widget</strong></p>
      <p style="margin: 0 0 15px 0; font-size: 14px;">
        Match your brand by customizing colors, position, and greeting messages.
      </p>

      <p style="margin: 0 0 10px 0;"><strong>3. Invite Your Team</strong></p>
      <p style="margin: 0; font-size: 14px;">
        Collaborate better by inviting team members to help manage conversations.
      </p>
    </div>

    <center>
      <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
    </center>

    <hr class="divider">

    <p class="text-muted">
      <strong>Need help?</strong> Check out our
      <a href="${config.webUrl}/docs" style="color: #667eea;">documentation</a>
      or reach out to our support team.
    </p>

    <p>
      Best regards,<br>
      The Nexvo Team
    </p>
    `,
    `Welcome to Nexvo! Start engaging with your customers today.`
  );

  const text = `
Welcome to Nexvo!

Hi ${data.name},

Thank you for signing up! We're excited to have ${data.organizationName} on board with Nexvo, the next-generation customer engagement platform.

Get Started:

1. Install the Chat Widget
   Add our chat widget to your website and start engaging with your visitors in real-time.

2. Customize Your Widget
   Match your brand by customizing colors, position, and greeting messages.

3. Invite Your Team
   Collaborate better by inviting team members to help manage conversations.

Go to Dashboard: ${dashboardUrl}

Need help? Check out our documentation at ${config.webUrl}/docs or reach out to our support team.

Best regards,
The Nexvo Team

---
© ${new Date().getFullYear()} Nexvo. All rights reserved.
  `.trim();

  return {
    subject: `Welcome to Nexvo, ${data.name}!`,
    html,
    text,
  };
}
