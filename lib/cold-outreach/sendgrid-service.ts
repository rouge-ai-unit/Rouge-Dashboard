/**
 * Cold Outreach SendGrid Service
 *
 * Enterprise-grade email sending service for the Cold Connect Automator tool
 * with robust error handling, logging, and security measures
 *
 * ## Features
 * - Secure email sending via SendGrid API
 * - Batch processing to avoid rate limiting
 * - Personalized message templating
 * - Comprehensive logging and tracking
 *
 * ## Security
 * - Input validation and sanitization
 * - Email address validation
 * - Rate limiting between batches
 * - Secure credential handling
 *
 * ## Performance
 * - Batch sending (default 10 emails per batch)
 * - 1-second delay between batches to prevent rate limiting
 * - Asynchronous database logging
 * - Error recovery for failed sends
 */

import sgMail from '@sendgrid/mail';
import * as schema from '@/utils/schema';
import { getDb } from '@/utils/dbConfig';
import { eq } from 'drizzle-orm';
import { sanitizeInput, sanitizeRichText, isValidEmail } from '@/lib/cold-outreach/security-utils';

// SendGrid configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const isConfigured = SENDGRID_API_KEY && SENDGRID_FROM_EMAIL;

// Initialize SendGrid if configured
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Initialize SendGrid if configured
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailRecipient {
  id?: string; // Changed to string to match UUID
  name: string;
  email: string;
  role?: string;
  company?: string;
  customFields?: Record<string, any>;
}

export interface EmailSender {
  name: string;
  email: string;
  company?: string;
  role?: string;
}

export interface SendEmailOptions {
  sender: EmailSender;
  recipients: EmailRecipient[];
  subject: string;
  messageTemplate: string;
  campaignId?: string; // Changed to string to match UUID
  userId: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  batchSize?: number; // Number of emails to send in each batch
}

export interface EmailSendResult {
  email: string;
  status: 'Sent' | 'Failed';
  messageId?: string;
  error?: string;
}

/**
 * Send personalized emails using SendGrid
 * @param options Email sending options
 * @returns Promise<EmailSendResult[]> Results for each recipient
 */
