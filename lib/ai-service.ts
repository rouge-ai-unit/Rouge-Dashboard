/**
 * Enterprise-Grade Unified AI Service
 *
 * Features:
 * - Multi-provider support (DeepSeek primary, Gemini secondary - temporarily disabled)
 * - Intelligent fallback mechanisms
 * - Rate limiting and request queuing
 * - Response caching and optimization
 * - Comprehensive error handling
 * - Production monitoring and health checks
 * - Real-time performance tracking
 * - Input validation and sanitization
 * - Structured logging and audit trails
 *
 * Used by both startup seeker and university systems
 */

import OpenAI from 'openai';
import { logger, ValidationError, withPerformanceMonitoring, sanitizeInput } from './client-utils';
import { z } from 'zod';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AIProvider {
  name: 'deepseek' | 'gemini';
  client: OpenAI;
  baseURL: string;
  maxTokens: number;
  rateLimit: {
    requests: number;
    window: number; // in milliseconds
  };
  priority: number; // 1 = highest priority
  isHealthy: boolean;
}

export interface AIRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  provider?: 'deepseek' | 'gemini' | 'auto';
  retryAttempts?: number;
  timeoutMs?: number;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  processingTime: number;
  cacheHit?: boolean;
  retryCount?: number;
}

export interface AIServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  providerUsage: Record<string, number>;
  errorRate: number;
  cacheHitRate: number;
}

// Validation schemas
const AIMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1).max(10000)
});

const AIRequestSchema = z.object({
  messages: z.array(AIMessageSchema).min(1).max(50),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(32768).optional(),
  model: z.string().min(1).max(100).optional(),
  provider: z.enum(['deepseek', 'gemini', 'auto']).optional(),
  retryAttempts: z.number().min(0).max(5).optional(),
  timeoutMs: z.number().min(1000).max(300000).optional()
});

const AIProviderConfigSchema = z.object({
  name: z.enum(['deepseek', 'gemini']),
  baseURL: z.string().url(),
  maxTokens: z.number().min(1).max(32768),
  rateLimit: z.object({
    requests: z.number().min(1).max(10000),
    window: z.number().min(1000).max(3600000)
  }),
  priority: z.number().min(1).max(10),
  apiKey: z.string().min(10).max(200)
});

// Custom error classes
class AIServiceError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AIServiceError';
  }
}

class AIProviderError extends AIServiceError {
  constructor(message: string, public provider: string, details?: any) {
    super(message, 'PROVIDER_ERROR', details);
  }
}

class AIQuotaExceededError extends AIServiceError {
  constructor(message: string = 'AI service quota exceeded') {
    super(message, 'QUOTA_EXCEEDED');
  }
}

class AIInvalidRequestError extends AIServiceError {
  constructor(message: string = 'Invalid AI request') {
    super(message, 'INVALID_REQUEST');
  }
}

class AIUnavailableError extends AIServiceError {
  constructor(message: string = 'AI service temporarily unavailable') {
    super(message, 'SERVICE_UNAVAILABLE');
  }
}

// ============================================================================
// UNIFIED AI SERVICE CLASS
// ============================================================================

