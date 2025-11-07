/**
 * Email Service for Authentication
 * Handles password reset and verification emails
 */

import sgMail from '@sendgrid/mail';
import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';
import { eq } from 'drizzle-orm';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@rougevc.com';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string, userName?: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid not configured. Password reset email not sent.');
    console.log(`[Email Service] Reset link: ${APP_URL}/reset-password?token=${token}`);
    return;
  }
  
  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  
  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: 'Reset Your Rouge Dashboard Password',
    text: `
Hello ${userName || 'there'},

You requested to reset your password for Rouge Dashboard.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
Rouge Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700;">Reset Your Password</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hello ${userName || 'there'},
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You requested to reset your password for <strong>Rouge Dashboard</strong>.
              </p>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Click the button below to reset your password:
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${resetLink}" style="display: inline-block; padding: 16px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Reset Password</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; color: #2563eb; font-size: 14px; word-break: break-all;">
                ${resetLink}
              </p>
              
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>This link will expire in 1 hour.</strong>
              </p>
              
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you didn't request this, please ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                © ${new Date().getFullYear()} Rouge. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[Email Service] Password reset email sent to ${email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(email: string, userName: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid not configured. Welcome email not sent.');
    return;
  }
  
  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: 'Welcome to Rouge Dashboard',
    text: `
Hello ${userName},

Welcome to Rouge Dashboard!

Your account has been successfully created. You can now access all our AI-powered tools and features.

Get started: ${APP_URL}/home

Best regards,
Rouge Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Rouge Dashboard</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1a1a1a; font-size: 28px; font-weight: 700;">Welcome to Rouge Dashboard! 🎉</h1>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hello ${userName},
              </p>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Your account has been successfully created. You can now access all our AI-powered tools and features.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/home" style="display: inline-block; padding: 16px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Get Started</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Rouge. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[Email Service] Welcome email sent to ${email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send welcome email:', error);
    // Don't throw - welcome email is not critical
  }
}

/**
 * Send pending approval email to user
 */
export async function sendPendingApprovalEmail(email: string, userName: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid not configured. Pending approval email not sent.');
    return;
  }
  
  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: 'Rouge Dashboard - Registration Pending Approval',
    text: `
Hello ${userName},

Thank you for registering with Rouge Dashboard!

Your account has been created and is currently pending approval from our AI Unit team. This typically takes 24-48 hours.

You will receive an email notification once your account has been approved and you can start using the platform.

If you have any urgent questions, please contact our support team.

Best regards,
Rouge Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Pending Approval</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700;">Registration Pending Approval</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hello ${userName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Thank you for registering with <strong>Rouge Dashboard</strong>!
              </p>
              
              <div style="margin: 0 0 30px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 16px; line-height: 1.6;">
                  <strong>⏳ Your account is currently pending approval</strong>
                </p>
              </div>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Our AI Unit team will review your registration and typically responds within <strong>24-48 hours</strong>.
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You will receive an email notification once your account has been approved and you can start using the platform.
              </p>
              
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>What happens next?</strong>
              </p>
              
              <ul style="margin: 0 0 30px; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                <li>Our team reviews your registration details</li>
                <li>You receive an approval/rejection email</li>
                <li>Once approved, you can sign in and access all tools</li>
              </ul>
              
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any urgent questions, please contact our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                © ${new Date().getFullYear()} Rouge. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[Email Service] Pending approval email sent to ${email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send pending approval email:', error);
    // Don't throw - email is not critical
  }
}

/**
 * Send admin notification about new user signup
 */
export async function sendAdminNewUserNotification(data: {
  email: string;
  name: string;
  requestedUnit: string;
  requestedRole: string;
  justification: string;
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid not configured. Admin notification not sent.');
    return;
  }
  
  // Get admin emails from database (users with role='admin')
  let adminEmails: string[] = [];
  try {
    const db = getDb();
    const admins = await db.select({ email: Users.email }).from(Users).where(eq(Users.role, 'admin'));
    adminEmails = admins.map(admin => admin.email);
  } catch (error) {
    console.error('[Email Service] Error fetching admin emails:', error);
    // Fallback to environment variable if database query fails
    adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS?.split(',') || [];
  }
  
  if (adminEmails.length === 0) {
    console.warn('[Email Service] No admin emails configured for notifications.');
    return;
  }
  
  const approvalLink = `${APP_URL}/admin/approvals`;
  
  const msg = {
    to: adminEmails,
    from: FROM_EMAIL,
    subject: `New User Registration - ${data.name}`,
    text: `
