export interface DesignPlan {
  layoutStrategy: string;
  colorPalette: string;
  typographyStyle: string;
  imageGenerationPrompt: string;
}

export interface DesignState {
  status: 'idle' | 'planning' | 'generating' | 'completed' | 'error';
  plan: DesignPlan | null;
  imageUrl: string | null;
  error: string | null;
}

export enum ModelType {
  PLANNER = 'gemini-2.5-flash',
  PAINTER = 'gemini-2.5-flash-image'
}