export async function sendColdOutreachEmails(options: SendEmailOptions): Promise<EmailSendResult[]> {
  const { 
    sender, 
    recipients, 
    subject, 
    messageTemplate, 
    campaignId, 
    userId,
    batchSize = 10 // Default to 10 emails per batch
  } = options;
  
  // Validate and sanitize inputs
  if (!sender || !recipients || !subject || !messageTemplate) {
    throw new Error('Missing required fields: sender, recipients, subject, or messageTemplate');
  }
  
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('Recipients must be a non-empty array');
  }
  
  // Sanitize sender information
  const sanitizedSender = {
    name: sanitizeInput(sender.name),
    email: sender.email, // Email will be validated separately
    company: sender.company ? sanitizeInput(sender.company) : undefined,
    role: sender.role ? sanitizeInput(sender.role) : undefined
  };
  
  // Validate sender email
  if (!isValidEmail(sanitizedSender.email)) {
    throw new Error('Invalid sender email address');
  }
  
  if (!SENDGRID_API_KEY) {
    throw new Error('SendGrid API key not configured');
  }
  
  // Sanitize and validate recipients
  const sanitizedRecipients = recipients.map(recipient => ({
    id: recipient.id,
    name: sanitizeInput(recipient.name),
    email: recipient.email, // Email will be validated separately
    role: recipient.role ? sanitizeInput(recipient.role) : undefined,
    company: recipient.company ? sanitizeInput(recipient.company) : undefined,
    customFields: recipient.customFields ? JSON.parse(JSON.stringify(recipient.customFields)) : undefined
  })).filter(recipient => isValidEmail(recipient.email)); // Only keep valid emails
  
  if (sanitizedRecipients.length === 0) {
    throw new Error('No valid recipients with valid email addresses');
  }
  
  // Sanitize subject and message template
  const sanitizedSubject = sanitizeInput(subject);
  const sanitizedMessageTemplate = sanitizeRichText(messageTemplate);
  
  const results: EmailSendResult[] = [];
  
  // Process recipients in batches to avoid rate limiting
  for (let i = 0; i < sanitizedRecipients.length; i += batchSize) {
    const batch = sanitizedRecipients.slice(i, i + batchSize);
    const batchResults: EmailSendResult[] = [];
    
    // Prepare batch emails
    const batchMessages = batch.map(recipient => {
      try {
        // Personalize the message
        const personalizedMessage = personalizeMessage(sanitizedMessageTemplate, {
          ...recipient,
          myName: sanitizedSender.name,
          myEmail: sanitizedSender.email,
          myCompany: sanitizedSender.company,
          myRole: sanitizedSender.role
        });
        
        // Create SendGrid message
        return {
          to: recipient.email,
          from: {
            email: sanitizedSender.email,
            name: sanitizedSender.name
          },
          subject: sanitizedSubject,
          html: personalizedMessage,
          trackingSettings: {
            clickTracking: {
              enable: options.trackClicks ?? true
            },
            openTracking: {
              enable: options.trackOpens ?? true
            }
          },
          recipient, // Keep reference to original recipient for logging
          personalizedMessage
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        batchResults.push({
          email: recipient.email,
          status: 'Failed',
          error: `Failed to personalize message: ${errorMessage}`
        });
        return null;
      }
    }).filter((msg): msg is NonNullable<typeof msg> => Boolean(msg)); // Remove failed personalizations and ensure type safety
    
    try {
      // Send batch emails
      if (batchMessages.length > 0) {
        // For single email, send individually
        if (batchMessages.length === 1) {
          const msg = batchMessages[0];
          const response = await sgMail.send({
            to: msg.to,
            from: msg.from,
            subject: msg.subject,
            html: msg.html,
            trackingSettings: msg.trackingSettings
          });
          
          // Extract message ID from response headers
          let messageId: string | undefined;
          if (Array.isArray(response) && response.length > 0) {
            const firstResponse = response[0];
            if ('headers' in firstResponse && firstResponse.headers) {
              messageId = (firstResponse.headers as Record<string, string>)['x-message-id'];
            }
          }
          
          batchResults.push({
            email: msg.recipient.email,
            status: 'Sent',
            messageId
          });
          
          // Log to database
          await logEmailToDatabase({
            userId,
            recipient: msg.recipient,
            sender: sanitizedSender,
            subject: sanitizedSubject,
            message: msg.personalizedMessage,
            campaignId,
            status: 'Sent',
            messageId
          });
        } else {
          // For multiple emails, use batch sending
          const batchResponse = await sgMail.send(batchMessages.map(msg => ({
            to: msg.to,
            from: msg.from,
            subject: msg.subject,
            html: msg.html,
            trackingSettings: msg.trackingSettings
          })));
          
          // Process batch responses
          await Promise.all(batchResponse.map(async (response, index) => {
            const msg = batchMessages[index];

            // Extract message ID from response headers
            let messageId: string | undefined;
            if (Array.isArray(response) && response.length > 0) {
              const firstResponse = response[0];
              if ('headers' in firstResponse && firstResponse.headers) {
                messageId = (firstResponse.headers as Record<string, string>)['x-message-id'];
              }
            }

            batchResults.push({
              email: msg.recipient.email,
              status: 'Sent',
              messageId
            });

            // Log to database
            await logEmailToDatabase({
              userId,
              recipient: msg.recipient,
              sender: sanitizedSender,
              subject: sanitizedSubject,
              message: msg.personalizedMessage,
              campaignId,
              status: 'Sent',
              messageId
            }).catch(error => {
              console.error(`Failed to log email to database for ${msg.recipient.email}:`, error);
            });
          }));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send batch emails:', error);
      
      // Mark all remaining emails in batch as failed
      batch.forEach(recipient => {
        if (!batchResults.some(result => result.email === recipient.email)) {
          batchResults.push({
            email: recipient.email,
            status: 'Failed',
            error: errorMessage
          });
          
          // Log failed attempt to database
          logEmailToDatabase({
            userId,
            recipient,
            sender: sanitizedSender,
            subject: sanitizedSubject,
            message: sanitizedMessageTemplate,
            campaignId,
            status: 'Failed',
            error: errorMessage
          }).catch(dbError => {
            console.error(`Failed to log email failure to database for ${recipient.email}:`, dbError);
          });
        }
      });
    }
    
    // Add batch results to overall results
    results.push(...batchResults);
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < sanitizedRecipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  return results;
}

/**
 * Personalize email message with recipient and sender information
 * @param template Message template with placeholders
 * @param data Data for personalization
 * @returns Personalized message
 */
function personalizeMessage(template: string, data: Record<string, any>): string {
  let personalized = template;
  
  // Replace all placeholders
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string') {
      // Sanitize the value before replacement
      const sanitizedValue = sanitizeInput(value);
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      personalized = personalized.replace(regex, sanitizedValue);
    }
  });
  
  return personalized;
}

