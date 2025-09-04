import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { Worker } from 'bullmq';
import { QUEUE_NAMES, redisClient, AgritechExtractionJobData, AgritechExtractionJobResult } from '../lib/queues';
import { getDb } from '../utils/dbConfig';
import { AgritechUniversitiesResults } from '../utils/schema';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import axios from 'axios';

// Initialize DeepSeek client (OpenAI-compatible API)
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME,
};

// Worker instance
let worker: Worker | null = null;

try {
  worker = new Worker(
    QUEUE_NAMES.AGRITECH_EXTRACTION,
    async (job) => {
      const { userId, limit, session }: AgritechExtractionJobData = job.data;

      console.log(`Processing agritech extraction job ${job.id} for user ${userId}`);

  try {
        // Update progress
        await job.updateProgress(10);

      // Extract universities from Wikipedia
      const universities = await extractUniversityTables(
        "https://en.wikipedia.org/wiki/List_of_universities_in_Thailand",
        "Thailand"
      );

        // Check for cancel signal before heavy processing
        const cancelKey = `cancel:agritech:${job.id}`;
        try {
          const cancelled = await redisClient.get(cancelKey);
          if (cancelled) {
            console.log(`Job ${job.id} cancelled before processing started.`);
            await job.updateProgress(0);
            // Throw to mark as failed/cancelled (worker will log)
            throw new Error('Job cancelled by user');
          }
        } catch (e) {
          // ignore redis read errors
        }

      await job.updateProgress(30);

      const results: any[] = [];
      let processed = 0;

      for (const uni of universities.slice(0, limit)) {
        if (!uni.University) continue;

        console.log(`Checking university: ${uni.University}`);

        // Periodic cancel check
        try {
          const cancelled = await redisClient.get(cancelKey);
          if (cancelled) {
            console.log(`Job ${job.id} cancelled during processing.`);
            await job.updateProgress(0);
            throw new Error('Job cancelled by user');
          }
        } catch (e) {
          // ignore redis read errors and continue
        }

        // Check agriculture department
        const hasAgriculture = await checkAgricultureDepartment(uni.University);
        console.log(`${uni.University} has agriculture department: ${hasAgriculture}`);
        if (!hasAgriculture) continue;

        // check cancel again before heavier network calls
        try {
          const cancelled = await redisClient.get(cancelKey);
          if (cancelled) {
            console.log(`Job ${job.id} cancelled during processing.`);
            await job.updateProgress(0);
            throw new Error('Job cancelled by user');
          }
        } catch (e) {
          // ignore
        }
        // Check TTO
        const hasTTO = await checkTTO(uni.University);
        const ttoUrl = hasTTO ? await findTTOUrl(uni.University, uni.Website) : "N/A";
        const incubationRecord = await findIncubationRecord(uni.University, uni.Website);
        const linkedinUrl = await findLinkedInUrl(uni.University);

        const result = {
          University: uni.University,
          Country: uni.Country,
          Region: "Southeast Asia",
          Website: uni.Website || "N/A",
          "Has TTO?": hasTTO ? "Yes" : "No",
          "TTO Page URL": ttoUrl,
          "Incubation Record": incubationRecord,
          "Apollo/LinkedIn Search URL": linkedinUrl,
        };

        results.push(result);

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
          userId: userId,
        });

        processed++;

        // Update progress
        const progress = 30 + (processed / limit) * 60; // 30-90% range
        await job.updateProgress(Math.round(progress));

        if (processed >= limit) break;
      }


      await job.updateProgress(100);

      // Attempt to cleanup cancel flag if present
      try {
        await redisClient.del(`cancel:agritech:${job.id}`);
      } catch (e) {
        // ignore
      }

      // Cleanup cached payload for requeue
      try {
        await redisClient.del(`jobpayload:agritech:${job.id}`);
      } catch (e) {
        // ignore
      }

      const jobResult: AgritechExtractionJobResult = {
        success: true,
        results,
        processedCount: processed,
        totalCount: universities.length,
      };

      console.log(`Job ${job.id} completed successfully. Processed ${processed} universities.`);

      return JSON.stringify(jobResult);

    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);

      const jobResult: AgritechExtractionJobResult = {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        processedCount: 0,
        totalCount: 0,
      };

      // Attempt to cleanup cached payload when a job fails or is cancelled
      try {
        await redisClient.del(`jobpayload:agritech:${job.id}`);
      } catch (e) {
        // ignore
      }
      throw new Error(JSON.stringify(jobResult));
    }
  },
  {
    connection: redisConfig,
    concurrency: 2, // Process 2 jobs concurrently
    limiter: {
      max: 10, // Maximum 10 jobs per duration
      duration: 60000, // Per minute
    },
  }
  );
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Failed to create agritech worker:', errorMessage);
  if (errorMessage.includes('Redis version needs to be greater or equal than')) {
    console.error('Redis version is incompatible. Please upgrade Redis to version 5.0 or later.');
  }
  worker = null;
}

// Event handlers
if (worker) {
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    if (job) {
      console.error(`Job ${job.id} failed with error:`, err.message);
    } else {
      console.error('Job failed with error:', err.message);
    }
  });

  worker.on('progress', (job, progress) => {
    console.log(`Job ${job.id} progress: ${progress}%`);
  });
} else {
  console.warn('Agritech worker not started due to Redis incompatibility');
}

// Helper functions (same as in API route)
async function extractUniversityTables(url: string, country: string): Promise<any[]> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 30000, // 30 second timeout for scraping
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
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

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

    $("a").each((index: number, link: any) => {
      const href = $(link).attr("href");
      const text = $(link).text().toLowerCase();

      if (href && ttoKeywords.some(keyword => text.includes(keyword))) {
        foundUrl = href.startsWith("http") ? href : new URL(href, website).href;
        return false;
      }
    });

    if (!foundUrl) {
      const bodyText = $("body").text().toLowerCase();
      if (ttoKeywords.some(keyword => bodyText.includes(keyword))) {
        foundUrl = `${website}/research/innovation`;
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
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

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

    $("a").each((index: number, link: any) => {
      const href = $(link).attr("href");
      const text = $(link).text().toLowerCase();

      if (href && incubationKeywords.some(keyword => text.includes(keyword))) {
        foundRecord = href.startsWith("http") ? href : new URL(href, website).href;
        return false;
      }
    });

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
  return `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(universityName)}&entityType=school`;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  if (worker) {
    await worker.close();
  }
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  if (worker) {
    await worker.close();
  }
  await redisClient.quit();
  process.exit(0);
});

console.log('Agritech Universities Worker started and listening for jobs...');
