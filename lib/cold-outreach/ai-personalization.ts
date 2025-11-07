/**
 * AI Personalization Service
 *
 * Enterprise-grade AI-powered personalization features for cold outreach
 * - Dynamic content generation
 * - Smart follow-up sequences
 * - Subject line optimization
 * - Contact intent analysis
 */

import { aiComplete } from '@/lib/ai-service';
import { logger, ValidationError, withPerformanceMonitoring, retryWithBackoff } from '../client-utils';
import { LRUCache } from './cache-utils';
import { z } from 'zod';

// Validation schemas
const ContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.string().min(1).max(100).optional(),
  company: z.string().min(1).max(100).optional(),
  industry: z.string().min(1).max(100).optional(),
  linkedinUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  location: z.string().min(1).max(100).optional(),
  notes: z.string().max(1000).optional()
});

const TemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.string().min(1).max(50).optional()
});

const MessageSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  status: z.string().min(1).max(50),
  sentAt: z.string().optional(),
  createdAt: z.string()
});

const FollowUpSequenceSchema = z.array(z.object({
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  delay: z.number().min(1).max(30),
  purpose: z.string().min(1).max(200)
}));

const ContactIntentAnalysisSchema = z.object({
  intent: z.enum(['interested', 'neutral', 'not_interested', 'unknown']),
  confidence: z.number().min(0).max(1),
  recommendations: z.array(z.string().min(1).max(200)),
  nextSteps: z.array(z.string().min(1).max(200))
});

const DynamicContentSchema = z.object({
  personalizedValueProp: z.string().min(1).max(1000),
  industryInsights: z.array(z.string().min(1).max(300)),
  socialProof: z.string().min(1).max(500)
});

// Custom error classes
class AIPersonalizationError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AIPersonalizationError';
  }
}

class AIQuotaExceededError extends AIPersonalizationError {
  constructor(message: string = 'AI service quota exceeded') {
    super(message, 'QUOTA_EXCEEDED');
  }
}

class AIInvalidResponseError extends AIPersonalizationError {
  constructor(message: string = 'Invalid response from AI service') {
    super(message, 'INVALID_RESPONSE');
  }
}

/**
 * Generate a personalized message based on contact information and template
 */
