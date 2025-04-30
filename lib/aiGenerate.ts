"use client";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "sonner";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI as string);

export async function generateCompanyData(companyList: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
  Generate a list of companies (preferably 8) that might use agriculture technology (agtech) in their operations, focusing on those that might be interested in purchasing agtech products. The companies should be from regions including but not limited to Europe, North America, Asia-Pacific, and Australia. 

  Also exclude the following already added companies (if any given):
  ${companyList}

  The output **MUST** be a valid JSON array containing objects with the following keys:
  - companyName
  - region
  - companyWebsite
  - companyLinkedin
  - industryFocus
  - offerings
  - marketingPosition
  - potentialPainPoints
  - contactName
  - contactPosition
  - linkedin
  - contactEmail

  Ensure:
  - The response is **only valid JSON** (no markdown, explanations, or comments).
  - The JSON array **does not contain trailing commas**.
  - No extra text before or after the JSON block.

  Return **only** the JSON array.
  `;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    console.log("Generated text (Raw AI response):", text);

    // Remove potential markdown format (```json ... ```)
    text = text.replace(/```json\n?|```/g, "").trim();

    console.log("Cleaned text (After removing markdown):", text);

    // Ensure the response is wrapped in a valid JSON array
    if (!text.startsWith("[") || !text.endsWith("]")) {
      console.error(
        "Invalid JSON format: Missing opening or closing brackets."
      );
      toast.error("Invalid AI response. Please retry.");
      return [];
    }

    try {
      // Fix common JSON format issues dynamically before parsing
      text = text.replace(/,\s*([\]}])/g, "$1"); // Remove trailing commas
      text = text.replace(/\t/g, " "); // Replace tabs with spaces

      const jsonData = JSON.parse(text);

      console.log("Parsed JSON:", jsonData);

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        throw new Error("Parsed JSON is not a valid non-empty array.");
      }

      return jsonData;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      toast.error("Error parsing JSON. AI output might be invalid.");
      return [];
    }
  } catch (error) {
    console.error("Error generating company data:", error);
    toast.error("Failed to generate company data. Please try again.");
    return [];
  }
}

interface Company {
  companyName: string;
  region: string;
  companyWebsite: string;
  companyLinkedin: string;
  industryFocus: string;
  offerings: string;
  marketingPosition: string;
  potentialPainPoints: string;
  contactName: string;
  contactPosition: string;
  linkedin: string;
  contactEmail: string;
}

export async function analyzeCompany(company : Company) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Analyze this AgTech company:
    
    - **Company Name:** ${company.companyName}
    - **Region:** ${company.region}
    - **Industry Focus:** ${company.industryFocus}
    - **Offerings:** ${company.offerings}
    - **Marketing Position:** ${company.marketingPosition}
    - **Potential Pain Points:** ${company.potentialPainPoints}
    - **Contact Name:** ${company.contactName}
    - **Contact Position:** ${company.contactPosition}
    - **Contact LinkedIn:** ${company.linkedin}
    - **Contact Email:** ${company.contactEmail}
    
    Provide a structured analysis covering:
    
    ### 1️⃣ Market Position & Competitive Analysis
    - How does the company compare to its competitors?
    - Key differentiators in the AgTech sector.

    ### 2️⃣ Growth Trajectory & Future Potential
    - Expected growth trends.
    - Potential expansion opportunities.

    ### 3️⃣ Technology Stack Assessment
    - Advantages and disadvantages of the current tech stack.
    - Suggestions for improvements.

    ### 4️⃣ Risk Factors & Mitigation Strategies
    - Possible challenges and how to overcome them.

    ### 5️⃣ Investment Potential
    - Is the company a good investment opportunity?

    ### 6️⃣ Strategic Recommendations
    - Key actions to improve performance.
    
    Format the response **cleanly** using markdown-like structure.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return { analysis: response.text() };
  } catch (error) {
    console.error("Error analyzing company:", error);
    throw new Error("Failed to analyze company. Please try again.");
  }
}
