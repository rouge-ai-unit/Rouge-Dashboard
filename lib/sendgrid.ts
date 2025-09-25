import sgMail from '@sendgrid/mail';
import { logger, AppError, ValidationError, withPerformanceMonitoring } from './client-utils';

// Enterprise-grade SendGrid setup for production
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const AI_TEAM_EMAIL = process.env.AI_TEAM_EMAIL || 'ai-team@example.com';

// Configuration validation
interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  aiTeamEmail: string;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  rateLimitDelay: number;
}

const sendGridConfig: SendGridConfig = {
  apiKey: SENDGRID_API_KEY || '',
  fromEmail: SENDGRID_FROM_EMAIL || '',
  aiTeamEmail: AI_TEAM_EMAIL,
  maxRetries: parseInt(process.env.SENDGRID_MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.SENDGRID_RETRY_DELAY || '1000'),
  batchSize: parseInt(process.env.SENDGRID_BATCH_SIZE || '10'),
  rateLimitDelay: parseInt(process.env.SENDGRID_RATE_LIMIT_DELAY || '1000')
};

// Validate configuration on module load
function validateSendGridConfig(): boolean {
  const errors: string[] = [];

  if (!sendGridConfig.apiKey) {
    errors.push('SENDGRID_API_KEY is not configured');
  }

  if (!sendGridConfig.fromEmail) {
    errors.push('SENDGRID_FROM_EMAIL is not configured');
  } else if (!isValidEmail(sendGridConfig.fromEmail)) {
    errors.push('SENDGRID_FROM_EMAIL is not a valid email address');
  }

  if (!isValidEmail(sendGridConfig.aiTeamEmail)) {
    errors.push('AI_TEAM_EMAIL is not a valid email address');
  }

  if (errors.length > 0) {
    logger.error('SendGrid configuration validation failed', undefined, { errors });
    return false;
  }

  // Initialize SendGrid
  sgMail.setApiKey(sendGridConfig.apiKey);
  logger.info('SendGrid configuration validated successfully');
  return true;
}

// Validate on module load
const isConfigured = validateSendGridConfig();

/**
 * Send a ticket notification email via SendGrid with enterprise-grade error handling
 * @param options Email options
 * @returns Promise<{success: boolean, messageId?: string, error?: string}>
 */
export const sendTicketNotification = withPerformanceMonitoring(async function sendTicketNotification(options: {
  to?: string;
  subject: string;
  text: string;
  html: string;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
}): Promise<{success: boolean, messageId?: string, error?: string}> {
  const { to, subject, text, html, priority = 'normal', tags = [] } = options;

  try {
    // Validate configuration
    if (!isConfigured) {
      const error = 'SendGrid not configured';
      logger.warn('SendGrid notification skipped', { error });
      return { success: false, error };
    }

    // Validate inputs
    if (!subject || !text || !html) {
      throw new ValidationError('Missing required fields: subject, text, or html');
    }

    const recipient = to || sendGridConfig.aiTeamEmail;
    if (!isValidEmail(recipient)) {
      throw new ValidationError(`Invalid recipient email: ${recipient}`);
    }

    // Prepare email data
    const msg = {
      to: recipient,
      from: {
        email: sendGridConfig.fromEmail,
        name: 'AI Team Notification'
      },
      subject: subject.substring(0, 200), // Limit subject length
      text: text.substring(0, 10000), // Limit text length
      html: html.substring(0, 10000), // Limit HTML length
      priority: priority === 'high' ? 'urgent' : priority === 'low' ? 'low' : 'normal',
      categories: ['ticket-notification', ...tags],
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    // Send with retry logic
    const result = await retryWithBackoff(async () => {
      const response = await sgMail.send(msg);

      // Extract message ID from response
      let messageId: string | undefined;
      if (Array.isArray(response) && response.length > 0) {
        const firstResponse = response[0];
        if ('headers' in firstResponse && firstResponse.headers) {
          messageId = (firstResponse.headers as Record<string, string>)['x-message-id'];
        }
      }

      return { messageId };
    });

    logger.info('Ticket notification sent successfully', {
      recipient,
      subject,
      messageId: result.messageId
    });

    return { success: true, messageId: result.messageId };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send ticket notification', error as Error, {
      recipient: to || sendGridConfig.aiTeamEmail,
      subject
    });

    return { success: false, error: errorMessage };
  }
}, 'sendTicketNotification');


// Email validation utility
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
}

// Retry utility with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = sendGridConfig.maxRetries,
  baseDelay: number = sendGridConfig.retryDelay
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`SendGrid operation failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries,
        error: lastError.message
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Check if an error is retryable
function isRetryableError(error: any): boolean {
  // Network errors, rate limits, and temporary server errors are retryable
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  if (error.response) {
    const status = error.response.status;
    return status === 429 || status >= 500;
  }

  return false;
}

/**
 * Generic email sending function for cold outreach
 * @param {Object} opts
 * @param {string} opts.to - Recipient email address
 * @param {string} opts.subject - Email subject
 * @param {string} opts.text - Plain text body
 * @param {string} opts.html - HTML body
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!isConfigured) {
    console.log('[SendGrid] Email sending skipped: SendGrid not configured.');
    return { success: false, error: 'SendGrid not configured' };
  }

  try {
    const msg = {
      to,
      from: sendGridConfig.fromEmail,
      subject,
      text,
      html,
    };

    await sgMail.send(msg);
    console.log(`[SendGrid] Email sent successfully to ${to}`);
    return { success: true };
  } catch (err) {
    console.error('[SendGrid] Failed to send email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