export const generatePersonalizedMessage = withPerformanceMonitoring(async function generatePersonalizedMessage(
  contact: Contact,
  template: Template,
  context?: any
): Promise<string> {
  try {
    // Validate inputs
    const contactValidation = ContactSchema.safeParse(contact);
    if (!contactValidation.success) {
      throw new ValidationError(`Invalid contact data: ${contactValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    const templateValidation = TemplateSchema.safeParse(template);
    if (!templateValidation.success) {
      throw new ValidationError(`Invalid template data: ${templateValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    logger.info('Generating personalized message', {
      contactId: contact.id,
      templateId: template.id,
      hasContext: !!context
    });

    const systemPrompt = `You are an expert cold outreach specialist. Generate a highly personalized email message that:

1. Uses the recipient's name and role appropriately
2. References their company and industry context
3. Incorporates specific details from their profile when relevant
4. Maintains a professional yet conversational tone
5. Includes a clear value proposition and call-to-action
6. Is concise but impactful (150-250 words)

Contact Information:
- Name: ${contact.name}
- Role: ${contact.role || 'Not specified'}
- Company: ${contact.company || 'Not specified'}
- Industry: ${contact.industry || 'Not specified'}
- Location: ${contact.location || 'Not specified'}
- LinkedIn: ${contact.linkedinUrl || 'Not available'}
- Website: ${contact.website || 'Not available'}
- Notes: ${contact.notes || 'No additional notes'}

Template to personalize:
Subject: ${template.subject}
Content: ${template.content}

Additional Context: ${context ? JSON.stringify(context) : 'None provided'}

Generate a personalized version that feels natural and tailored to this specific contact.`;

    const userPrompt = `Please generate a personalized cold outreach email for ${contact.name} based on the template provided. Make it feel authentic and specifically relevant to their role at ${contact.company || 'their company'}.`;

    const response: any = await retryWithBackoff(
      () => aiComplete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        maxTokens: 1000
      }),
      3,
      1000,
      (error: any): boolean => {
        logger.warn('AI completion failed, retrying', { error: error.message, attempt: error.attempt });
        const errorMessage = error?.message || String(error);
        return errorMessage.includes('quota') || errorMessage.includes('rate limit');
      }
    );

    if (!response.content || response.content.trim().length === 0) {
      throw new AIInvalidResponseError('AI service returned empty response');
    }

    logger.info('Personalized message generated successfully', {
      contactId: contact.id,
      contentLength: response.content.length
    });

    return response.content;

  } catch (error) {
    logger.error('Failed to generate personalized message', error as Error, {
      contactId: contact.id,
      templateId: template.id
    });

    if (error instanceof ValidationError || error instanceof AIPersonalizationError) {
      throw error;
    }

    if ((error as Error).message?.includes('quota')) {
      throw new AIQuotaExceededError();
    }

    throw new AIPersonalizationError('Failed to generate personalized message', 'GENERATION_FAILED', error);
  }
}, 'generatePersonalizedMessage');

/**
 * Generate a smart follow-up sequence based on the original message and contact response
 */
export const generateFollowUpSequence = withPerformanceMonitoring(async function generateFollowUpSequence(
  originalMessage: Message,
  contact: Contact,
  context?: any
): Promise<Array<{subject: string, content: string, delay: number, purpose: string}>> {
  try {
    // Validate inputs
    const messageValidation = MessageSchema.safeParse(originalMessage);
    if (!messageValidation.success) {
      throw new ValidationError(`Invalid message data: ${messageValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    const contactValidation = ContactSchema.safeParse(contact);
    if (!contactValidation.success) {
      throw new ValidationError(`Invalid contact data: ${contactValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    logger.info('Generating follow-up sequence', {
      messageId: originalMessage.id,
      contactId: contact.id,
      hasContext: !!context
    });

    const systemPrompt = `You are an expert sales follow-up strategist. Create a 3-email follow-up sequence that:

1. Acknowledges the original outreach
2. Provides additional value or insights
3. Creates urgency or social proof
4. Each email should be sent 3-5 days apart
5. Maintains the same professional tone
6. Includes clear next steps

Original Message:
Subject: ${originalMessage.subject}
Content: ${originalMessage.content}
Status: ${originalMessage.status}
Sent: ${originalMessage.sentAt || 'Not sent yet'}

Contact Information:
- Name: ${contact.name}
- Role: ${contact.role || 'Not specified'}
- Company: ${contact.company || 'Not specified'}

Additional Context: ${context ? JSON.stringify(context) : 'None provided'}

Return a JSON array of 3 follow-up emails with this structure:
[
  {
    "subject": "Follow-up subject line",
    "content": "Full email content",
    "delay": 3,
    "purpose": "Brief description of this follow-up's goal"
  }
]`;

    const userPrompt = `Generate a strategic 3-email follow-up sequence for ${contact.name} after the original outreach. Each email should build on the previous one and move the conversation forward.`;

    const response = await retryWithBackoff(
      () => aiComplete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.6,
        maxTokens: 1500
      }),
      3,
      1000,
      (error: any) => {
        logger.warn('AI completion failed, retrying', { error: error.message, attempt: error.attempt });
        const errorMessage = error?.message || String(error);
        return errorMessage.includes('quota') || errorMessage.includes('rate limit');
      }    );

    if (!response.content || response.content.trim().length === 0) {
      throw new AIInvalidResponseError('AI service returned empty response');
    }

    // Parse the JSON response
    let sequence;
    try {
      sequence = JSON.parse(response.content.trim());
    } catch (parseError) {
      logger.error('Failed to parse AI response as JSON', parseError as Error, {
        responseContent: response.content.substring(0, 200)
      });
      throw new AIInvalidResponseError('AI service returned invalid JSON');
    }

    // Validate the parsed sequence
    const sequenceValidation = FollowUpSequenceSchema.safeParse(sequence);
    if (!sequenceValidation.success) {
      throw new AIInvalidResponseError(`Invalid follow-up sequence format: ${sequenceValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    logger.info('Follow-up sequence generated successfully', {
      messageId: originalMessage.id,
      contactId: contact.id,
      sequenceLength: sequence.length
    });

    return sequence;

  } catch (error) {
    logger.error('Failed to generate follow-up sequence', error as Error, {
      messageId: originalMessage.id,
      contactId: contact.id
    });

    if (error instanceof ValidationError || error instanceof AIPersonalizationError) {
      throw error;
    }

    if ((error as Error).message?.includes('quota')) {
      throw new AIQuotaExceededError();
    }

    throw new AIPersonalizationError('Failed to generate follow-up sequence', 'SEQUENCE_GENERATION_FAILED', error);
  }
}, 'generateFollowUpSequence');

/**
 * Optimize subject line for better open rates
 */
export const optimizeSubjectLine = withPerformanceMonitoring(async function optimizeSubjectLine(
  contact: Contact,
  context?: any
): Promise<string> {
  try {
    // Validate input
    const contactValidation = ContactSchema.safeParse(contact);
    if (!contactValidation.success) {
      throw new ValidationError(`Invalid contact data: ${contactValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    logger.info('Optimizing subject line', {
      contactId: contact.id,
      hasContext: !!context
    });

    const systemPrompt = `You are a subject line optimization expert. Create compelling email subject lines that:

1. Are concise (30-50 characters ideal)
2. Create curiosity or urgency
3. Personalize when possible
4. Avoid spam trigger words
5. Include the recipient's name or company when appropriate
6. Focus on value or benefit

Contact Information:
- Name: ${contact.name}
- Role: ${contact.role || 'Not specified'}
- Company: ${contact.company || 'Not specified'}
- Industry: ${contact.industry || 'Not specified'}

Additional Context: ${context ? JSON.stringify(context) : 'None provided'}

Generate 3 optimized subject line options, focusing on different angles (curiosity, value, personalization). Return them as a JSON array of strings.`;

    const userPrompt = `Generate 3 optimized subject lines for an email to ${contact.name} at ${contact.company || 'their company'}. Make them compelling and likely to get opened.`;

    const response = await retryWithBackoff(
      () => aiComplete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        maxTokens: 300
      }),
      3,
      1000,
      (error: any) => {
        logger.warn('AI completion failed, retrying', { error: error.message, attempt: error.attempt });
        return error.message.includes('quota') || error.message.includes('rate limit');
      }
    );

    if (!response.content || response.content.trim().length === 0) {
      throw new AIInvalidResponseError('AI service returned empty response');
    }

    // Parse the JSON response
    let options;
    try {
      options = JSON.parse(response.content.trim());
      if (!Array.isArray(options) || options.length === 0) {
        throw new Error('Invalid subject line options format');
      }
    } catch (parseError) {
      logger.error('Failed to parse subject line options', parseError as Error, {
        responseContent: response.content.substring(0, 200)
      });
      // Fallback to a generic subject line
      return `Following up on our conversation, ${contact.name}`;
    }

    const selectedSubject = options[0] || `Following up on our conversation, ${contact.name}`;

    logger.info('Subject line optimized successfully', {
      contactId: contact.id,
      selectedSubject: selectedSubject.substring(0, 50)
    });

    return selectedSubject;

  } catch (error) {
    logger.error('Failed to optimize subject line', error as Error, {
      contactId: contact.id
    });

    if (error instanceof ValidationError || error instanceof AIPersonalizationError) {
      throw error;
    }

    if ((error as Error).message?.includes('quota')) {
      throw new AIQuotaExceededError();
    }

    // Return a fallback subject line
    logger.warn('Returning fallback subject line due to error', { contactId: contact.id });
    return `Following up on our conversation, ${contact.name}`;
  }
}, 'optimizeSubjectLine');

/**
 * Analyze contact intent and engagement patterns
 */
export const analyzeContactIntent = withPerformanceMonitoring(async function analyzeContactIntent(
  contact: Contact,
  messageHistory: Message[]
): Promise<{
  intent: 'interested' | 'neutral' | 'not_interested' | 'unknown';
  confidence: number;
  recommendations: string[];
  nextSteps: string[];
}> {
  try {
    // Validate inputs
    const contactValidation = ContactSchema.safeParse(contact);
    if (!contactValidation.success) {
      throw new ValidationError(`Invalid contact data: ${contactValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    if (!Array.isArray(messageHistory)) {
      throw new ValidationError('Invalid message history: must be an array');
    }

    // Validate each message in history
    for (const message of messageHistory) {
      const messageValidation = MessageSchema.safeParse(message);
      if (!messageValidation.success) {
        throw new ValidationError(`Invalid message in history: ${messageValidation.error.errors.map(e => e.message).join(', ')}`);
      }
    }

    logger.info('Analyzing contact intent', {
      contactId: contact.id,
      messageCount: messageHistory.length
    });

    const systemPrompt = `You are a sales intelligence analyst. Analyze the contact's engagement patterns and provide insights about their intent level.

Contact Information:
- Name: ${contact.name}
- Role: ${contact.role || 'Not specified'}
- Company: ${contact.company || 'Not specified'}
- Industry: ${contact.industry || 'Not specified'}

Message History (${messageHistory.length} messages):
${messageHistory.map(msg => `
Status: ${msg.status}
Subject: ${msg.subject}
Sent: ${msg.sentAt || msg.createdAt}
`).join('\n')}

Based on the message history and contact information, analyze their intent level and provide recommendations.

Return a JSON object with this structure:
{
  "intent": "interested|neutral|not_interested|unknown",
  "confidence": 0.0-1.0,
  "recommendations": ["Array of specific recommendations"],
  "nextSteps": ["Array of actionable next steps"]
}`;

    const userPrompt = `Analyze ${contact.name}'s engagement pattern and determine their level of interest. Provide specific recommendations for next steps.`;

    const response = await retryWithBackoff(
      () => aiComplete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        maxTokens: 800
      }),
      3,
      1000,
      (error: any) => {
        logger.warn('AI completion failed, retrying', { error: error.message, attempt: error.attempt });
        return error.message.includes('quota') || error.message.includes('rate limit');
      }
    );

    if (!response.content || response.content.trim().length === 0) {
      throw new AIInvalidResponseError('AI service returned empty response');
    }

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(response.content.trim());
    } catch (parseError) {
      logger.error('Failed to parse intent analysis response', parseError as Error, {
        responseContent: response.content.substring(0, 200)
      });
      throw new AIInvalidResponseError('AI service returned invalid JSON');
    }

    // Validate the parsed analysis
    const analysisValidation = ContactIntentAnalysisSchema.safeParse(analysis);
    if (!analysisValidation.success) {
      throw new AIInvalidResponseError(`Invalid intent analysis format: ${analysisValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    logger.info('Contact intent analyzed successfully', {
      contactId: contact.id,
      intent: analysis.intent,
      confidence: analysis.confidence
    });

    return analysis;

  } catch (error) {
    logger.error('Failed to analyze contact intent', error as Error, {
      contactId: contact.id,
      messageCount: messageHistory.length
    });

    if (error instanceof ValidationError || error instanceof AIPersonalizationError) {
      throw error;
    }

    if ((error as Error).message?.includes('quota')) {
      throw new AIQuotaExceededError();
    }

    // Return a safe fallback analysis
    logger.warn('Returning fallback intent analysis due to error', { contactId: contact.id });
    return {
      intent: 'unknown',
      confidence: 0.5,
      recommendations: ['Continue monitoring engagement', 'Send a gentle follow-up'],
      nextSteps: ['Review message history', 'Consider alternative approach']
    };
  }
}, 'analyzeContactIntent');

/**
 * Generate dynamic content based on contact profile and industry trends
 */
export const generateDynamicContent = withPerformanceMonitoring(async function generateDynamicContent(
  contact: Contact,
  industry: string,
  painPoints: string[]
): Promise<{
  personalizedValueProp: string;
  industryInsights: string[];
  socialProof: string;
}> {
  try {
    // Validate inputs
    const contactValidation = ContactSchema.safeParse(contact);
    if (!contactValidation.success) {
      throw new ValidationError(`Invalid contact data: ${contactValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    if (!industry || typeof industry !== 'string' || industry.trim().length === 0) {
      throw new ValidationError('Invalid industry: must be a non-empty string');
    }

    if (!Array.isArray(painPoints)) {
      throw new ValidationError('Invalid pain points: must be an array');
    }

    // Validate pain points
    for (const point of painPoints) {
      if (typeof point !== 'string' || point.trim().length === 0) {
        throw new ValidationError('Invalid pain point: must be a non-empty string');
      }
    }

    logger.info('Generating dynamic content', {
      contactId: contact.id,
      industry,
      painPointsCount: painPoints.length
    });

    const systemPrompt = `You are a content strategist specializing in B2B sales personalization. Generate dynamic content that addresses the contact's specific situation.

Contact Profile:
- Name: ${contact.name}
- Role: ${contact.role || 'Not specified'}
- Company: ${contact.company || 'Not specified'}
- Industry: ${industry}

Identified Pain Points:
${painPoints.map(point => `- ${point}`).join('\n')}

Generate personalized content including:
1. A tailored value proposition (2-3 sentences)
2. 3 relevant industry insights
3. A social proof example

Return as JSON with keys: personalizedValueProp, industryInsights (array), socialProof.`;

    const userPrompt = `Create personalized content for ${contact.name} in the ${industry} industry, addressing their specific pain points.`;

    const response = await retryWithBackoff(
      () => aiComplete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        maxTokens: 1000
      }),
      3,
      1000,
      (error: any) => {
        logger.warn('AI completion failed, retrying', { error: error.message, attempt: error.attempt });
        return error.message.includes('quota') || error.message.includes('rate limit');
      }
    );

    if (!response.content || response.content.trim().length === 0) {
      throw new AIInvalidResponseError('AI service returned empty response');
    }

    // Parse the JSON response
    let content;
    try {
      content = JSON.parse(response.content.trim());
    } catch (parseError) {
      logger.error('Failed to parse dynamic content response', parseError as Error, {
        responseContent: response.content.substring(0, 200)
      });
      throw new AIInvalidResponseError('AI service returned invalid JSON');
    }

    // Validate the parsed content
    const contentValidation = DynamicContentSchema.safeParse(content);
    if (!contentValidation.success) {
      throw new AIInvalidResponseError(`Invalid dynamic content format: ${contentValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    logger.info('Dynamic content generated successfully', {
      contactId: contact.id,
      industry,
      valuePropLength: content.personalizedValueProp.length,
      insightsCount: content.industryInsights.length
    });

    return content;

  } catch (error) {
    logger.error('Failed to generate dynamic content', error as Error, {
      contactId: contact.id,
      industry,
      painPointsCount: painPoints.length
    });

    if (error instanceof ValidationError || error instanceof AIPersonalizationError) {
      throw error;
    }

    if ((error as Error).message?.includes('quota')) {
      throw new AIQuotaExceededError();
    }

    throw new AIPersonalizationError('Failed to generate dynamic content', 'CONTENT_GENERATION_FAILED', error);
  }
}, 'generateDynamicContent');

// Cache instance for expensive AI operations
const personalizationCache = new LRUCache<any>(100, 60 * 60 * 1000, 'ai-personalization');

/**
 * Get cached personalized message or generate new one
 */
export const getCachedPersonalizedMessage = withPerformanceMonitoring(async function getCachedPersonalizedMessage(
  contact: Contact,
  template: Template,
  context?: any
): Promise<string> {
  const cacheKey = `personalized_${contact.id}_${template.id}_${JSON.stringify(context || {})}`;

  const cached = personalizationCache.get(cacheKey);
  if (cached) {
    logger.debug('Returning cached personalized message', { contactId: contact.id, templateId: template.id });
    return cached as string;
  }

  const message = await generatePersonalizedMessage(contact, template, context);
  personalizationCache.set(cacheKey, message);

  return message;
}, 'getCachedPersonalizedMessage');

/**
 * Get cached follow-up sequence or generate new one
 */
export const getCachedFollowUpSequence = withPerformanceMonitoring(async function getCachedFollowUpSequence(
  originalMessage: Message,
  contact: Contact,
  context?: any
): Promise<Array<{subject: string, content: string, delay: number, purpose: string}>> {
  const cacheKey = `followup_${originalMessage.id}_${contact.id}_${JSON.stringify(context || {})}`;

  const cached = personalizationCache.get(cacheKey);
  if (cached) {
    logger.debug('Returning cached follow-up sequence', { messageId: originalMessage.id, contactId: contact.id });
    return cached as Array<{subject: string, content: string, delay: number, purpose: string}>;
  }

  const sequence = await generateFollowUpSequence(originalMessage, contact, context);
  personalizationCache.set(cacheKey, sequence);

  return sequence;
}, 'getCachedFollowUpSequence');

/**
 * Clear personalization cache for a specific contact
 */
export function clearContactCache(contactId: string): void {
  logger.info('Clearing personalization cache for contact', { contactId });
  
  try {
    // Iterate through cache keys and delete matching ones
    const keysToDelete: string[] = [];
    
    // Access the internal cache Map to get keys
    const cacheInternal = (personalizationCache as any).cache as Map<string, any>;
    if (cacheInternal && cacheInternal.keys) {
      for (const key of cacheInternal.keys()) {
        // Check if key contains the contactId
        if (key.includes(contactId)) {
          keysToDelete.push(key);
        }
      }
      
      // Delete matching keys
      keysToDelete.forEach(key => {
        personalizationCache.delete(key);
      });
      
      logger.info('Cleared personalization cache entries', {
        contactId,
        entriesCleared: keysToDelete.length
      });
    } else {
      // Fallback: clear entire cache if we can't access keys
      logger.warn('Unable to access cache keys, clearing entire cache', { contactId });
      personalizationCache.clear();
    }
  } catch (error) {
    logger.error('Error clearing contact cache, clearing entire cache', error instanceof Error ? error : new Error(String(error)), {
      contactId
    });
    personalizationCache.clear();
  }
}
/**
 * Get cache statistics
 */
export function getCacheStats() {
  return personalizationCache.getStats();
}

// Export interfaces for backward compatibility
export interface Contact {
  id: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
  industry?: string;
  linkedinUrl?: string;
  website?: string;
  location?: string;
  notes?: string;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
  category?: string;
}

export interface Message {
  id: string;
  subject: string;
  content: string;
  status: string;
  sentAt?: string;
  createdAt: string;
}
