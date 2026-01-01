import { EmailTemplate } from '../../services/email.js';
import { emailLayout } from './layout.js';
import { config } from '../../config/index.js';

export interface PasswordResetEmailData {
  name: string;
  resetUrl: string;
  expiresIn?: string;
}

export function passwordResetEmail(data: PasswordResetEmailData): EmailTemplate {
  const expiresIn = data.expiresIn || '1 hour';

  const html = emailLayout(
    `
    <h1>Reset Your Password</h1>

    <p>Hi ${data.name},</p>

    <p>
      We received a request to reset your password for your Nexvo account.
      Click the button below to create a new password.
    </p>

    <center>
      <a href="${data.resetUrl}" class="button">Reset Password</a>
    </center>

    <p class="text-muted" style="margin-top: 20px;">
      This link will expire in <strong>${expiresIn}</strong> for security reasons.
    </p>

    <hr class="divider">

    <p class="text-muted">
      <strong>Didn't request this?</strong><br>
      If you didn't request a password reset, you can safely ignore this email.
      Your password will remain unchanged.
    </p>

    <div class="info-box">
      <p style="margin: 0; font-size: 14px;">
        <strong>Security tip:</strong> Never share your password with anyone, and
        make sure to use a strong, unique password for your Nexvo account.
      </p>
    </div>

    <p>
      Best regards,<br>
      The Nexvo Team
    </p>
    `,
    'Reset your Nexvo password'
  );

  const text = `
Reset Your Password

Hi ${data.name},

We received a request to reset your password for your Nexvo account.
Click the link below to create a new password:

${data.resetUrl}

This link will expire in ${expiresIn} for security reasons.

Didn't request this?
If you didn't request a password reset, you can safely ignore this email.
Your password will remain unchanged.

Security tip: Never share your password with anyone, and make sure to use a strong,
unique password for your Nexvo account.

Best regards,
The Nexvo Team

---
© ${new Date().getFullYear()} Nexvo. All rights reserved.
  `.trim();

  return {
    subject: 'Reset Your Nexvo Password',
    html,
    text,
  };
}
