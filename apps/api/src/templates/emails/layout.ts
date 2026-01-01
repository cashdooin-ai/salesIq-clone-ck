import { config } from '../../config/index.js';

/**
 * Base email layout wrapper
 */
export function emailLayout(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Nexvo</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f5f5;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .email-logo {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    .email-body {
      padding: 40px;
    }
    .email-footer {
      background-color: #f9fafb;
      padding: 30px 40px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    h1 {
      color: #111827;
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 20px 0;
    }
    h2 {
      color: #374151;
      font-size: 20px;
      font-weight: 600;
      margin: 30px 0 15px 0;
    }
    p {
      margin: 0 0 16px 0;
      color: #4b5563;
    }
    .text-muted {
      color: #9ca3af;
      font-size: 14px;
    }
    .divider {
      border: 0;
      border-top: 1px solid #e5e7eb;
      margin: 30px 0;
    }
    .info-box {
      background-color: #f3f4f6;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 14px;
    }
    @media only screen and (max-width: 600px) {
      .email-header,
      .email-body,
      .email-footer {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <div class="email-wrapper">
          <!-- Header -->
          <div class="email-header">
            <a href="${config.webUrl}" class="email-logo">Nexvo</a>
          </div>

          <!-- Body -->
          <div class="email-body">
            ${content}
          </div>

          <!-- Footer -->
          <div class="email-footer">
            <p style="margin: 0 0 10px 0;">
              <strong>Nexvo</strong> - Next-generation customer engagement
            </p>
            <p style="margin: 0 0 10px 0;">
              <a href="${config.webUrl}" style="color: #667eea; text-decoration: none;">Dashboard</a> •
              <a href="${config.webUrl}/docs" style="color: #667eea; text-decoration: none;">Documentation</a> •
              <a href="${config.webUrl}/support" style="color: #667eea; text-decoration: none;">Support</a>
            </p>
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              © ${new Date().getFullYear()} Nexvo. All rights reserved.
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Convert HTML to plain text (basic implementation)
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}
