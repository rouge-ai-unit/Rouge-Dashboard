import { z } from 'zod';

// Enums for type safety
export enum LeadType {
  VC = 'VC',
  CorporateClient = 'Corporate Client',
  FarmerCooperative = 'Farmer Cooperative',
  AngelInvestor = 'Angel Investor',
  StrategicPartner = 'Strategic Partner',
}

// Zod schemas for runtime validation
export const LeadTypeSchema = z.nativeEnum(LeadType);

export const LeadSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Lead name is required').max(200, 'Lead name too long'),
  type: LeadTypeSchema,
  relevance: z.string().min(10, 'Relevance explanation too short').max(500, 'Relevance explanation too long'),
  outreach_suggestion: z.string().min(20, 'Outreach suggestion too short').max(1000, 'Outreach suggestion too long'),
});

export const FormDataSchema = z.object({
  companyDescription: z.string()
    .min(50, 'Company description must be at least 50 characters')
    .max(2000, 'Company description too long'),
  targetAudiences: z.array(LeadTypeSchema)
    .min(1, 'At least one target audience required')
    .max(5, 'Too many target audiences selected'),
});

// TypeScript types inferred from schemas
export type Lead = z.infer<typeof LeadSchema>;
export type FormData = z.infer<typeof FormDataSchema>;
export type LeadTypeValue = z.infer<typeof LeadTypeSchema>;

// Additional types for UI state
export interface OutreachGenerationState {
  isLoading: boolean;
  error: string | null;
  leads: Lead[];
  lastGeneratedAt?: Date;
}

export interface OutreachFilters {
  types: LeadType[];
  searchQuery: string;
}

// Constants
export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  [LeadType.VC]: 'Venture Capital',
  [LeadType.CorporateClient]: 'Corporate Client',
  [LeadType.FarmerCooperative]: 'Farmer Cooperative',
  [LeadType.AngelInvestor]: 'Angel Investor',
  [LeadType.StrategicPartner]: 'Strategic Partner',
};

export const LEAD_TYPE_DESCRIPTIONS: Record<LeadType, string> = {
  [LeadType.VC]: 'Venture capital firms and investment funds',
  [LeadType.CorporateClient]: 'Large corporations seeking partnerships',
  [LeadType.FarmerCooperative]: 'Agricultural cooperatives and farmer groups',
  [LeadType.AngelInvestor]: 'Individual angel investors',
  [LeadType.StrategicPartner]: 'Companies for strategic alliances',
};

// Validation helpers
export const validateLead = (data: unknown): data is Lead => {
  return LeadSchema.safeParse(data).success;
};

export const validateFormData = (data: unknown): data is FormData => {
  return FormDataSchema.safeParse(data).success;
};