import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FormData, Lead } from '@/types/ai-outreach-agent';
import { LeadType, validateLead, FormDataSchema } from '@/types/ai-outreach-agent';

interface OutreachServiceConfig {
  apiKey: string;
  maxRetries: number;
  retryDelay: number;
  modelName: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class OutreachService {
  private model: any;
  private config: OutreachServiceConfig;

  constructor(config: Partial<OutreachServiceConfig> = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.GEMINI_API_KEY!,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      modelName: config.modelName || "gemini-pro",
    };

    if (!this.config.apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = genAI.getGenerativeModel({
      model: this.config.modelName,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });
  }

  private validateFormData(formData: FormData): ValidationResult {
    const result = FormDataSchema.safeParse(formData);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => e.message),
    };
  }

  private validateLead(lead: any): lead is Lead {
    return validateLead(lead);
  }

  private parseResponse(text: string): Lead[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const data = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(data)) {
        throw new Error("AI response is not an array");
      }

      if (data.length === 0) {
        throw new Error("No leads generated");
      }

      if (data.length > 20) {
        throw new Error("Too many leads generated (max 20)");
      }

      // Validate and transform each lead
      const validLeads: Lead[] = [];
      for (const item of data) {
        if (this.validateLead(item)) {
          validLeads.push({
            name: item.name.trim(),
            type: item.type,
            relevance: item.relevance.trim(),
            outreach_suggestion: item.outreach_suggestion.trim(),
          });
        } else {
          console.warn("Invalid lead data:", item);
        }
      }

      if (validLeads.length === 0) {
        throw new Error("No valid leads found in response");
      }

      return validLeads;
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildPrompt(formData: FormData): string {
    const { companyDescription, targetAudiences } = formData;

    return `You are an expert business development consultant specializing in AI and tech startups with 15+ years of experience in partnership development and strategic outreach.

Your task is to analyze the following company profile and generate a targeted outreach list of potential strategic partners, investors, or clients.

**Company Profile:**
${companyDescription}

**Target Audiences:** ${targetAudiences.join(", ")}

**Requirements:**
- Generate 5-15 high-quality leads per target audience type
- Focus on relevant, realistic contacts/companies that would actually be interested
- Ensure diversity in the leads (different sizes, regions, focus areas)
- Provide specific, actionable outreach suggestions
- Leads should be current and active organizations

**For each lead, provide:**
1. **name**: Full name of company, fund, or individual (be specific and realistic - use real company names where possible)
2. **type**: Must be one of: ${targetAudiences.join(", ")}
3. **relevance**: 1-2 sentences explaining why this lead is a strategic fit for the company, focusing on specific synergies
4. **outreach_suggestion**: A personalized, professional opening message (2-3 sentences) that demonstrates knowledge of their work and proposes a specific value exchange

**Quality Guidelines:**
- Prioritize leads that have recently shown interest in similar technologies
- Include a mix of well-known and emerging players
- Ensure outreach suggestions are specific and reference actual aspects of the lead's business
- Avoid generic messages; make each suggestion tailored and compelling

**Response Format:**
Return ONLY a valid JSON array of objects with these exact properties: name, type, relevance, outreach_suggestion.

**Example Response:**
[
  {
    "name": "Andreessen Horowitz",
    "type": "VC",
    "relevance": "Andreessen Horowitz has invested in over 100 AI companies and actively supports enterprise AI solutions. Their portfolio includes companies working on similar agricultural technology challenges.",
    "outreach_suggestion": "Hi [Partner Name], I noticed Andreessen Horowitz's recent investment in AgriTech solutions like those from FarmLogs. Our AI-driven precision farming platform could complement your portfolio companies' needs for advanced crop analytics. I'd love to discuss potential synergies."
  }
]

Generate the outreach list now:`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateWithRetry(prompt: string, attempt: number = 1): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      if (!text?.trim()) {
        throw new Error("Empty response from AI");
      }

      return text;
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`AI generation attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await this.delay(delay);
        return this.generateWithRetry(prompt, attempt + 1);
      }
      throw error;
    }
  }

  async generateOutreachList(formData: FormData): Promise<Lead[]> {
    // Validate input
    const validation = this.validateFormData(formData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check cache first
    const cacheKey = this.getCacheKey(formData);
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildPrompt(formData);
      const responseText = await this.generateWithRetry(prompt);
      const leads = this.parseResponse(responseText);

      // Cache the result
      this.cacheResult(cacheKey, leads);

      // Sort leads by relevance (could be enhanced with scoring)
      return leads.sort((a, b) => a.type.localeCompare(b.type));
    } catch (error) {
      console.error('Error generating outreach list:', error);

      if (error instanceof Error) {
        // Re-throw with more context
        throw new Error(`Outreach list generation failed: ${error.message}`);
      }

      throw new Error('An unexpected error occurred while generating the outreach list');
    }
  }

  private getCacheKey(formData: FormData): string {
    // Create a deterministic key based on form data
    const keyData = {
      description: formData.companyDescription,
      audiences: formData.targetAudiences.sort(),
    };
    return btoa(JSON.stringify(keyData)).slice(0, 32); // Short hash-like key
  }

  private getCachedResult(key: string): Lead[] | null {
    if (typeof window === 'undefined') return null; // Server-side

    try {
      const cached = localStorage.getItem(`outreach_cache_${key}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // Cache for 24 hours
      if (age > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`outreach_cache_${key}`);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  private cacheResult(key: string, leads: Lead[]): void {
    if (typeof window === 'undefined') return; // Server-side

    try {
      const cacheData = {
        data: leads,
        timestamp: Date.now(),
      };
      localStorage.setItem(`outreach_cache_${key}`, JSON.stringify(cacheData));
    } catch {
      // Ignore cache write errors
    }
  }
}

// Export singleton instance for convenience
export const outreachService = new OutreachService();