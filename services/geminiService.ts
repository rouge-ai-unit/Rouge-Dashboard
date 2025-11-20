
import { GoogleGenAI, Type } from "@google/genai";
import { University } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const universitySchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: 'The full official name of the university.',
    },
    ktoTtoOffice: {
      type: Type.STRING,
      description: 'The name of the Knowledge Transfer Office (KTO) or Technology Transfer Office (TTO). If not available, state "Not Found".',
    },
    location: {
      type: Type.STRING,
      description: 'The city and country where the university is located.',
    },
    website: {
      type: Type.STRING,
      description: 'The official website URL of the university.',
    },
    incubationRecord: {
      type: Type.OBJECT,
      description: 'Details about the university\'s startup incubation programs.',
      properties: {
        count: {
          type: Type.INTEGER,
          description: 'The approximate number of startups incubated. Use 0 if unknown.',
        },
        focus: {
          type: Type.STRING,
          description: 'The primary focus areas of the incubation program (e.g., "Hardware", "Software", "Biotech"). If unknown, state "General".',
        },
      },
       required: ['count', 'focus'],
    },
  },
  required: ['name', 'ktoTtoOffice', 'location', 'website', 'incubationRecord'],
};


export const fetchUniversities = async (region: string): Promise<University[]> => {
  const prompt = `
    Generate a list of top agricultural universities (AgTech) in the specified region: "${region}".
    Prioritize Thailand first if the region is "South East Asia" or "SEA".
    For each university, provide the following details:
    1.  The official name of the university.
    2.  The name of their Knowledge Transfer Office (KTO) or Technology Transfer Office (TTO).
    3.  The geographical location (city, country).
    4.  The official website URL.
    5.  Information about their startup incubation record, including the number of startups and their focus (e.g., hardware, software, biotech).

    IMPORTANT: Do NOT include any personal information like names of people (PICs) or their contact details (emails, phone numbers). This information is private.
    Return the data as a JSON array of objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: universitySchema,
        },
        temperature: 0.2,
      },
    });

    const jsonString = response.text;
    if (!jsonString) {
        return [];
    }

    const parsedData = JSON.parse(jsonString);
    return parsedData as University[];
  } catch (error) {
    console.error("Error fetching data from Gemini API:", error);
    throw new Error("Failed to retrieve university data. Please check your API key and try again.");
  }
};
