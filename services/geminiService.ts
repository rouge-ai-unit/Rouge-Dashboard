import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DesignPlan, ModelType } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

/**
 * Step 1: The Designer Agent (Planner)
 * Analyzes the request and creates a structured design plan and a prompting strategy.
 */
export const generateDesignPlan = async (userRequest: string): Promise<DesignPlan> => {
  const model = ModelType.PLANNER;
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      layoutStrategy: {
        type: Type.STRING,
        description: "Description of the layout structure (e.g., 'Grid based 12-column', 'Split screen hero').",
      },
      colorPalette: {
        type: Type.STRING,
        description: "The specific color codes and names chosen (e.g., 'Pastel Blue #AABBCC with Dark Navy text').",
      },
      typographyStyle: {
        type: Type.STRING,
        description: "Font choices and hierarchy description.",
      },
      imageGenerationPrompt: {
        type: Type.STRING,
        description: "A highly detailed, descriptive prompt optimized for an AI image generator to create a high-fidelity mockup of this design. Include details about UI elements, lighting, style (e.g. flat, glassmorphism), and layout.",
      },
    },
    required: ["layoutStrategy", "colorPalette", "typographyStyle", "imageGenerationPrompt"],
  };

  const response = await ai.models.generateContent({
    model: model,
    contents: `Act as a world-class UI/UX Art Director. Analyze the following request and create a design specification: "${userRequest}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      systemInstruction: "You are an expert UI/UX designer and AI art director. Your goal is to plan a visual design. For the 'imageGenerationPrompt', create an EXTREMELY detailed, professional description that will be used to generate a high-quality image. Include: (1) Specific visual style (modern, minimalist, luxury, playful, etc.), (2) Exact color descriptions and hex codes, (3) Detailed UI components layout and positioning, (4) Typography details, (5) Lighting and shadows, (6) Material textures (glass, metal, paper, plastic), (7) Camera angle and perspective, (8) Image quality descriptors (ultra high definition, 8K, cinematic, professional photography style), (9) Specific elements like buttons with exact styling, spacing measurements, and visual hierarchy. Make the prompt at least 150+ words and highly visual and specific.",
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No plan generated from the model.");
  }

  return JSON.parse(text) as DesignPlan;
};

/**
 * Step 2: The Painter Agent (Executor)
 * Takes the optimized prompt from the planner and generates the image using Pollinations API.
 */
export const generateVisualDesign = async (prompt: string): Promise<string> => {
  // Use Pollinations API for image generation (free, no quota limits)
  // Add quality parameters for better image generation
  const enhancedPrompt = `${prompt}. Professional quality, high definition, ultra detailed, sharp focus, cinematic lighting.`;
  const encodedPrompt = encodeURIComponent(enhancedPrompt);
  const seed = Math.floor(Math.random() * 1000000);
  
  // Parameters: model=flux for better quality, width/height for standard aspect ratio
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&nologo=true&model=flux&width=1024&height=768`;
  
  return imageUrl;
};
