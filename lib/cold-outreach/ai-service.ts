/**
 * Cold Outreach AI Service
 *
 * Specialized AI service for generating personalized cold outreach messages
 * for agritech startups and agricultural universities
 *
 * ## Features
 * - AI-powered message generation with caching
 * - Personalized content based on recipient context
 * - Follow-up message generation
 * - Message template creation
 *
 * ## Security
 * - Input sanitization to prevent prompt injection
 * - Output sanitization to prevent XSS
 * - Rate limiting via cache expiration
 *
 * ## Performance
 * - Caching of AI responses for 1-24 hours depending on type
 * - Efficient prompt engineering for cost optimization
 */

import { aiComplete, AIRequest } from '@/lib/ai-service';
import { aiMessageCache } from '@/lib/cold-outreach/cache-utils';
import { sanitizeInput, sanitizeRichText } from '@/lib/cold-outreach/security-utils';

/**
 * Generate personalized cold outreach message
 * @param recipientInfo Information about the recipient for personalization
 * @param companyName Name of the company/organization
 * @param valueProposition The core value proposition to communicate
 * @param context Additional context for personalization
 * @returns Promise<string> The generated AI message
 */
export async function generateColdOutreachMessage(
  recipientInfo: {
    name: string;
    role?: string;
    company?: string;
    industry?: string;
  },
  valueProposition: string,
  context?: any
): Promise<string> {
  // Sanitize inputs
  const sanitizedRecipientInfo = {
    name: sanitizeInput(recipientInfo.name),
    role: recipientInfo.role ? sanitizeInput(recipientInfo.role) : undefined,
    company: recipientInfo.company ? sanitizeInput(recipientInfo.company) : undefined,
    industry: recipientInfo.industry ? sanitizeInput(recipientInfo.industry) : undefined,
  };
  
  const sanitizedValueProposition = sanitizeInput(valueProposition);
  const sanitizedContext = context ? JSON.parse(JSON.stringify(context)) : undefined;
  
  // Create cache key based on input parameters
  const cacheKey = `cold_outreach:${sanitizedRecipientInfo.name}:${sanitizedRecipientInfo.role || ''}:${sanitizedRecipientInfo.company || ''}:${sanitizedRecipientInfo.industry || ''}:${sanitizedValueProposition}:${JSON.stringify(sanitizedContext || {})}`;
  
  // Check cache first
  const cachedResult = aiMessageCache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache hit for cold outreach message generation');
    return cachedResult;
  }

  const systemPrompt = `You are an expert sales copywriter specializing in agricultural technology. 
Your task is to create highly personalized, concise, and compelling cold outreach messages for agritech startups and agricultural universities.

Guidelines:
1. Keep messages under 150 words
2. Be direct and value-focused
3. Reference specific pain points or opportunities relevant to the recipient
4. Include a clear call-to-action
5. Maintain a professional yet approachable tone
6. Personalize based on the provided context
7. Address the recipient by name when possible
8. Reference their company/role when relevant`;

  const userPrompt = `Create a personalized cold outreach message with the following information:
  
Recipient: ${sanitizedRecipientInfo.name}${sanitizedRecipientInfo.role ? ` (${sanitizedRecipientInfo.role})` : ''}${sanitizedRecipientInfo.company ? ` at ${sanitizedRecipientInfo.company}` : ''}${sanitizedRecipientInfo.industry ? ` in the ${sanitizedRecipientInfo.industry} industry` : ''}

Value Proposition: ${sanitizedValueProposition}

Additional Context:
${sanitizedContext ? JSON.stringify(sanitizedContext, null, 2) : "No additional context provided"}

Ensure the message is tailored to the recipient's role and company, highlighting how the value proposition addresses their specific needs or opportunities in the agricultural technology space.`;

  try {
    const request: AIRequest = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      maxTokens: 300,
      provider: 'deepseek' // Use DeepSeek for cost-effective message generation
    };

    const response = await aiComplete(request);
    
    // Sanitize the AI response before caching and returning
    const sanitizedResponse = sanitizeRichText(response.content);
    
    // Cache the result for 1 hour
    aiMessageCache.set(cacheKey, sanitizedResponse, 60 * 60 * 1000);
    
    return sanitizedResponse;
  } catch (error) {
    console.error('Error generating cold outreach message:', error);
    throw new Error('Failed to generate personalized message');
  }
}

/**
 * Generate follow-up message for existing prospects
 * @param previousMessage The original outreach message
 * @param recipientInfo Information about the recipient
 * @param daysSinceInitial Number of days since initial outreach
 * @returns Promise<string> The generated follow-up message
 */