/**
 * Log email to database
 * @param logData Email log data
 */
async function logEmailToDatabase(logData: {
  userId: string;
  recipient: EmailRecipient;
  sender: EmailSender;
  subject: string;
  message: string;
  campaignId?: string;
  status: 'Sent' | 'Failed';
  messageId?: string;
  error?: string;
}) {
  try {
    const db = getDb();
    
    // If recipient already exists in database, update it
    if (logData.recipient.id) {
      await db.update(schema.Contacts).set({
        name: sanitizeInput(logData.recipient.name),
        email: logData.recipient.email,
        role: logData.recipient.role ? sanitizeInput(logData.recipient.role) : null,
        company: logData.recipient.company ? sanitizeInput(logData.recipient.company) : null,
        userId: logData.userId,
        updatedAt: new Date().toISOString()
      }).where(eq(schema.Contacts.id, logData.recipient.id));
    } else {
      // Create new contact log
      const newContactId = crypto.randomUUID(); // Generate a new UUID
      await db.insert(schema.Contacts).values({
        id: newContactId,
        name: sanitizeInput(logData.recipient.name),
        email: logData.recipient.email,
        role: logData.recipient.role ? sanitizeInput(logData.recipient.role) : null,
        company: logData.recipient.company ? sanitizeInput(logData.recipient.company) : null,
        userId: logData.userId,
      });
      // Update the recipient id for subsequent operations
      logData.recipient.id = newContactId;
    }    
    // Also log to Messages table if campaignId is provided
    if (logData.campaignId && logData.recipient.id) {
      await db.insert(schema.Messages).values({
        campaignId: logData.campaignId,
        contactId: logData.recipient.id,
        subject: sanitizeInput(logData.subject),
        content: sanitizeRichText(logData.message),
        status: logData.status,
        sentAt: logData.status === 'Sent' ? new Date().toISOString() : null,
        userId: logData.userId,
      });
    }
  } catch (error) {
    console.error('Failed to log email to database:', error);
  }
}

/**
 * Validate email address format
 * @param email Email address to validate
 * @returns boolean True if valid
 */
export function validateEmail(email: string): boolean {
  return isValidEmail(email);
}

/**
 * Validate sender information
 * @param sender Sender information
 * @returns boolean True if valid
 */
export function validateSender(sender: EmailSender): boolean {
  return Boolean(
    sender.name &&
    sender.email &&
    isValidEmail(sender.email)
  );
}

/**
 * Send a generic email via SendGrid.
 * @param {Object} opts
 * @param {string} opts.to - Recipient email address
 * @param {string} opts.subject - Email subject
 * @param {string} opts.html - HTML body
 * @param {Object} opts.from - From email object with email and name
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from: { email: string; name: string };
}): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured) {
    console.log('[SendGrid] Email send skipped: SendGrid not configured.');
    return { success: false, error: 'SendGrid not configured' };
  }

  try {
    const msg = {
      to,
      from: {
        email: from.email,
        name: from.name,
      },
      subject,
      html,
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (err) {
    console.error('[SendGrid] Failed to send email:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

// Export all functions as named exports instead of default export
// This fixes the ESLint warning: "Assign object to a variable before exporting as module default"
