import { z } from "zod";
import { load } from "cheerio";
import { rateLimit } from "../rate-limit";

// Input validation schemas
export const EmailSchema = z.string().email("Invalid email format");
export const NameSchema = z.string().min(1, "Name is required").max(100, "Name is too long");
export const CompanySchema = z.string().max(100, "Company name is too long").optional().nullable();
export const RoleSchema = z.string().max(100, "Role is too long").optional().nullable();

export const ContactSchema = z.object({
  id: z.string().uuid().optional(),
  name: NameSchema,
  email: EmailSchema,
  role: RoleSchema,
  company: CompanySchema,
  campaignId: z.string().uuid().optional().nullable(),
});

export const RecipientSchema = z.object({
  email: EmailSchema,
  name: NameSchema.optional(),
  role: RoleSchema,
  company: CompanySchema,
});

export const SenderSchema = z.object({
  email: EmailSchema,
  name: NameSchema,
});

export const MessageTemplateSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject is too long"),
  body: z.string().min(1, "Message body is required").max(10000, "Message body is too long"),
});

export const CampaignSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Campaign name is required").max(100, "Campaign name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

// Simple input sanitization to prevent XSS attacks (basic implementation)
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function sanitizeRichText(input: string): string {
  if (typeof input !== 'string') return '';

  const allowedTags = new Set(['b','i','em','strong','a','p','br','ul','ol','li','span']);
  const dropWithContent = new Set(['script','style','iframe','object','embed']);
  const allowedAttributes: Record<string, Set<string>> = {
    a: new Set(['href'])
  };

  const $ = load(input);
  const root = $.root();

  root.find('*').each((_, element) => {
    const tagName = element.tagName?.toLowerCase() ?? '';

    if (!tagName) {
      return;
    }

    if (dropWithContent.has(tagName)) {
      $(element).remove();
      return;
    }

    if (!allowedTags.has(tagName)) {
      $(element).replaceWith($(element).contents());
      return;
    }

    const allowedForTag = allowedAttributes[tagName] ?? new Set<string>();

    Object.keys(element.attribs ?? {}).forEach((attr) => {
      const attrLower = attr.toLowerCase();

      if (!allowedForTag.has(attrLower)) {
        $(element).removeAttr(attr);
        return;
      }

      const value = ($(element).attr(attr) ?? '').trim();
      if (/^javascript:/i.test(value) || /^data:/i.test(value)) {
        $(element).removeAttr(attr);
      }
    });
  });

  const body = root.find('body');
  const sanitized = body.length > 0 ? body.html() : root.html();

  return sanitized?.trim() ?? '';
}
// Validate and sanitize CRM credentials
export const GoogleSheetsCredentialsSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client secret is required"),
  refreshToken: z.string().min(1, "Refresh token is required"),
  redirectUri: z.string().url("Invalid redirect URI").optional(),
});

export const NotionCredentialsSchema = z.object({
  token: z.string().min(1, "Token is required"),
  databaseId: z.string().min(1, "Database ID is required"),
});

// Rate limiting for API endpoints
export const coldOutreachRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequestsPerInterval: 10, // Limit to 10 requests per minute per user
});
// Validate email format
export function isValidEmail(email: string): boolean {
  try {
    EmailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

// Validate sender information
export function isValidSender(sender: any): boolean {
  try {
    SenderSchema.parse(sender);
    return true;
  } catch {
    return false;
  }
}

// Validate recipient information
export function isValidRecipient(recipient: any): boolean {
  try {
    RecipientSchema.parse(recipient);
    return true;
  } catch {
    return false;
  }
}

// Validate and sanitize contact data
export function validateAndSanitizeContact(contact: any): any {
  const parsed = ContactSchema.parse(contact);
  
  return {
    ...parsed,
    name: sanitizeInput(parsed.name),
    role: parsed.role ? sanitizeInput(parsed.role) : null,
    company: parsed.company ? sanitizeInput(parsed.company) : null,
  };
}

// Validate and sanitize campaign data
export function validateAndSanitizeCampaign(campaign: any): any {
  const parsed = CampaignSchema.parse(campaign);
  
  return {
    ...parsed,
    name: sanitizeInput(parsed.name),
    description: parsed.description ? sanitizeInput(parsed.description) : undefined,
  };
}

// Validate and sanitize message template
export function validateAndSanitizeMessageTemplate(template: any): any {
  const parsed = MessageTemplateSchema.parse(template);
  
  return {
    ...parsed,
    subject: sanitizeInput(parsed.subject),
    body: sanitizeRichText(parsed.body),
  };
}

// Sanitize CRM credentials (remove sensitive data from logs)
export function sanitizeCredentials(credentials: any): any {
  if (!credentials) return credentials;
  
  const sanitized: any = { ...credentials };
  
  // Remove sensitive fields
  delete sanitized.token;
  delete sanitized.clientSecret;
  delete sanitized.refreshToken;
  delete sanitized.password;
  delete sanitized.apiKey;
  
  return sanitized;
}