export async function generateFollowUpMessage(
  previousMessage: string,
  recipientInfo: {
    name: string;
    role?: string;
    company?: string;
  },
  daysSinceInitial: number
): Promise<string> {
  // Sanitize inputs
  const sanitizedPreviousMessage = sanitizeRichText(previousMessage.substring(0, 1000)); // Limit length
  const sanitizedRecipientInfo = {
    name: sanitizeInput(recipientInfo.name),
    role: recipientInfo.role ? sanitizeInput(recipientInfo.role) : undefined,
    company: recipientInfo.company ? sanitizeInput(recipientInfo.company) : undefined,
  };
  const sanitizedDaysSinceInitial = Math.min(Math.max(daysSinceInitial, 0), 365); // Validate range
  
  // Create cache key based on input parameters
  const cacheKey = `follow_up:${sanitizedRecipientInfo.name}:${sanitizedRecipientInfo.role || ''}:${sanitizedRecipientInfo.company || ''}:${sanitizedDaysSinceInitial}:${sanitizedPreviousMessage.substring(0, 100)}`;
  
  // Check cache first
  const cachedResult = aiMessageCache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache hit for follow-up message generation');
    return cachedResult;
  }

  const systemPrompt = `You are an expert sales copywriter creating follow-up messages for agricultural technology solutions.
Your task is to create a concise, value-focused follow-up that references the previous conversation without being pushy.

Guidelines:
1. Keep messages under 100 words
2. Reference the previous message briefly
3. Add new value or insight
4. Include a clear, low-pressure call-to-action
5. Maintain professional tone`;

  const userPrompt = `Create a follow-up message for ${sanitizedRecipientInfo.name}${sanitizedRecipientInfo.role ? ` (${sanitizedRecipientInfo.role})` : ''}${sanitizedRecipientInfo.company ? ` at ${sanitizedRecipientInfo.company}` : ''}.

Previous message: ${sanitizedPreviousMessage}
Days since initial outreach: ${sanitizedDaysSinceInitial}

Create a brief, value-focused follow-up that maintains interest without being pushy.`;

  try {
    const request: AIRequest = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      maxTokens: 250,
      provider: 'deepseek'
    };

    const response = await aiComplete(request);
    
    // Sanitize the AI response before caching and returning
    const sanitizedResponse = sanitizeRichText(response.content);
    
    // Cache the result for 1 hour
    aiMessageCache.set(cacheKey, sanitizedResponse, 60 * 60 * 1000);
    
    return sanitizedResponse;
  } catch (error) {
    console.error('Error generating follow-up message:', error);
    throw new Error('Failed to generate follow-up message');
  }
}

/**
 * Generate message template for campaign use
 * @param campaignType Type of campaign (e.g., 'startup-partnership', 'university-collaboration')
 * @param tone Desired tone (e.g., 'formal', 'casual', 'technical')
 * @returns Promise<string> The generated message template
 */
export async function generateMessageTemplate(
  campaignType: string,
  tone: string
): Promise<string> {
  // Sanitize inputs
  const sanitizedCampaignType = sanitizeInput(campaignType);
  const sanitizedTone = sanitizeInput(tone);
  
  // Create cache key based on input parameters
  const cacheKey = `template:${sanitizedCampaignType}:${sanitizedTone}`;
  
  // Check cache first
  const cachedResult = aiMessageCache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache hit for message template generation');
    return cachedResult;
  }

  const systemPrompt = `You are an expert marketing copywriter specializing in agricultural technology.
Create message templates for cold outreach campaigns that can be personalized for individual recipients.

Guidelines:
1. Create a flexible template with placeholders for personalization
2. Maintain the specified tone
3. Include clear value proposition
4. Provide space for recipient-specific details
5. Keep templates concise but effective`;

  const userPrompt = `Create a message template for a ${sanitizedCampaignType} campaign with a ${sanitizedTone} tone.
Include appropriate placeholders for personalization (e.g., {{name}}, {{company}}, {{value_proposition}}).`;

  try {
    const request: AIRequest = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      maxTokens: 400,
      provider: 'deepseek'
    };

    const response = await aiComplete(request);
    
    // Sanitize the AI response before caching and returning
    const sanitizedResponse = sanitizeRichText(response.content);
    
    // Cache the result for 24 hours
    aiMessageCache.set(cacheKey, sanitizedResponse, 24 * 60 * 60 * 1000);
    
    return sanitizedResponse;
  } catch (error) {
    console.error('Error generating message template:', error);
    throw new Error('Failed to generate message template');
  }
}

// Export all functions as named exports instead of default export
// This fixes the ESLint warning: "Assign object to a variable before exporting as module default"