class UnifiedAIService {
  private providers: Map<string, AIProvider> = new Map();
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();
  private responseCache: Map<string, { response: AIResponse; expiry: number }> = new Map();
  private metrics: AIServiceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    providerUsage: {},
    errorRate: 0,
    cacheHitRate: 0
  };

  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly DEFAULT_TIMEOUT = 120000; // 120 seconds (increased from 60)
  private readonly DEFAULT_RETRIES = 2; // Reduced from 3 to avoid too many timeouts

  constructor() {
    this.initializeProviders();
    this.startHealthChecks();
    this.startCacheCleanup();

    logger.info('AI Service initialized', {
      providersCount: this.providers.size,
      cacheEnabled: true,
      healthChecksEnabled: true
    });
  }

  /**
   * Initialize AI providers with configuration
   */
  private initializeProviders(): void {
    try {
      const deepseekKey = process.env.DEEPSEEK_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      let providersInitialized = 0;

      // DeepSeek provider (primary for cost-effectiveness and performance)
      if (deepseekKey) {
        // Validate configuration
        const deepseekConfig = AIProviderConfigSchema.safeParse({
          name: 'deepseek',
          baseURL: 'https://api.deepseek.com',
          maxTokens: 8192,
          rateLimit: { requests: 100, window: 60 * 1000 },
          priority: 1,
          apiKey: deepseekKey
        });

        if (!deepseekConfig.success) {
          logger.error('Invalid DeepSeek configuration', undefined, {
            errors: deepseekConfig.error.errors
          });
          throw new ValidationError('Invalid DeepSeek provider configuration');
        }

        const deepseekClient = new OpenAI({
          apiKey: deepseekKey,
          baseURL: 'https://api.deepseek.com',
          timeout: 30000,
          maxRetries: 2,
        });

        this.providers.set('deepseek', {
          name: 'deepseek',
          client: deepseekClient,
          baseURL: 'https://api.deepseek.com',
          maxTokens: 8192,
          rateLimit: {
            requests: 100,
            window: 60 * 1000 // 1 minute
          },
          priority: 1,
          isHealthy: true
        });

        providersInitialized++;
        logger.info('DeepSeek AI provider initialized', { priority: 1 });
      } else {
        logger.warn('DEEPSEEK_API_KEY not configured - DeepSeek provider disabled');
      }

      // Gemini provider (temporarily disabled due to rate limiting)
      if (geminiKey) {
        logger.info('Gemini provider available but temporarily disabled due to rate limiting');
      } else {
        logger.warn('GEMINI_API_KEY not configured - Gemini provider disabled');
      }

      if (providersInitialized === 0) {
        logger.error(
          'No AI providers available - service will not function',
          undefined,
          { expectedEnvVars: ['DEEPSEEK_API_KEY', 'GEMINI_API_KEY'] }
        );
      }

      logger.info('AI providers initialization completed', {
        providersInitialized,
        totalConfigured: this.providers.size
      });

    } catch (error) {
      logger.error('Failed to initialize AI providers', error as Error);
      throw error;
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: AIRequest): string {
    const key = JSON.stringify({
      messages: request.messages,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      model: request.model
    });
    return Buffer.from(key).toString('base64').slice(0, 64);
  }

  /**
   * Check rate limit for provider
   */
  private checkRateLimit(provider: AIProvider): boolean {
    const now = Date.now();
    const key = provider.name;
    const limit = this.rateLimitMap.get(key);

    if (!limit || now > limit.resetTime) {
      this.rateLimitMap.set(key, { 
        count: 1, 
        resetTime: now + provider.rateLimit.window 
      });
      return true;
    }

    if (limit.count >= provider.rateLimit.requests) {
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Select best available provider based on health, rate limits, and priority
   */
  private selectProvider(preferredProvider?: string): AIProvider | null {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.isHealthy && this.checkRateLimit(p))
      .sort((a, b) => a.priority - b.priority);

    if (preferredProvider && this.providers.has(preferredProvider)) {
      const preferred = this.providers.get(preferredProvider)!;
      if (preferred.isHealthy && this.checkRateLimit(preferred)) {
        return preferred;
      }
    }

    return availableProviders.length > 0 ? availableProviders[0] : null;
  }

  /**
   * Main AI completion method with intelligent routing and fallback
   */
  public async complete(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Validate request
      const validation = AIRequestSchema.safeParse(request);
      if (!validation.success) {
        throw new AIInvalidRequestError(`Invalid request: ${validation.error.errors.map(e => e.message).join(', ')}`);
      }

      const sanitizedRequest = request; // Use request directly

      logger.debug('AI completion request started', {
        messageCount: sanitizedRequest.messages.length,
        requestedProvider: sanitizedRequest.provider,
        maxTokens: sanitizedRequest.maxTokens
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(sanitizedRequest);
      const cached = this.responseCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        this.metrics.successfulRequests++;
        this.updateCacheHitRate(true);

        logger.debug('AI completion served from cache', {
          cacheKey: cacheKey.substring(0, 16),
          cacheAge: Date.now() - (cached.expiry - this.CACHE_TTL)
        });

        return { ...cached.response, cacheHit: true };
      }

      // Select provider
      const provider = this.selectProvider(sanitizedRequest.provider);
      if (!provider) {
        if (this.providers.size === 0) {
          throw new AIUnavailableError(
            'No AI providers configured. Please set DEEPSEEK_API_KEY or GEMINI_API_KEY.'
          );
        }
        throw new AIUnavailableError('No healthy AI providers available');
      }

      const maxRetries = sanitizedRequest.retryAttempts || this.DEFAULT_RETRIES;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const model = this.getModelForProvider(provider.name, sanitizedRequest.model);
          const maxTokens = Math.min(
            sanitizedRequest.maxTokens || provider.maxTokens,
            provider.maxTokens
          );

          logger.debug('AI completion attempt', {
            provider: provider.name,
            model,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1
          });

          const completion = await Promise.race([
            provider.client.chat.completions.create({
              model,
              messages: sanitizedRequest.messages,
              temperature: sanitizedRequest.temperature || 0.7,
              max_tokens: maxTokens,
            }),
            this.createTimeoutPromise(sanitizedRequest.timeoutMs || this.DEFAULT_TIMEOUT)
          ]);

          if (!completion.choices?.[0]?.message?.content) {
            throw new AIProviderError('Invalid response from AI provider', provider.name);
          }

          const response: AIResponse = {
            content: completion.choices[0].message.content,
            provider: provider.name,
            model: completion.model,
            tokens: {
              prompt: completion.usage?.prompt_tokens || 0,
              completion: completion.usage?.completion_tokens || 0,
              total: completion.usage?.total_tokens || 0
            },
            processingTime: Date.now() - startTime,
            retryCount: attempt
          };

          // Cache successful response
          this.responseCache.set(cacheKey, {
            response,
            expiry: Date.now() + this.CACHE_TTL
          });

          // Update metrics
          this.metrics.successfulRequests++;
          this.metrics.providerUsage[provider.name] =
            (this.metrics.providerUsage[provider.name] || 0) + 1;
          this.updateAverageResponseTime(Date.now() - startTime);
          this.updateCacheHitRate(false);

          logger.info('AI completion successful', {
            provider: provider.name,
            model,
            tokens: response.tokens,
            processingTime: response.processingTime,
            retryCount: attempt
          });

          return response;

        } catch (error) {
          lastError = error as Error;

          logger.warn('AI completion attempt failed', {
            provider: provider.name,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            error: lastError.message
          });

          if (attempt < maxRetries) {
            // Exponential backoff
            const backoffMs = Math.pow(2, attempt) * 1000;
            await this.delay(backoffMs);

            // Try different provider on next attempt
            const nextProvider = this.selectProvider();
            if (nextProvider && nextProvider.name !== provider.name) {
              Object.assign(provider, nextProvider);
              logger.debug('Switching to different provider', {
                from: provider.name,
                to: nextProvider.name
              });
            }
          }
        }
      }

      // All retries failed
      const finalError = lastError || new Error('All retry attempts failed');
      throw new AIProviderError(`AI completion failed after ${maxRetries + 1} attempts: ${finalError.message}`, provider.name);

    } catch (error) {
      this.metrics.failedRequests++;
      this.updateErrorRate();

      logger.error('AI completion failed', error as Error, {
        totalRequests: this.metrics.totalRequests,
        errorRate: this.metrics.errorRate
      });

      // Re-throw custom errors as-is
      if (error instanceof AIServiceError) {
        throw error;
      }

      // Wrap unknown errors
      throw new AIServiceError('Unexpected AI service error', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Get appropriate model for provider
   */
  private getModelForProvider(provider: string, requestedModel?: string): string {
    const models = {
      gemini: {
        default: 'gemini-1.5-flash',
        alternatives: ['gemini-1.5-flash', 'gemini-1.5-pro']
      },
      deepseek: {
        default: 'deepseek-chat',
        alternatives: ['deepseek-coder', 'deepseek-chat']
      }
    };

    if (requestedModel && models[provider as keyof typeof models]) {
      return requestedModel;
    }

    return models[provider as keyof typeof models]?.default || 'gpt-4o-mini';
  }

  /**
   * Create timeout promise for request cancellation
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI request timeout')), timeoutMs);
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update average response time metric
   */
  private updateAverageResponseTime(responseTime: number): void {
    const total = this.metrics.totalRequests;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (total - 1)) + responseTime) / total;
  }

  /**
   * Update error rate metric
   */
  private updateErrorRate(): void {
    this.metrics.errorRate = 
      this.metrics.failedRequests / this.metrics.totalRequests;
  }

  /**
   * Update cache hit rate metric
   */
  private updateCacheHitRate(isHit: boolean): void {
    const hits = isHit ? 1 : 0;
    const total = this.metrics.totalRequests;
    this.metrics.cacheHitRate = 
      ((this.metrics.cacheHitRate * (total - 1)) + hits) / total;
  }

  /**
   * Start periodic health checks for providers
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      for (const provider of this.providers.values()) {
        try {
          const testRequest: AIRequest = {
            messages: [{ role: 'user', content: 'Health check' }],
            maxTokens: 10,
            timeoutMs: 5000
          };

          await provider.client.chat.completions.create({
            model: this.getModelForProvider(provider.name),
            messages: testRequest.messages,
            max_tokens: 10,
          });

          if (!provider.isHealthy) {
            logger.info('AI provider recovered', { provider: provider.name });
            provider.isHealthy = true;
          }

        } catch (error) {
          if (provider.isHealthy) {
            logger.warn('AI provider became unhealthy', {
              provider: provider.name,
              error: (error as Error).message
            });
            provider.isHealthy = false;
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.responseCache.entries()) {
        if (cached.expiry <= now) {
          this.responseCache.delete(key);
        }
      }
    }, 300000); // Clean every 5 minutes
  }

  /**
   * Get current service metrics
   */
  public getMetrics(): AIServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get provider health status
   */
  public getProviderHealth(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    for (const [name, provider] of this.providers.entries()) {
      health[name] = provider.isHealthy;
    }
    return health;
  }

  /**
   * Force clear cache (for testing/debugging)
   */
  public clearCache(): void {
    const cacheSize = this.responseCache.size;
    this.responseCache.clear();
    logger.info('AI service cache cleared', { entriesCleared: cacheSize });
  }

  /**
   * Reset metrics (for testing/debugging)
   */
  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      providerUsage: {},
      errorRate: 0,
      cacheHitRate: 0
    };
    logger.info('AI service metrics reset');
  }
}

