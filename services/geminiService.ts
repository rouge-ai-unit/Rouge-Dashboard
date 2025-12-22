import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DesignPlan, ModelType } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      systemInstruction: "You are an expert UI/UX designer. Your goal is to plan a visual design. Always ensure the 'imageGenerationPrompt' is very detailed, specifying that it is a 'High fidelity UI design mockup', describing specific UI components, buttons, and spacing.",
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
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);
  
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&nologo=true`;
  
  return imageUrl;
};
