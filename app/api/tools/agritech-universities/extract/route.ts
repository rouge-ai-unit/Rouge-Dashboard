import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import axios from "axios";
import { getDb } from "@/utils/dbConfig";
import { AgritechUniversitiesResults } from "@/utils/schema";

// Initialize DeepSeek client (compatible with OpenAI API)
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// Rate limiting (simple in-memory for demo; use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

const requestSchema = z.object({
  limit: z.number().int().min(1).max(100),
});

interface UniversityData {
  University: string;
  Country: string;
  Region: string;
  Website: string;
  "Has TTO?": string;
  "TTO Page URL": string;
  "Incubation Record": string;
  "Apollo/LinkedIn Search URL": string;
}

async function extractUniversityTables(url: string, country: string): Promise<any[]> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    const universities: any[] = [];

    $(".wikitable").each((index: number, table: any) => {
      const headers: string[] = [];
      $(table).find("th").each((index: number, th: any) => {
        headers.push($(th).text().trim());
      });

      $(table).find("tbody tr").each((index: number, row: any) => {
        const cells = $(row).find("td");
        if (cells.length === 0) return;

        const rowData: any = { Country: country };

        cells.each((index: number, cell: any) => {
          const header = headers[index] || `Column${index}`;
          const link = $(cell).find("a").attr("href");
          rowData[header] = link || $(cell).text().trim();
        });

        // Standardize university name
        const nameKeys = ["name", "university", "institution"];
        for (const key of nameKeys) {
          if (rowData[key]) {
            rowData.University = rowData[key];
            break;
          }
        }

        if (rowData.University) {
          universities.push(rowData);
        }
      });
    });

    return universities;
  } catch (error) {
    console.error("Error extracting university tables:", error);
    return [];
  }
}

async function checkAgricultureDepartment(universityName: string): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides accurate information about university departments.",
        },
        {
          role: "user",
          content: `Does ${universityName} have an agriculture department or related program? Answer with just 'Yes' or 'No'.`,
        },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const answer = response.choices[0]?.message?.content?.trim().toLowerCase();
    return answer === "yes";
  } catch (error) {
    console.error("Error checking agriculture department:", error);
    return false;
  }
}

async function checkTTO(universityName: string): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides accurate information about university offices.",
        },
        {
          role: "user",
          content: `Does ${universityName} have a Technology Transfer Office (TTO) or Knowledge Transfer Office (KTO) or a similar intellectual property commercialization office? Answer with just 'Yes' or 'No'.`,
        },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const answer = response.choices[0]?.message?.content?.trim().toLowerCase();
    return answer === "yes";
  } catch (error) {
    console.error("Error checking TTO:", error);
    return false;
  }
}

async function findTTOUrl(universityName: string, website: string): Promise<string> {
  if (!website || website === "N/A") return "N/A";

  try {
    const response = await axios.get(website, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Look for TTO-related links in navigation and content
    const ttoKeywords = [
      "technology transfer",
      "tech transfer",
      "tto",
      "knowledge transfer",
      "kto",
      "innovation",
      "commercialization",
      "intellectual property",
      "patent",
      "licensing"
    ];

    let foundUrl = "";

    // Search in links
    $("a").each((index: number, link: any) => {
      const href = $(link).attr("href");
      const text = $(link).text().toLowerCase();

      if (href && ttoKeywords.some(keyword => text.includes(keyword))) {
        foundUrl = href.startsWith("http") ? href : new URL(href, website).href;
        return false; // Break the loop
      }
    });

    // If not found in links, search in text content for mentions
    if (!foundUrl) {
      const bodyText = $("body").text().toLowerCase();
      if (ttoKeywords.some(keyword => bodyText.includes(keyword))) {
        foundUrl = `${website}/research/innovation`; // Fallback URL
      }
    }

    return foundUrl || "Not Found";
  } catch (error) {
    console.error("Error finding TTO URL:", error);
    return "Not Found";
  }
}

async function findIncubationRecord(universityName: string, website: string): Promise<string> {
  if (!website || website === "N/A") return "Not Found";

  try {
    const response = await axios.get(website, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Look for incubation-related content
    const incubationKeywords = [
      "incubator",
      "incubation",
      "startup",
      "entrepreneurship",
      "accelerator",
      "innovation hub",
      "business development",
      "spin-off",
      "spin out"
    ];

    let foundRecord = "";

    // Search in links and content
    $("a").each((index: number, link: any) => {
      const href = $(link).attr("href");
      const text = $(link).text().toLowerCase();

      if (href && incubationKeywords.some(keyword => text.includes(keyword))) {
        foundRecord = href.startsWith("http") ? href : new URL(href, website).href;
        return false; // Break the loop
      }
    });

    // If not found, check for general entrepreneurship or innovation centers
    if (!foundRecord) {
      const bodyText = $("body").text().toLowerCase();
      if (incubationKeywords.some(keyword => bodyText.includes(keyword))) {
        foundRecord = "Has incubation/entrepreneurship programs";
      }
    }

    return foundRecord || "Not Found";
  } catch (error) {
    console.error("Error finding incubation record:", error);
    return "Not Found";
  }
}

async function findLinkedInUrl(universityName: string): Promise<string> {
  // Simplified implementation
  return `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(universityName)}&entityType=school`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkRateLimit(session.user.email)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const { limit } = requestSchema.parse(body);

    // Extract universities from Wikipedia
    const wikipediaUrl = "https://en.wikipedia.org/wiki/List_of_universities_in_Thailand";
    const universities = await extractUniversityTables(wikipediaUrl, "Thailand");

    const results: UniversityData[] = [];
    let processed = 0;

    for (const uni of universities.slice(0, limit)) {
      if (!uni.University) continue;

      const hasAgriculture = await checkAgricultureDepartment(uni.University);
      if (!hasAgriculture) continue;

      const hasTTO = await checkTTO(uni.University);
      const ttoUrl = hasTTO ? await findTTOUrl(uni.University, uni.Website) : "N/A";
      const incubationRecord = await findIncubationRecord(uni.University, uni.Website);
      const linkedinUrl = await findLinkedInUrl(uni.University);

      results.push({
        University: uni.University,
        Country: uni.Country,
        Region: "Southeast Asia",
        Website: uni.Website || "N/A",
        "Has TTO?": hasTTO ? "Yes" : "No",
        "TTO Page URL": ttoUrl,
        "Incubation Record": incubationRecord,
        "Apollo/LinkedIn Search URL": linkedinUrl,
      });

      // Persist to database
      await getDb().insert(AgritechUniversitiesResults).values({
        university: uni.University,
        country: uni.Country,
        region: "Southeast Asia",
        website: uni.Website || null,
        hasTto: hasTTO,
        ttoPageUrl: ttoUrl !== "N/A" ? ttoUrl : null,
        incubationRecord: incubationRecord !== "Not Found" ? incubationRecord : null,
        linkedinSearchUrl: linkedinUrl,
        userId: session.user.email!, // Use email as unique identifier
      });

      processed++;
      if (processed >= limit) break;
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in agritech-universities extraction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
