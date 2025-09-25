/**
 * Message Personalization Engine
 *
 * Enterprise-grade engine for advanced message personalization
 * in cold outreach campaigns
 *
 * ## Features
 * - Advanced template engine with placeholder support
 * - Conditional content based on recipient data
 * - Batch personalization for multiple recipients
 * - Template validation and preview
 *
 * ## Security
 * - Input sanitization to prevent XSS
 * - Output sanitization for email content
 * - Placeholder validation
 * - Maximum replacement limits
 *
 * ## Performance
 * - Pattern compilation caching
 * - Efficient replacement algorithms
 * - Memory management for cache size
 * - Batch processing support
 */

import { templateCache } from '@/lib/cold-outreach/cache-utils';
import { sanitizeInput } from '@/lib/cold-outreach/security-utils';

export interface PersonalizationContext {
  recipient: {
    name: string;
    email: string;
    role?: string;
    company?: string;
    industry?: string;
    location?: string;
    customFields?: Record<string, any>;
  };
  sender: {
    name: string;
    email: string;
    company?: string;
    role?: string;
  };
  campaign?: {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  };
  context?: {
    topic?: string;
    valueProposition?: string;
    painPoints?: string[];
    solutions?: string[];
    urgency?: string;
    callToAction?: string;
  };
}

export interface PersonalizationOptions {
  preservePlaceholders?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  maxReplacements?: number;
}

// Memoization cache for compiled patterns
const patternCache = new Map<string, Array<{ pattern: RegExp; value: string }>>();

/**
 * Advanced message personalization engine
 * @param template Message template with placeholders
 * @param context Personalization context
 * @param options Personalization options
 * @returns string Personalized message
 */
