import sgMail from '@sendgrid/mail';

// Robust SendGrid setup for production
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const AI_TEAM_EMAIL = process.env.AI_TEAM_EMAIL || 'ai-team@example.com';

if (!SENDGRID_API_KEY) {
  console.error('[SendGrid] SENDGRID_API_KEY is not set in environment variables.');
}
if (!SENDGRID_FROM_EMAIL) {
  console.error('[SendGrid] SENDGRID_FROM_EMAIL is not set in environment variables.');
}

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Send a ticket notification email via SendGrid.
 * @param {Object} opts
 * @param {string} opts.to - Recipient email address
 * @param {string} opts.subject - Email subject
 * @param {string} opts.text - Plain text body
 * @param {string} opts.html - HTML body
 */
export async function sendTicketNotification({
  to,
  subject,
  text,
  html,
}: {
  to?: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.error('[SendGrid] Not sending email: missing API key or from email.');
    return;
  }
  const recipient = to || AI_TEAM_EMAIL;
  const msg = {
    to: recipient,
    from: SENDGRID_FROM_EMAIL,
    subject,
    text,
    html,
  };
  try {
    await sgMail.send(msg);
    // Optionally log success
    // console.log(`[SendGrid] Email sent to ${recipient}`);
  } catch (err) {
    // Log error for diagnostics, but do not throw
    console.error('[SendGrid] Failed to send email:', err);
  }
}

// .env.local setup (see .env.local.example):
// SENDGRID_API_KEY=your_sendgrid_api_key_here
// SENDGRID_FROM_EMAIL=your_verified_sender@example.com
// AI_TEAM_EMAIL=ai-team@example.com
