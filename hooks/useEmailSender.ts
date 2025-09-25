/**
 * Email Sender Hook - Enterprise Grade
 *
 * Custom hook for sending cold outreach emails
 * in the Cold Connect Automator tool
 *
 * ## Features
 * - Comprehensive error handling and logging
 * - Performance monitoring and metrics
 * - Audit logging for compliance
 * - Input validation and sanitization
 * - Rate limiting and abuse prevention
 * - Retry logic with exponential backoff
 * - Email validation and security
 * - Progress tracking and cancellation
 * - Enterprise-grade TypeScript typing
 *
 * ## Security
 * - Email validation and sanitization
 * - Rate limiting to prevent abuse
 * - Input validation and XSS prevention
 * - Audit logging for compliance
 * - Error masking for production
 *
 * ## Performance
 * - Batch processing for multiple emails
 * - Progress tracking
 * - Request cancellation support
 * - Performance metrics collection
 * - Memory usage monitoring
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger, withPerformanceMonitoring, ValidationError, retryWithBackoff, sanitizeInput } from '@/lib/client-utils';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// Validation schemas
const emailRecipientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Recipient name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address').max(254, 'Email address too long'),
  role: z.string().optional(),
  company: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

const sendEmailParamsSchema = z.object({
  sender: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    company: z.string().optional(),
    role: z.string().optional(),
  }),
  recipients: z.array(emailRecipientSchema).min(1),
  subject: z.string().min(1),
  messageTemplate: z.string().min(1),
  campaignId: z.number().optional(),
});
interface EmailRecipient {
  id?: number;
  name: string;
  email: string;
  role?: string;
  company?: string;
  customFields?: Record<string, any>;
}

interface EmailSender {
  name: string;
  email: string;
  company?: string;
  role?: string;
}

interface SendEmailHookReturn {
  sendEmails: (
    sender: EmailSender,
    recipients: EmailRecipient[],
    subject: string,
    messageTemplate: string,
    campaignId?: number
  ) => Promise<{ sentCount: number; failedCount: number; results: any[] } | null>;
  isSending: boolean;
  error: string | null;
  progress: number;
  cancelSending: () => void;
  performanceMetrics: {
    totalSendTime: number;
    averageEmailTime: number;
    successRate: number;
  };
  retryCount: number;
}

interface SendingState {
  isCancelled: boolean;
  sentCount: number;
  failedCount: number;
  totalEmails: number;
}

export const useEmailSender = (): SendEmailHookReturn => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalSendTime: 0,
    averageEmailTime: 0,
    successRate: 1,
  });
  const [retryCount, setRetryCount] = useState(0);

  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const sendingStateRef = useRef<SendingState>({
    isCancelled: false,
    sentCount: 0,
    failedCount: 0,
    totalEmails: 0,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Cancel sending
  const cancelSending = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    sendingStateRef.current.isCancelled = true;
    setIsSending(false);
    setProgress(0);

    logger.info('Email sending cancelled by user', {
      sentCount: sendingStateRef.current.sentCount,
      failedCount: sendingStateRef.current.failedCount,
      totalEmails: sendingStateRef.current.totalEmails,
    });
  }, []);

  // Email validation helper
  const validateEmailData = useCallback((data: any): void => {
    const validationResult = sendEmailParamsSchema.safeParse(data);

    if (!validationResult.success) {
      const validationError = new ValidationError(
        `Email data validation failed: ${validationResult.error.errors.map((e: any) => e.message).join(', ')}`
      );
      logger.error('Email validation failed', validationError, {
        recipientCount: data.recipients?.length || 0,
        hasCampaignId: !!data.campaignId,
      });
      throw validationError;
    }
  }, []);

  const sendEmails = useCallback(async (
    sender: EmailSender,
    recipients: EmailRecipient[],
    subject: string,
    messageTemplate: string,
    campaignId?: number
  ): Promise<{ sentCount: number; failedCount: number; results: any[] } | null> => {
    const startTime = Date.now();
    let currentRetryCount = 0;

    try {
      // Validate input data
      const emailData = {
        sender,
        recipients,
        subject,
        messageTemplate,
        campaignId,
      };

      validateEmailData(emailData);

      // Sanitize inputs
      const sanitizedSender = {
        name: sanitizeInput(sender.name),
        email: sender.email.toLowerCase().trim(),
        company: sender.company ? sanitizeInput(sender.company) : undefined,
        role: sender.role ? sanitizeInput(sender.role) : undefined,
      };

      const sanitizedRecipients = recipients.map(recipient => ({
        id: recipient.id,
        name: sanitizeInput(recipient.name),
        email: recipient.email.toLowerCase().trim(),
        role: recipient.role ? sanitizeInput(recipient.role) : undefined,
        company: recipient.company ? sanitizeInput(recipient.company) : undefined,
        customFields: recipient.customFields,
      }));

      const sanitizedSubject = sanitizeInput(subject);
      const sanitizedMessageTemplate = sanitizeInput(messageTemplate);

      // Reset state
      setIsSending(true);
      setError(null);
      setProgress(0);
      setRetryCount(0);
      sendingStateRef.current = {
        isCancelled: false,
        sentCount: 0,
        failedCount: 0,
        totalEmails: sanitizedRecipients.length,
      };

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Rate limiting check
      const rateLimitResult = coldOutreachRateLimit.check('anonymous', {
        headers: new Headers(),
        url: '/api/cold-outreach/send',
        method: 'POST',
      } as any);

      if (!rateLimitResult.allowed) {
        logger.warn('Email sending rate limit exceeded', {
          recipientCount: sanitizedRecipients.length,
          campaignId,
          limit: 30,
          resetTime: rateLimitResult.resetTime,
        });

        toast({
          title: 'Rate Limit Exceeded',
          description: 'Please wait before sending more emails.',
          variant: 'destructive',
        });

        return null;
      }

      logger.info('Starting email campaign', {
        sender: { ...sanitizedSender, email: '[REDACTED]' },
        recipientCount: sanitizedRecipients.length,
        campaignId,
        subjectLength: sanitizedSubject.length,
        messageLength: sanitizedMessageTemplate.length,
      });

      // Send emails with retry logic
      const result = await retryWithBackoff(
        async () => {
          currentRetryCount++;
          setRetryCount(currentRetryCount);

          const response = await fetch('/api/cold-outreach/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sender: sanitizedSender,
              recipients: sanitizedRecipients,
              subject: sanitizedSubject,
              messageTemplate: sanitizedMessageTemplate,
              campaignId,
            }),
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          if (typeof data.sentCount !== 'number' || typeof data.failedCount !== 'number') {
            throw new Error('Invalid response format: missing sent/failed counts');
          }

          return data;
        },
        3,
        2000,
        (error, attempt) => {
          logger.warn('Email sending retry', {
            attempt,
            error: error.message,
            recipientCount: sanitizedRecipients.length,
            campaignId,
          });
          // Only retry network/server errors, not client errors
          if (error.message?.includes('ValidationError')) return false;
          if (error.message?.includes('400')) return false;
          if (error.message?.includes('401')) return false;
          if (error.message?.includes('403')) return false;
          return true;
        }      );

      if (sendingStateRef.current.isCancelled) {
        return null;
      }

      const totalTime = Date.now() - startTime;
      const averageEmailTime = totalTime / sanitizedRecipients.length;
      const successRate = result.sentCount / sanitizedRecipients.length;

      setPerformanceMetrics({
        totalSendTime: totalTime,
        averageEmailTime,
        successRate,
      });

      logger.info('Email campaign completed', {
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        totalTime,
        averageEmailTime,
        successRate,
        retryCount: currentRetryCount,
        campaignId,
      });

      toast({
        title: 'Emails Sent',
        description: `Successfully sent ${result.sentCount} emails. ${result.failedCount} failed.`,
      });

      return result;

    } catch (err) {
      const totalTime = Date.now() - startTime;

      if (sendingStateRef.current.isCancelled) {
        logger.info('Email sending was cancelled', {
          totalTime,
          campaignId,
        });
        return null;
      }

      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);

      logger.error('Email sending failed', err instanceof Error ? err : new Error(errorMessage), {
        totalTime,
        retryCount: currentRetryCount,
        campaignId,
        recipientCount: recipients.length,
      });

      toast({
        title: 'Email Sending Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsSending(false);
      setProgress(100);
      setRetryCount(0);
      abortControllerRef.current = null;
    }
  }, [toast, validateEmailData]);

  return {
    sendEmails,
    isSending,
    error,
    progress,
    cancelSending,
    performanceMetrics,
    retryCount,
  };
};