New User Registration Pending Approval

Name: ${data.name}
Email: ${data.email}
Requested Unit: ${data.requestedUnit}
Requested Role: ${data.requestedRole}

Justification:
${data.justification}

Review and approve: ${approvalLink}

Rouge Dashboard Admin System
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New User Registration</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 700;">🔔 New User Registration</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="margin: 0 0 30px; padding: 20px; background-color: #dbeafe; border-left: 4px solid #2563eb; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 16px; line-height: 1.6;">
                  <strong>Action Required:</strong> A new user has registered and is awaiting approval.
                </p>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 14px;">Name:</strong>
                  </td>
                  <td style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #1a1a1a; font-size: 14px;">${data.name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 14px;">Email:</strong>
                  </td>
                  <td style="padding: 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #1a1a1a; font-size: 14px;">${data.email}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 14px;">Requested Unit:</strong>
                  </td>
                  <td style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #1a1a1a; font-size: 14px;">${data.requestedUnit}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 14px;">Requested Role:</strong>
                  </td>
                  <td style="padding: 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #1a1a1a; font-size: 14px; text-transform: capitalize;">${data.requestedRole}</span>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 10px; color: #1a1a1a; font-size: 14px; font-weight: 600;">
                Justification:
              </p>
              
              <div style="margin: 0 0 30px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
                <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
${data.justification}
                </p>
              </div>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${approvalLink}" style="display: inline-block; padding: 16px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Review & Approve</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                Rouge Dashboard Admin System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[Email Service] Admin notification sent for new user: ${data.email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send admin notification:', error);
    // Don't throw - email is not critical
  }
}

/**
 * Send account approved email to user
 */
