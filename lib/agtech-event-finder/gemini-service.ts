import { GoogleGenAI, Type } from "@google/genai";
import type { AgTechEvent } from "@/types/agtech-event-finder";

/**
 * Gemini Service for AgTech Event Finder
 * Handles AI-powered event discovery using Google's Gemini API
 */

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("GEMINI_API_KEY environment variable not set");
}

/**
 * Schema definition for AgTech event responses
 */
const eventSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      eventName: {
        type: Type.STRING,
        description: "The official name of the event.",
      },
      date: {
        type: Type.STRING,
        description: "The date or date range of the event (e.g., 'October 26-28, 2024').",
      },
      location: {
        type: Type.STRING,
        description: "The city and state/country of the event (e.g., 'San Francisco, CA').",
      },
      description: {
        type: Type.STRING,
        description: "A brief, one or two-sentence summary of the event's focus.",
      },
      price: {
        type: Type.STRING,
        description: "The cost to attend, or 'Free' if there is no cost. (e.g., 'Free', '$99', 'Varies').",
      },
      registrationLink: {
        type: Type.STRING,
        description: "The direct URL to the event's registration page.",
      },
    },
    required: ["eventName", "date", "location", "description", "price", "registrationLink"],
  },
};

/**
 * Find AgTech events near a specified location using Gemini AI
 * 
 * @param location - The location to search for events (city, state, or coordinates)
 * @returns Promise<AgTechEvent[]> - Array of found events
 * @throws Error if API key is missing or API call fails
 */
export async function findAgTechEvents(location: string): Promise<AgTechEvent[]> {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured. Please set it in your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const prompt = `
    Find UPCOMING AgTech (Agriculture Technology) startup conventions, expos, and networking events located in or near "${location}".
    
    IMPORTANT REQUIREMENTS:
    - Only include events from 2025 onwards (January 2025 and later)
    - Events must be upcoming or scheduled in the future
    - Do NOT include any events from 2024 or earlier
    - Focus on events relevant to venture capital, startup scouting, and technology innovation in agriculture
    - Prioritize free events when possible, but include notable paid events as well
    
    For each event, provide:
    - Event name
    - Date (must be 2025 or later)
    - Location (city and country/state)
    - Brief description (1-2 sentences)
    - Price (Free, $XX, or Varies)
    - Direct registration link
    
    Return a list of at least 5 upcoming events if available. If you cannot find events in the exact location, search in the surrounding region or state.
    Current date context: We are in October 2025, so all events should be from October 2025 onwards.
  `;

  try {
    console.log(`[AgTech Events] Searching for events near: ${location}`);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: eventSchema,
      },
    });
    
    const jsonText = response.text?.trim();
    if (!jsonText) {
      console.warn(`[AgTech Events] Empty response from Gemini API for location: ${location}`);
      return [];
    }
    
    const parsedData = JSON.parse(jsonText);
    console.log(`[AgTech Events] Found ${parsedData.length} events for location: ${location}`);
    
    return parsedData as AgTechEvent[];

  } catch (error) {
    console.error("[AgTech Events] Error fetching events from Gemini API:", error);
    
    if (error instanceof Error) {
      throw new Error(`Failed to fetch event data: ${error.message}`);
    }
    
    throw new Error("Failed to fetch event data from the AI model.");
  }
}
