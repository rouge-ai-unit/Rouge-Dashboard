"use client";

import { GoogleGenerativeAI } from "@google/generative-ai";
import {GoogleGenAI} from "@google/genai";
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


export async function analyzeCompany(company: Company) {
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

export async function generateContent(from:string, to:string, contentTitles = "") {
  const genAI = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI });
  //   Also exclude the following already added companies (if any given):
  //   ${companyList}

  const prompt = `
    Generate a list of linkedin content (preferably 6) for the topic of agtech with the theme including: AgTech, AgTech Invest, Startup in AgTech,Thailand AgTech.
    Generate for the date range from ${from} to ${to} (both inclusive).

    Also exclude the following already added content (General Themes) (if any given):
    ${contentTitles}
    
    The output MUST be a valid JSON array containing objects with the following keys:

    - dayOfMonth

    - weekOfMonth

    - date

    - specialOccasion (like Holidays, Festivals related to AgTech around the World based on the date, etc.)

    - generalTheme (or topic of the post)

    - postIdeas

    - caption (in the captions do not include hashtags, only the caption of the content)

    - hashtags (atlest 3 hashtags specific to the topic, having hash tags before the string and separated by commas and in string no array or json format strictly only string separated by comma)

    Ensure:

    The response is only valid JSON (no markdown, explanations, or comments).

    The JSON array does not contain trailing commas.

    No extra text before or after the JSON block.

    Example content:
    Day	Week	Date	Special Ocassion	General Theme	Post Ideas	Caption	3 Hashtags - Specific to Topic
    Day 1	Week 1	2024-12-09		Empowering AgTech in Southeast Asia: A Venture Capital Perspective	Overview of AgTech in Thailand: Share insights into Thailand's AgTech landscape, recent trends, and why it's a hotspot for VC investments.	Thailand's AgTech sector is blossoming! With its rich agricultural heritage and increasing adoption of technology, it's becoming a hub for innovation in Southeast Asia. Lets' dive into how venture capital is fueling this growth.	#AgTech #ThailandInnovation #Innovation #AI #Sustainability
    Day 2	Week 1	2024-12-10		Empowering AgTech in Southeast Asia: A Venture Capital Perspective	The Role of Venture Capital in Scaling AgTech Startups: Highlight how VC accelerators help startups in funding, mentorship, and market access.	From idea to impact, venture capital is the driving force behind many AgTech startups in Thailand. Discover how VC accelerators are shaping a more sustainable future.	#StartupEcosystem #VCAccelerator #AgTechInnovation #VentureCapital #AgTech #StartupScaling #InnovationEcosystem #Sustainability #TechForGood
    Day 3	Week 1	2024-12-11		Empowering AgTech in Southeast Asia: A Venture Capital Perspective	Challenges and Opportunities in AgTech: Discuss the hurdles AgTech startups face and how consulting can help navigate them.	AgTech startups face unique challenges, from scaling operations to navigating regulations. But every challenge is an opportunity for innovation.	#Consulting #AgTechGrowth #ThailandStartups #AgTechChallenges #ConsultingSolutions #VentureGrowth #AgriTechInnovation #SustainableFarming #TechForAgriculture
    Day 4	Week 1	2024-12-12	World Food Day	Feeding the World Through Innovation	Role of AgTech in addressing food security; Investments driving sustainable farming solutions; Examples of startups revolutionizing food systems.	On #WorldFoodDay, we celebrate the role of AgTech in addressing global hunger and sustainability. Innovations in agriculture are not just feeding the world—they’re building a better future. Let’s support the startups and investors making this happen.	#WorldFoodDay #Sustainability #AgTechImpact #FoodSecurity #InnovateAgriculture #VCImpact
    Day 5	Week 1	2024-12-13		Empowering AgTech in Southeast Asia: A Venture Capital Perspective	Success Stories from VC-Backed AgTech Startups in Thailand: Share a case study or highlight a notable startup backed by VC funding.	Success stories inspire progress. Today, we spotlight a Thai AgTech startup making waves in sustainable agriculture with the support of venture capital.	#SuccessStories #VentureCapital #AgTechInAction #AgTechStartups #VCImpact #InnovationInAgriculture #ThailandEcosystem #SustainableInnovation

    Return only the JSON array.
  `;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    // @ts-expect-error to be fixed
    let text = result.text.trim();

    // Remove potential markdown format (```json ... ```)
    text = text.replace(/```json\n?|```/g, "").trim();

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
    toast.error(
      "Failed to generate content data due to rate limit exceed. Please try again later after a minute!"
    );
    return [];
  }
}
