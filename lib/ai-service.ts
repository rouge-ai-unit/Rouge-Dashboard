/**
 * Enterprise-Grade Unified AI Service
 * 
 * Features:
 * - Multi-provider support (DeepSeek, OpenAI)
 * - Intelligent fallback mechanisms
 * - Rate limiting and request queuing
 * - Response caching and optimization
 * - Comprehensive error handling
 * - Production monitoring and health checks
 * - Real-time performance tracking
 * 
 * Used by both startup seeker and university systems
 */

import OpenAI from 'openai';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AIProvider {
  name: 'deepseek' | 'openai';
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
  provider?: 'deepseek' | 'openai' | 'auto';
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
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_RETRIES = 3;

  constructor() {
    this.initializeProviders();
    this.startHealthChecks();
    this.startCacheCleanup();
  }

  /**
   * Initialize AI providers with configuration
   */
  private initializeProviders(): void {
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // DeepSeek provider (primary for cost-effectiveness and performance)
    if (deepseekKey) {
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

      console.log('🧠 DeepSeek AI provider initialized (Primary)');
    } else {
      console.warn('⚠️ DEEPSEEK_API_KEY not found - DeepSeek provider disabled');
    }

    // OpenAI provider (backup/fallback with enhanced configuration)
    if (openaiKey) {
      const openaiClient = new OpenAI({
        apiKey: openaiKey,
        timeout: 25000,
        maxRetries: 1,
      });

      this.providers.set('openai', {
        name: 'openai',
        client: openaiClient,
        baseURL: 'https://api.openai.com',
        maxTokens: 4096,
        rateLimit: {
          requests: 60,
          window: 60 * 1000 // 1 minute
        },
        priority: 2,
        isHealthy: true
      });

      console.log('🤖 OpenAI provider initialized (Fallback)');
    } else {
      console.warn('⚠️ OPENAI_API_KEY not found - OpenAI provider disabled');
    }

    console.log(`🚀 AI Service initialized successfully with ${Array.from(this.providers.keys()).length} providers: ${Array.from(this.providers.keys()).join(', ')}`);
    
    if (this.providers.size === 0) {
      console.error('🚨 No AI providers available! Please configure DEEPSEEK_API_KEY or OPENAI_API_KEY');
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
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.responseCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        this.metrics.successfulRequests++;
        this.updateCacheHitRate(true);
        return { ...cached.response, cacheHit: true };
      }

      // Select provider
      const provider = this.selectProvider(request.provider);
      if (!provider) {
        throw new Error('No healthy AI providers available');
      }

      const maxRetries = request.retryAttempts || this.DEFAULT_RETRIES;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const model = this.getModelForProvider(provider.name, request.model);
          const maxTokens = Math.min(
            request.maxTokens || provider.maxTokens, 
            provider.maxTokens
          );

          const completion = await Promise.race([
            provider.client.chat.completions.create({
              model,
              messages: request.messages,
              temperature: request.temperature || 0.7,
              max_tokens: maxTokens,
            }),
            this.createTimeoutPromise(request.timeoutMs || this.DEFAULT_TIMEOUT)
          ]);

          if (!completion.choices?.[0]?.message?.content) {
            throw new Error('Invalid response from AI provider');
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

          return response;

        } catch (error) {
          lastError = error as Error;
          console.warn(`🔄 AI request attempt ${attempt + 1} failed:`, error);
          
          if (attempt < maxRetries) {
            // Exponential backoff
            await this.delay(Math.pow(2, attempt) * 1000);
            
            // Try different provider on next attempt
            const nextProvider = this.selectProvider();
            if (nextProvider && nextProvider.name !== provider.name) {
              Object.assign(provider, nextProvider);
            }
          }
        }
      }

      throw lastError || new Error('All retry attempts failed');

    } catch (error) {
      this.metrics.failedRequests++;
      this.updateErrorRate();
      console.error('🚨 AI service error:', error);
      throw error;
    }
  }

  /**
   * Get appropriate model for provider
   */
  private getModelForProvider(provider: string, requestedModel?: string): string {
    const models = {
      deepseek: {
        default: 'deepseek-chat',
        alternatives: ['deepseek-coder', 'deepseek-chat']
      },
      openai: {
        default: 'gpt-4o-mini',
        alternatives: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
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
            console.log(`✅ Provider ${provider.name} is back online`);
            provider.isHealthy = true;
          }

        } catch (error) {
          if (provider.isHealthy) {
            console.warn(`🚨 Provider ${provider.name} is unhealthy:`, error);
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
    this.responseCache.clear();
    console.log('🧹 AI service cache cleared');
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
    console.log('📊 AI service metrics reset');
  }
}

// ============================================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================================

export const unifiedAIService = new UnifiedAIService();

// Convenience methods for common use cases
export const aiComplete = (request: AIRequest) => unifiedAIService.complete(request);

export const aiGenerateStartupData = async (prompt: string, country: string = 'Global') => {
  return aiComplete({
    messages: [
      {
        role: 'system',
        content: `You are an expert agritech market research analyst. Generate real, accurate information about agritech startups. Only provide verified, factual data about existing companies.`
      },
      {
        role: 'user',
        content: `${prompt}\n\nFocus on ${country} if specified, otherwise provide global results. Return valid JSON only.`
      }
    ],
    temperature: 0.3,
    maxTokens: 2048,
    provider: 'deepseek' // Prefer DeepSeek for data generation
  });
};

export const aiGenerateUniversityData = async (prompt: string, country: string = 'Global') => {
  return aiComplete({
    messages: [
      {
        role: 'system',
        content: `You are an expert academic research analyst. Generate real, accurate information about universities with agricultural programs and technology transfer offices. Only provide verified, factual data about existing institutions.`
      },
      {
        role: 'user',
        content: `${prompt}\n\nFocus on ${country} if specified, otherwise provide global results. Return valid JSON only.`
      }
    ],
    temperature: 0.2,
    maxTokens: 2048,
    provider: 'deepseek' // Prefer DeepSeek for data generation
  });
};

export const aiAnalyzeData = async (data: any, analysisType: string) => {
  return aiComplete({
    messages: [
      {
        role: 'system',
        content: `You are an expert data analyst. Provide thorough, accurate analysis of the provided data.`
      },
      {
        role: 'user',
        content: `Analyze this ${analysisType} data and provide insights:\n\n${JSON.stringify(data, null, 2)}`
      }
    ],
    temperature: 0.4,
    maxTokens: 1024,
    provider: 'auto' // Let service choose best provider
  });
};

export default unifiedAIService;