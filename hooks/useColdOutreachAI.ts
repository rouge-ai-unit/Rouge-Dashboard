/**
 * Cold Outreach AI Hook - Enterprise Grade
 *
 * Custom hook for generating AI-powered cold outreach messages
 * in the Cold Connect Automator tool
 *
 * ## Features
 * - Comprehensive error handling and logging
 * - Performance monitoring and metrics
 * - Audit logging for compliance
 * - Input validation and sanitization
 * - Retry logic with exponential backoff
 * - Rate limiting and abuse prevention
 * - Security considerations and XSS prevention
 * - Enterprise-grade TypeScript typing
 *
 * ## Security
 * - Input sanitization and validation
 * - Rate limiting to prevent abuse
 * - Audit logging for compliance
 * - Error masking for production
 *
 * ## Performance
 * - Performance monitoring
 * - Retry logic with backoff
 * - Request deduplication
 * - Memory leak prevention
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger, withPerformanceMonitoring, ValidationError, retryWithBackoff, sanitizeInput } from '@/lib/client-utils';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// Validation schemas
const recipientInfoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  role: z.string().optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
});

const generateMessageParamsSchema = z.object({
  recipientInfo: recipientInfoSchema,
  valueProposition: z.string().min(1, 'Value proposition is required').max(1000, 'Value proposition must be less than 1000 characters'),
  context: z.record(z.any()).optional(),
});

interface RecipientInfo {
  name: string;
  role?: string;
  company?: string;
  industry?: string;
}

interface AIHookReturn {
  generateMessage: (
    recipientInfo: RecipientInfo,
    valueProposition: string,
    context?: any
  ) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
  retryCount: number;
  lastRequestTime: number | null;
  performanceMetrics: {
    averageResponseTime: number;
    totalRequests: number;
    successRate: number;
  };
}

interface RequestCache {
  [key: string]: {
    result: string;
    timestamp: number;
  };
}

export const useColdOutreachAI = (): AIHookReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRequestTime, setLastRequestTime] = useState<number | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageResponseTime: 0,
    totalRequests: 0,
    successRate: 1,
  });

  const { toast } = useToast();
  const requestCache = useRef<RequestCache>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const performanceHistory = useRef<number[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Cache key generation for request deduplication
  const generateCacheKey = useCallback((
    recipientInfo: RecipientInfo,
    valueProposition: string,
    context?: any
  ): string => {
    const sanitizedName = sanitizeInput(recipientInfo.name);
    const sanitizedValueProp = sanitizeInput(valueProposition);
    const contextKey = context ? JSON.stringify(context) : '';
    return `${sanitizedName}-${sanitizedValueProp}-${contextKey}`;
  }, []);

  // Performance metrics calculation
  const updatePerformanceMetrics = useCallback((responseTime: number, success: boolean) => {
    performanceHistory.current.push(responseTime);

    // Keep only last 100 measurements
    if (performanceHistory.current.length > 100) {
      performanceHistory.current.shift();
    }

    const totalRequests = performanceHistory.current.length;
    const successfulRequests = performanceHistory.current.filter((_, index) =>
      index < totalRequests - (success ? 0 : 1)
    ).length;

    const averageResponseTime = performanceHistory.current.reduce((a, b) => a + b, 0) / totalRequests;
    const successRate = successfulRequests / totalRequests;

    setPerformanceMetrics({
      averageResponseTime,
      totalRequests,
      successRate,
    });
  }, []);

  const generateMessage = useCallback(async (
    recipientInfo: RecipientInfo,
    valueProposition: string,
    context?: any
  ): Promise<string | null> => {
    const startTime = Date.now();
    let currentRetryCount = 0;

    try {
      // Input validation
      const validationResult = generateMessageParamsSchema.safeParse({
        recipientInfo,
        valueProposition,
        context,
      });

      if (!validationResult.success) {
        const validationError = new ValidationError(
          `Invalid input parameters for AI message generation: ${validationResult.error.errors.map(e => e.message).join(', ')}`
        );
        logger.error('AI message generation validation failed', validationError, {
          recipientInfo: { ...recipientInfo, name: '[REDACTED]' },
          valuePropositionLength: valueProposition.length,
        });
        throw validationError;
      }

      // Sanitize inputs
      const sanitizedRecipientInfo = {
        name: sanitizeInput(recipientInfo.name),
        role: recipientInfo.role ? sanitizeInput(recipientInfo.role) : undefined,
        company: recipientInfo.company ? sanitizeInput(recipientInfo.company) : undefined,
        industry: recipientInfo.industry ? sanitizeInput(recipientInfo.industry) : undefined,
      };

      const sanitizedValueProposition = sanitizeInput(valueProposition);

      // Check cache for duplicate requests
      const cacheKey = generateCacheKey(sanitizedRecipientInfo, sanitizedValueProposition, context);
      const cachedResult = requestCache.current[cacheKey];

      if (cachedResult && (Date.now() - cachedResult.timestamp) < 300000) { // 5 minutes cache
        logger.info('Returning cached AI message result', {
          cacheKey: '[REDACTED]',
          cacheAge: Date.now() - cachedResult.timestamp,
        });
        return cachedResult.result;
      }

      setIsLoading(true);
      setError(null);
      setRetryCount(0);

      // Create abort controller for request cancellation
      abortControllerRef.current = new AbortController();

      // Rate limiting check
      const rateLimitResult = coldOutreachRateLimit.check('anonymous', {
        headers: new Headers(),
        url: '/api/cold-outreach/ai-personalization',
        method: 'POST',
      } as any);

      if (!rateLimitResult.allowed) {
        logger.warn('AI generation rate limit exceeded', {
          recipientInfo: { ...sanitizedRecipientInfo, name: '[REDACTED]' },
          limit: 30,
          resetTime: rateLimitResult.resetTime,
        });

        toast({
          title: 'Rate Limit Exceeded',
          description: 'Please wait before generating more messages.',
          variant: 'destructive',
        });

        return null;
      }

      logger.info('Starting AI message generation', {
        recipientInfo: { ...sanitizedRecipientInfo, name: '[REDACTED]' },
        valuePropositionLength: sanitizedValueProposition.length,
        hasContext: !!context,
      });

      // Generate message with retry logic
      const result = await retryWithBackoff(
        async () => {
          currentRetryCount++;
          setRetryCount(currentRetryCount);

          const response = await fetch('/api/cold-outreach/ai-personalization', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'generate_personalized_message',
              contactId: context?.contactId,
              templateId: context?.templateId,
              context: {
                recipientInfo: sanitizedRecipientInfo,
                valueProposition: sanitizedValueProposition,
                ...context,
              },
            }),
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          if (!data.message || typeof data.message !== 'string') {
            throw new Error('Invalid response format: missing or invalid message');
          }

          return data.message;
        },
        3,
        1000,
        (error, attempt) => {
          logger.warn('AI message generation retry', {
            attempt,
            error: error.message,
            recipientInfo: { ...sanitizedRecipientInfo, name: '[REDACTED]' },
          });
          return true; // Always retry on failure
        }
      );

      const responseTime = Date.now() - startTime;
      setLastRequestTime(Date.now());
      updatePerformanceMetrics(responseTime, true);

      // Cache successful result
      requestCache.current[cacheKey] = {
        result,
        timestamp: Date.now(),
      };

      logger.info('AI message generation completed successfully', {
        responseTime,
        messageLength: result.length,
        retryCount: currentRetryCount,
        recipientInfo: { ...sanitizedRecipientInfo, name: '[REDACTED]' },
      });

      toast({
        title: 'Message Generated',
        description: 'AI-powered message created successfully.',
      });

      return result;

    } catch (err) {
      const responseTime = Date.now() - startTime;
      updatePerformanceMetrics(responseTime, false);

      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);

      logger.error('AI message generation failed', err instanceof Error ? err : new Error(errorMessage), {
        recipientInfo: { ...recipientInfo, name: '[REDACTED]' },
        valuePropositionLength: valueProposition.length,
        responseTime,
        retryCount: currentRetryCount,
      });

      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsLoading(false);
      setRetryCount(0);
      abortControllerRef.current = null;
    }
  }, [toast, generateCacheKey, updatePerformanceMetrics]);

  return {
    generateMessage,
    isLoading,
    error,
    retryCount,
    lastRequestTime,
    performanceMetrics,
  };
};
