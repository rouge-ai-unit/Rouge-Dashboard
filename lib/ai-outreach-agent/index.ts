import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FormData, Lead } from '@/types/ai-outreach-agent';

const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({
  model: "gemini-pro",
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
  },
});

const parseResponse = (text: string): Lead[] => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    
    const data = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(data)) {
      throw new Error("Response is not an array");
    }
    
    // Validate and transform each item
    return data.map(item => {
      if (!item.name || !item.type || !item.relevance || !item.outreach_suggestion) {
        throw new Error("Invalid lead data structure");
      }
      
      return {
        name: String(item.name),
        type: item.type as Lead['type'],
        relevance: String(item.relevance),
        outreach_suggestion: String(item.outreach_suggestion)
      };
    });
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export async function generateOutreachList(formData: FormData): Promise<Lead[]> {
  const prompt = `Generate a list of potential leads for a company with the following description:
  "${formData.companyDescription}"
  
  Target audiences: ${formData.targetAudiences.join(", ")}
  
  For each lead, provide:
  1. Name (company, fund, or individual)
  2. Type (one of: ${formData.targetAudiences.join(", ")})
  3. Why they are relevant
  4. A personalized outreach suggestion
  
  Format your response as a JSON array of objects with properties: name, type, relevance, and outreach_suggestion.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseResponse(text);
  } catch (error) {
    console.error("Error generating leads:", error instanceof Error ? error.message : error);
    throw new Error("Failed to generate leads. Please try again.");
  }
}