import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FormData, Lead } from '@/types/ai-outreach-agent';

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
  model: "gemini-pro",
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
  },
});

export const generateOutreachList = async (formData: FormData): Promise<Lead[]> => {
  const { companyDescription, targetAudiences } = formData;

  const targetAudienceString = targetAudiences.join(', ');

  const prompt = `
    Analyze the following company profile and generate a targeted outreach list.
    
    Company Profile:
    ${companyDescription}
    
    Target Audiences: ${targetAudienceString}
    
    For each target audience member, provide:
    1. Their full name (company, fund, or individual)
    2. Their type (matching the provided target audiences)
    3. A one-sentence explanation of why they're a strategic fit
    4. A personalized opening line for outreach
    
    Format the response as a JSON array of objects with properties:
    - name (string)
    - type (one of the target audiences)
    - relevance (string)
    - outreach_suggestion (string)
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response as JSON");
    }
    
    const leads = JSON.parse(jsonMatch[0]);
    return leads;
  } catch (error) {
    console.error('Error generating outreach list:', error);
    throw new Error('Failed to generate outreach list. Please try again.');
  }
};