export function personalizeMessage(
  template: string,
  context: PersonalizationContext,
  options: PersonalizationOptions = {}
): string {
  // Sanitize inputs
  const sanitizedTemplate = sanitizeInput(template);
  const sanitizedContext = {
    recipient: {
      name: sanitizeInput(context.recipient.name),
      email: sanitizeInput(context.recipient.email),
      role: context.recipient.role ? sanitizeInput(context.recipient.role) : undefined,
      company: context.recipient.company ? sanitizeInput(context.recipient.company) : undefined,
      industry: context.recipient.industry ? sanitizeInput(context.recipient.industry) : undefined,
      location: context.recipient.location ? sanitizeInput(context.recipient.location) : undefined,
      customFields: context.recipient.customFields ? JSON.parse(JSON.stringify(context.recipient.customFields)) : undefined
    },
    sender: {
      name: sanitizeInput(context.sender.name),
      email: sanitizeInput(context.sender.email),
      company: context.sender.company ? sanitizeInput(context.sender.company) : undefined,
      role: context.sender.role ? sanitizeInput(context.sender.role) : undefined
    },
    campaign: context.campaign ? {
      name: context.campaign.name ? sanitizeInput(context.campaign.name) : undefined,
      description: context.campaign.description ? sanitizeInput(context.campaign.description) : undefined,
      startDate: context.campaign.startDate ? sanitizeInput(context.campaign.startDate) : undefined,
      endDate: context.campaign.endDate ? sanitizeInput(context.campaign.endDate) : undefined
    } : undefined,
    context: context.context ? {
      topic: context.context.topic ? sanitizeInput(context.context.topic) : undefined,
      valueProposition: context.context.valueProposition ? sanitizeInput(context.context.valueProposition) : undefined,
      painPoints: context.context.painPoints ? context.context.painPoints.map(point => sanitizeInput(point)) : undefined,
      solutions: context.context.solutions ? context.context.solutions.map(solution => sanitizeInput(solution)) : undefined,
      urgency: context.context.urgency ? sanitizeInput(context.context.urgency) : undefined,
      callToAction: context.context.callToAction ? sanitizeInput(context.context.callToAction) : undefined
    } : undefined
  };
  
  const {
    preservePlaceholders = false,
    dateFormat = 'YYYY-MM-DD',
    maxReplacements = 1000
  } = options;
  
  let personalized = sanitizedTemplate;
  let replacementCount = 0;
  
  // Create cache key for patterns
  const cacheKey = `${sanitizedTemplate}:${dateFormat}`;
  let patterns = patternCache.get(cacheKey);
  
  // Compile patterns if not in cache
  if (!patterns) {
    // Define all possible replacement patterns
    patterns = [
      // Recipient patterns
      { pattern: /{{\s*recipient\.name\s*}}/gi, value: sanitizedContext.recipient.name },
      { pattern: /{{\s*recipient\.email\s*}}/gi, value: sanitizedContext.recipient.email },
      { pattern: /{{\s*recipient\.role\s*}}/gi, value: sanitizedContext.recipient.role || '' },
      { pattern: /{{\s*recipient\.company\s*}}/gi, value: sanitizedContext.recipient.company || '' },
      { pattern: /{{\s*recipient\.industry\s*}}/gi, value: sanitizedContext.recipient.industry || '' },
      { pattern: /{{\s*recipient\.location\s*}}/gi, value: sanitizedContext.recipient.location || '' },
      
      // Sender patterns
      { pattern: /{{\s*sender\.name\s*}}/gi, value: sanitizedContext.sender.name },
      { pattern: /{{\s*sender\.email\s*}}/gi, value: sanitizedContext.sender.email },
      { pattern: /{{\s*sender\.company\s*}}/gi, value: sanitizedContext.sender.company || '' },
      { pattern: /{{\s*sender\.role\s*}}/gi, value: sanitizedContext.sender.role || '' },
      
      // Campaign patterns
      { pattern: /{{\s*campaign\.name\s*}}/gi, value: sanitizedContext.campaign?.name || '' },
      { pattern: /{{\s*campaign\.description\s*}}/gi, value: sanitizedContext.campaign?.description || '' },
      
      // Context patterns
      { pattern: /{{\s*context\.topic\s*}}/gi, value: sanitizedContext.context?.topic || '' },
      { pattern: /{{\s*context\.valueProposition\s*}}/gi, value: sanitizedContext.context?.valueProposition || '' },
      { pattern: /{{\s*context\.callToAction\s*}}/gi, value: sanitizedContext.context?.callToAction || '' },
      
      // Date patterns
      { pattern: /{{\s*date\.today\s*}}/gi, value: formatDate(new Date(), dateFormat) },
      { pattern: /{{\s*date\.tomorrow\s*}}/gi, value: formatDate(new Date(Date.now() + 86400000), dateFormat) },
      
      // Conditional patterns (basic if/else)
      { pattern: /{{\s*#if\s+recipient\.role\s*}}(.*?){{\s*\/if\s*}}/gi, 
        value: sanitizedContext.recipient.role ? '$1' : '' },
      { pattern: /{{\s*#if\s+recipient\.company\s*}}(.*?){{\s*\/if\s*}}/gi, 
        value: sanitizedContext.recipient.company ? '$1' : '' },
    ];
    
    // Cache the compiled patterns
    patternCache.set(cacheKey, patterns);
    
    // Limit cache size to prevent memory issues
    if (patternCache.size > 100) {
      const firstKey = patternCache.keys().next().value;
      if (firstKey) {
        patternCache.delete(firstKey);
      }
    }
  } else {
    // Update pattern values with current context
    patterns = patterns.map(pattern => {
      // Recreate patterns with current context values
      if (pattern.pattern.toString().includes('recipient.name')) {
        return { ...pattern, value: sanitizedContext.recipient.name };
      } else if (pattern.pattern.toString().includes('recipient.email')) {
        return { ...pattern, value: sanitizedContext.recipient.email };
      } else if (pattern.pattern.toString().includes('recipient.role')) {
        return { ...pattern, value: sanitizedContext.recipient.role || '' };
      } else if (pattern.pattern.toString().includes('recipient.company')) {
        return { ...pattern, value: sanitizedContext.recipient.company || '' };
      } else if (pattern.pattern.toString().includes('recipient.industry')) {
        return { ...pattern, value: sanitizedContext.recipient.industry || '' };
      } else if (pattern.pattern.toString().includes('recipient.location')) {
        return { ...pattern, value: sanitizedContext.recipient.location || '' };
      } else if (pattern.pattern.toString().includes('sender.name')) {
        return { ...pattern, value: sanitizedContext.sender.name };
      } else if (pattern.pattern.toString().includes('sender.email')) {
        return { ...pattern, value: sanitizedContext.sender.email };
      } else if (pattern.pattern.toString().includes('sender.company')) {
        return { ...pattern, value: sanitizedContext.sender.company || '' };
      } else if (pattern.pattern.toString().includes('sender.role')) {
        return { ...pattern, value: sanitizedContext.sender.role || '' };
      } else if (pattern.pattern.toString().includes('campaign.name')) {
        return { ...pattern, value: sanitizedContext.campaign?.name || '' };
      } else if (pattern.pattern.toString().includes('campaign.description')) {
        return { ...pattern, value: sanitizedContext.campaign?.description || '' };
      } else if (pattern.pattern.toString().includes('context.topic')) {
        return { ...pattern, value: sanitizedContext.context?.topic || '' };
      } else if (pattern.pattern.toString().includes('context.valueProposition')) {
        return { ...pattern, value: sanitizedContext.context?.valueProposition || '' };
      } else if (pattern.pattern.toString().includes('context.callToAction')) {
        return { ...pattern, value: sanitizedContext.context?.callToAction || '' };
      } else if (pattern.pattern.toString().includes('date.today')) {
        return { ...pattern, value: formatDate(new Date(), dateFormat) };
      } else if (pattern.pattern.toString().includes('date.tomorrow')) {
        return { ...pattern, value: formatDate(new Date(Date.now() + 86400000), dateFormat) };
      } else if (pattern.pattern.toString().includes('#if recipient.role')) {
        return { ...pattern, value: sanitizedContext.recipient.role ? '$1' : '' };
      } else if (pattern.pattern.toString().includes('#if recipient.company')) {
        return { ...pattern, value: sanitizedContext.recipient.company ? '$1' : '' };
      }
      return pattern;
    });
  }
  
  // Add custom field patterns
  if (sanitizedContext.recipient.customFields) {
    Object.entries(sanitizedContext.recipient.customFields).forEach(([key, value]) => {
      patterns.push({
        pattern: new RegExp(`{{\\s*recipient\\.customFields\\.${key}\\s*}}`, 'gi'),
        value: typeof value === 'string' ? sanitizeInput(value) : JSON.stringify(value)
      });
    });
  }
  
  // Apply all replacements
  for (const { pattern, value } of patterns) {
    if (replacementCount >= maxReplacements) {
      console.warn(`Maximum replacements reached (${maxReplacements})`);
      break;
    }
    
    const matches = personalized.match(pattern);
    if (matches) {
      replacementCount += matches.length;
      personalized = personalized.replace(pattern, value as string);
    }
  }
  
  // Handle remaining placeholders
  if (!preservePlaceholders) {
    // Remove any remaining placeholders
    personalized = personalized.replace(/{{\s*[^}]+\s*}}/g, '');
  }
  
  return personalized.trim();
}

/**
 * Format date according to specified format
 * @param date Date to format
 * @param format Date format string
 * @returns string Formatted date
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * Batch personalize messages for multiple recipients
 * @param template Message template
 * @param recipients Array of recipients with context
 * @param baseContext Base context shared by all recipients
 * @returns Array of personalized messages
 */
export function batchPersonalize(
  template: string,
  recipients: PersonalizationContext['recipient'][],
  baseContext: Omit<PersonalizationContext, 'recipient'>
): string[] {
  // Sanitize inputs
  const sanitizedTemplate = sanitizeInput(template);
  const sanitizedRecipients = recipients.map(recipient => ({
    name: sanitizeInput(recipient.name),
    email: sanitizeInput(recipient.email),
    role: recipient.role ? sanitizeInput(recipient.role) : undefined,
    company: recipient.company ? sanitizeInput(recipient.company) : undefined,
    industry: recipient.industry ? sanitizeInput(recipient.industry) : undefined,
    location: recipient.location ? sanitizeInput(recipient.location) : undefined,
    customFields: recipient.customFields ? JSON.parse(JSON.stringify(recipient.customFields)) : undefined
  }));
  
  const sanitizedBaseContext = {
    sender: {
      name: sanitizeInput(baseContext.sender.name),
      email: sanitizeInput(baseContext.sender.email),
      company: baseContext.sender.company ? sanitizeInput(baseContext.sender.company) : undefined,
      role: baseContext.sender.role ? sanitizeInput(baseContext.sender.role) : undefined
    },
    campaign: baseContext.campaign ? {
      name: baseContext.campaign.name ? sanitizeInput(baseContext.campaign.name) : undefined,
      description: baseContext.campaign.description ? sanitizeInput(baseContext.campaign.description) : undefined,
      startDate: baseContext.campaign.startDate ? sanitizeInput(baseContext.campaign.startDate) : undefined,
      endDate: baseContext.campaign.endDate ? sanitizeInput(baseContext.campaign.endDate) : undefined
    } : undefined,
    context: baseContext.context ? {
      topic: baseContext.context.topic ? sanitizeInput(baseContext.context.topic) : undefined,
      valueProposition: baseContext.context.valueProposition ? sanitizeInput(baseContext.context.valueProposition) : undefined,
      painPoints: baseContext.context.painPoints ? baseContext.context.painPoints.map(point => sanitizeInput(point)) : undefined,
      solutions: baseContext.context.solutions ? baseContext.context.solutions.map(solution => sanitizeInput(solution)) : undefined,
      urgency: baseContext.context.urgency ? sanitizeInput(baseContext.context.urgency) : undefined,
      callToAction: baseContext.context.callToAction ? sanitizeInput(baseContext.context.callToAction) : undefined
    } : undefined
  };
  
  return sanitizedRecipients.map(recipient => {
    const context: PersonalizationContext = {
      recipient,
      ...sanitizedBaseContext
    };
    return personalizeMessage(sanitizedTemplate, context);
  });
}

/**
 * Validate personalization template for required placeholders
 * @param template Message template
 * @param requiredPlaceholders Array of required placeholder names
 * @returns boolean True if all required placeholders are present
 */
export function validateTemplate(
  template: string,
  requiredPlaceholders: string[]
): boolean {
  // Sanitize inputs
  const sanitizedTemplate = sanitizeInput(template);
  const sanitizedRequiredPlaceholders = requiredPlaceholders.map(placeholder => sanitizeInput(placeholder));
  
  return sanitizedRequiredPlaceholders.every(placeholder => {
    const pattern = new RegExp(`{{\\s*${placeholder.replace('.', '\\.')}\\s*}}`, 'i');
    return pattern.test(sanitizedTemplate);
  });
}

/**
 * Extract all placeholders from template
 * @param template Message template
 * @returns string[] Array of placeholder names
 */
export function extractPlaceholders(template: string): string[] {
  // Sanitize input
  const sanitizedTemplate = sanitizeInput(template);
  
  const placeholderRegex = /{{\s*([^}]+)\s*}}/g;
  const matches = sanitizedTemplate.match(placeholderRegex);
  
  if (!matches) {
    return [];
  }
  
  return matches.map(match => {
    // Remove {{ and }} and trim whitespace
    return match.replace(/{{\s*|\s*}}/g, '').trim();
  });
}

/**
 * Generate preview of personalized message
 * @param template Message template
 * @param sampleContext Sample context for preview
 * @returns string Preview message
 */
export function generatePreview(
  template: string,
  sampleContext: PersonalizationContext
): string {
  // Sanitize inputs
  const sanitizedTemplate = sanitizeInput(template);
  const sanitizedSampleContext = {
    recipient: {
      name: sanitizeInput(sampleContext.recipient.name),
      email: sanitizeInput(sampleContext.recipient.email),
      role: sampleContext.recipient.role ? sanitizeInput(sampleContext.recipient.role) : undefined,
      company: sampleContext.recipient.company ? sanitizeInput(sampleContext.recipient.company) : undefined,
      industry: sampleContext.recipient.industry ? sanitizeInput(sampleContext.recipient.industry) : undefined,
      location: sampleContext.recipient.location ? sanitizeInput(sampleContext.recipient.location) : undefined,
      customFields: sampleContext.recipient.customFields ? JSON.parse(JSON.stringify(sampleContext.recipient.customFields)) : undefined
    },
    sender: {
      name: sanitizeInput(sampleContext.sender.name),
      email: sanitizeInput(sampleContext.sender.email),
      company: sampleContext.sender.company ? sanitizeInput(sampleContext.sender.company) : undefined,
      role: sampleContext.sender.role ? sanitizeInput(sampleContext.sender.role) : undefined
    },
    campaign: sampleContext.campaign ? {
      name: sampleContext.campaign.name ? sanitizeInput(sampleContext.campaign.name) : undefined,
      description: sampleContext.campaign.description ? sanitizeInput(sampleContext.campaign.description) : undefined,
      startDate: sampleContext.campaign.startDate ? sanitizeInput(sampleContext.campaign.startDate) : undefined,
      endDate: sampleContext.campaign.endDate ? sanitizeInput(sampleContext.campaign.endDate) : undefined
    } : undefined,
    context: sampleContext.context ? {
      topic: sampleContext.context.topic ? sanitizeInput(sampleContext.context.topic) : undefined,
      valueProposition: sampleContext.context.valueProposition ? sanitizeInput(sampleContext.context.valueProposition) : undefined,
      painPoints: sampleContext.context.painPoints ? sampleContext.context.painPoints.map(point => sanitizeInput(point)) : undefined,
      solutions: sampleContext.context.solutions ? sampleContext.context.solutions.map(solution => sanitizeInput(solution)) : undefined,
      urgency: sampleContext.context.urgency ? sanitizeInput(sampleContext.context.urgency) : undefined,
      callToAction: sampleContext.context.callToAction ? sanitizeInput(sampleContext.context.callToAction) : undefined
    } : undefined
  };
  
  // Create a copy of the template for preview
  let preview = sanitizedTemplate;
  
  // Add sample data markers for unfilled placeholders
  const placeholders = extractPlaceholders(sanitizedTemplate);
  const filledPlaceholders = new Set<string>();
  
  // Track which placeholders are filled in the sample context
  Object.keys(sanitizedSampleContext).forEach(key => {
    if (key === 'recipient' || key === 'sender' || key === 'campaign' || key === 'context') {
      const obj = sanitizedSampleContext[key as keyof PersonalizationContext];
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(subKey => {
          filledPlaceholders.add(`${key}.${subKey}`);
        });
      }
    }
  });
  
  // Personalize with sample context
  preview = personalizeMessage(sanitizedTemplate, sanitizedSampleContext, { preservePlaceholders: true });
  
  // Highlight unfilled placeholders
  preview = preview.replace(/{{\s*([^}]+)\s*}}/g, (match, placeholder) => {
    if (filledPlaceholders.has(placeholder.trim())) {
      return match; // Already filled, keep as is
    }
    return `[${placeholder.trim()}]`; // Highlight unfilled placeholders
  });
  
  return preview;
}

// Export all functions as named exports instead of default export
// This fixes the ESLint warning: "Assign object to a variable before exporting as module default"