export async function sendAccountApprovedEmail(data: {
  email: string;
  userName: string;
  assignedRole: string;
  assignedUnit: string;
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid not configured. Account approved email not sent.');
    return;
  }
  
  const loginLink = `${APP_URL}/signin`;
  
  const msg = {
    to: data.email,
    from: FROM_EMAIL,
    subject: '✅ Your Rouge Dashboard Account Has Been Approved!',
    text: `
Hello ${data.userName},

Great news! Your Rouge Dashboard account has been approved!

Your Account Details:
- Role: ${data.assignedRole}
- Unit: ${data.assignedUnit}

You can now sign in and start using all the tools available to your role.

Sign in now: ${loginLink}

Welcome to the team!

Best regards,
Rouge Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700;">✅ Account Approved!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hello ${data.userName},
              </p>
              
              <div style="margin: 0 0 30px; padding: 20px; background-color: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px;">
                <p style="margin: 0; color: #065f46; font-size: 16px; line-height: 1.6;">
                  <strong>Great news!</strong> Your Rouge Dashboard account has been approved!
                </p>
              </div>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <strong>Your Account Details:</strong>
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 14px;">Role:</strong>
                  </td>
                  <td style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #1a1a1a; font-size: 14px; text-transform: capitalize;">${data.assignedRole}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 14px;">Unit:</strong>
                  </td>
                  <td style="padding: 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #1a1a1a; font-size: 14px;">${data.assignedUnit}</span>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You can now sign in and start using all the tools available to your role.
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${loginLink}" style="display: inline-block; padding: 16px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Sign In Now</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: center;">
                Welcome to the team! 🎉
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                © ${new Date().getFullYear()} Rouge. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[Email Service] Account approved email sent to ${data.email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send account approved email:', error);
    // Don't throw - email is not critical
  }
}

/**
 * Send account rejected email to user
 */
export async function sendAccountRejectedEmail(data: {
  email: string;
  userName: string;
  reason: string;
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid not configured. Account rejected email not sent.');
    return;
  }
  
  const msg = {
    to: data.email,
    from: FROM_EMAIL,
    subject: 'Rouge Dashboard - Registration Update',
    text: `
Hello ${data.userName},

Thank you for your interest in Rouge Dashboard.

After reviewing your registration, we are unable to approve your account at this time.

Reason: ${data.reason}

If you believe this is an error or have questions, please contact our support team.

Best regards,
Rouge Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0;">
  <title>Registration Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700;">Registration Update</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hello ${data.userName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in Rouge Dashboard.
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                After reviewing your registration, we are unable to approve your account at this time.
              </p>
              
              <div style="margin: 0 0 30px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; font-weight: 600;">
                  Reason:
                </p>
                <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                  ${data.reason}
                </p>
              </div>
              
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you believe this is an error or have questions, please contact our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                © ${new Date().getFullYear()} Rouge. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[Email Service] Account rejected email sent to ${data.email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send account rejected email:', error);
    // Don't throw - email is not critical
  }
}

/**
 * Send role change email to user
 */
export async function sendRoleChangeEmail(data: {
  email: string;
  userName: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid not configured. Role change email not sent.');
    return;
  }
  
  const isUpgrade = ['member', 'co-leader', 'leader', 'admin'].indexOf(data.newRole) > 
                    ['member', 'co-leader', 'leader', 'admin'].indexOf(data.oldRole);
  
  const msg = {
    to: data.email,
    from: FROM_EMAIL,
    subject: `Role ${isUpgrade ? 'Upgraded' : 'Changed'} - Rouge Dashboard`,
    text: `
Hello ${data.userName},

Your role in Rouge Dashboard has been ${isUpgrade ? 'upgraded' : 'changed'}.

Previous Role: ${data.oldRole}
New Role: ${data.newRole}

This change was made by: ${data.changedBy}

${isUpgrade ? 'You now have access to additional tools and features!' : 'Your access permissions have been updated.'}

Sign in to see your new permissions: ${APP_URL}/signin

Best regards,
Rouge Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Role ${isUpgrade ? 'Upgraded' : 'Changed'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700;">${isUpgrade ? '⬆️' : '🔄'} Role ${isUpgrade ? 'Upgraded' : 'Changed'}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hello ${data.userName},
              </p>
              
              <div style="margin: 0 0 30px; padding: 20px; background-color: ${isUpgrade ? '#dbeafe' : '#fef3c7'}; border-left: 4px solid ${isUpgrade ? '#2563eb' : '#f59e0b'}; border-radius: 4px;">
                <p style="margin: 0; color: ${isUpgrade ? '#1e40af' : '#92400e'}; font-size: 16px; line-height: 1.6;">
                  <strong>Your role has been ${isUpgrade ? 'upgraded' : 'changed'}!</strong>
                </p>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 14px;">Previous Role:</strong>
                  </td>
                  <td style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px; text-transform: capitalize; text-decoration: line-through;">${data.oldRole}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 14px;">New Role:</strong>
                  </td>
                  <td style="padding: 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #10b981; font-size: 14px; font-weight: 600; text-transform: capitalize;">${data.newRole}</span>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                ${isUpgrade ? 'You now have access to additional tools and features!' : 'Your access permissions have been updated.'}
              </p>
              
              <p style="margin: 0 0 30px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This change was made by: <strong>${data.changedBy}</strong>
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/signin" style="display: inline-block; padding: 16px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Sign In to See New Permissions</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                © ${new Date().getFullYear()} Rouge. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[Email Service] Role change email sent to ${data.email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send role change email:', error);
    // Don't throw - email is not critical
  }
}

/**
 * Send tool access granted email to user
 */
export async function sendToolAccessGrantedEmail(data: {
  email: string;
  userName: string;
  toolName: string;
  toolPath: string;
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid not configured. Tool access granted email not sent.');
    return;
  }
  
  const toolLink = `${APP_URL}${data.toolPath}`;
  
  const msg = {
    to: data.email,
    from: FROM_EMAIL,
    subject: `✅ Tool Access Granted - ${data.toolName}`,
    text: `
Hello ${data.userName},

Great news! Your request for access to ${data.toolName} has been approved!

You can now use this tool and all its features.

Access the tool: ${toolLink}

Best regards,
Rouge Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Access Granted</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700;">✅ Tool Access Granted!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hello ${data.userName},
              </p>
              
              <div style="margin: 0 0 30px; padding: 20px; background-color: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px;">
                <p style="margin: 0; color: #065f46; font-size: 16px; line-height: 1.6;">
                  <strong>Great news!</strong> Your request for access to <strong>${data.toolName}</strong> has been approved!
                </p>
              </div>
              
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You can now use this tool and all its features.
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${toolLink}" style="display: inline-block; padding: 16px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Access ${data.toolName}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                © ${new Date().getFullYear()} Rouge. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[Email Service] Tool access granted email sent to ${data.email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send tool access granted email:', error);
    // Don't throw - email is not critical
  }
}

/**
 * Send tool access denied email to user
 */
export async function sendToolAccessDeniedEmail(data: {
  email: string;
  userName: string;
  toolName: string;
  reason: string;
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid not configured. Tool access denied email not sent.');
    return;
  }
  
  const msg = {
    to: data.email,
    from: FROM_EMAIL,
    subject: `Tool Access Request Update - ${data.toolName}`,
    text: `
Hello ${data.userName},

Your request for access to ${data.toolName} has been reviewed.

Unfortunately, we are unable to grant access at this time.

Reason: ${data.reason}

If you have questions or believe this is an error, please contact your team leader or admin.

Best regards,
Rouge Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Access Request Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700;">Tool Access Request Update</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hello ${data.userName},
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Your request for access to <strong>${data.toolName}</strong> has been reviewed.
              </p>
              
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Unfortunately, we are unable to grant access at this time.
              </p>
              
              <div style="margin: 0 0 30px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; font-weight: 600;">
                  Reason:
                </p>
                <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                  ${data.reason}
                </p>
              </div>
              
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have questions or believe this is an error, please contact your team leader or admin.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                © ${new Date().getFullYear()} Rouge. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[Email Service] Tool access denied email sent to ${data.email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send tool access denied email:', error);
    // Don't throw - email is not critical
  }
}

/**
 * Send admin notification for tool access request
 */
export async function sendAdminToolRequestNotification(data: {
  userEmail: string;
  userName: string;
  toolName: string;
  justification: string;
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email Service] SendGrid not configured. Admin tool request notification not sent.');
    return;
  }
  
  // Get admin emails from database
  let adminEmails: string[] = [];
  try {
    const db = getDb();
    const admins = await db.select({ email: Users.email }).from(Users).where(eq(Users.role, 'admin'));
    adminEmails = admins.map(admin => admin.email);
  } catch (error) {
    console.error('[Email Service] Error fetching admin emails:', error);
    adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS?.split(',') || [];
  }
  
  if (adminEmails.length === 0) {
    console.warn('[Email Service] No admin emails configured for notifications.');
    return;
  }
  
  const reviewLink = `${APP_URL}/admin/tool-requests`;
  
  const msg = {
    to: adminEmails,
    from: FROM_EMAIL,
    subject: `Tool Access Request - ${data.toolName}`,
    text: `
Tool Access Request

User: ${data.userName} (${data.userEmail})
Tool: ${data.toolName}

Justification:
${data.justification}

Review request: ${reviewLink}

Rouge Dashboard Admin System
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Access Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 700;">🔔 Tool Access Request</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="margin: 0 0 30px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 16px; line-height: 1.6;">
                  <strong>Action Required:</strong> A user has requested access to a tool.
                </p>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 14px;">User:</strong>
                  </td>
                  <td style="padding: 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #1a1a1a; font-size: 14px;">${data.userName} (${data.userEmail})</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280; font-size: 14px;">Tool:</strong>
                  </td>
                  <td style="padding: 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #1a1a1a; font-size: 14px;">${data.toolName}</span>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 10px; color: #1a1a1a; font-size: 14px; font-weight: 600;">
                Justification:
              </p>
              
              <div style="margin: 0 0 30px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
                <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
${data.justification}
                </p>
              </div>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${reviewLink}" style="display: inline-block; padding: 16px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Review Request</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                Rouge Dashboard Admin System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[Email Service] Admin tool request notification sent for ${data.toolName}`);
  } catch (error) {
    console.error('[Email Service] Failed to send admin tool request notification:', error);
    // Don't throw - email is not critical
  }
}