// ============================================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================================

export const unifiedAIService = new UnifiedAIService();

// Convenience methods for common use cases
export const aiComplete = withPerformanceMonitoring(async (request: AIRequest) => {
  return unifiedAIService.complete(request);
}, 'aiComplete');

export const aiGenerateStartupData = withPerformanceMonitoring(async (prompt: string, country: string = 'Global') => {
  // Validate inputs
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new AIInvalidRequestError('Invalid prompt for startup data generation');
  }

  if (!country || typeof country !== 'string' || country.trim().length === 0) {
    throw new AIInvalidRequestError('Invalid country for startup data generation');
  }
  const sanitizedCountry = sanitizeInput(country);

  logger.info('Generating startup data', { country: sanitizedCountry, promptLength: prompt.length });

  return aiComplete({
    messages: [
      {
        role: 'system',
        content: `You are an expert agritech market research analyst. Generate real, accurate information about agritech startups. Only provide verified, factual data about existing companies.`
      },
      {
        role: 'user',
        content: `${prompt}\n\nFocus on ${sanitizedCountry} if specified, otherwise provide global results. Return valid JSON only.`
      }
    ],
    temperature: 0.3,
    maxTokens: 2048,
    provider: 'deepseek' // Use DeepSeek as Gemini is temporarily disabled
  });
}, 'aiGenerateStartupData');
export const aiGenerateUniversityData = withPerformanceMonitoring(async (prompt: string, country: string = 'Global') => {
  // Validate inputs
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new AIInvalidRequestError('Invalid prompt for university data generation');
  }

  if (!country || typeof country !== 'string' || country.trim().length === 0) {
    throw new AIInvalidRequestError('Invalid country for university data generation');
  }

  const sanitizedPrompt = sanitizeInput(prompt);
  const sanitizedCountry = sanitizeInput(country);

  logger.info('Generating university data', { country: sanitizedCountry, promptLength: sanitizedPrompt.length });

  return aiComplete({
    messages: [
      {
        role: 'system',
        content: `You are an expert academic research analyst. Generate real, accurate information about universities with agricultural programs and technology transfer offices. Only provide verified, factual data about existing institutions.`
      },
      {
        role: 'user',
        content: `${sanitizedPrompt}\n\nFocus on ${sanitizedCountry} if specified, otherwise provide global results. Return valid JSON only.`
      }
    ],
    temperature: 0.2,
    maxTokens: 2048,
    provider: 'gemini' // Prefer Gemini for data generation
  });
}, 'aiGenerateUniversityData');

export const aiAnalyzeData = withPerformanceMonitoring(async (data: any, analysisType: string) => {
  // Validate inputs
  if (!data) {
    throw new AIInvalidRequestError('Invalid data for analysis');
  }

  if (!analysisType || typeof analysisType !== 'string' || analysisType.trim().length === 0) {
    throw new AIInvalidRequestError('Invalid analysis type');
  }

  const sanitizedAnalysisType = sanitizeInput(analysisType);

  logger.info('Analyzing data', { analysisType: sanitizedAnalysisType, dataType: typeof data });

  return aiComplete({
    messages: [
      {
        role: 'system',
        content: `You are an expert data analyst. Provide thorough, accurate analysis of the provided data.`
      },
      {
        role: 'user',
        content: `Analyze this ${sanitizedAnalysisType} data and provide insights:\n\n${JSON.stringify(data, null, 2)}`
      }
    ],
    temperature: 0.4,
    maxTokens: 1024,
    provider: 'auto' // Let service choose best provider
  });
}, 'aiAnalyzeData');

export default unifiedAIService;
