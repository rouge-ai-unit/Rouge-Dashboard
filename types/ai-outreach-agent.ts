export enum LeadType {
  VC = 'VC',
  CorporateClient = 'Corporate Client',
  FarmerCooperative = 'Farmer Cooperative',
  AngelInvestor = 'Angel Investor',
  StrategicPartner = 'Strategic Partner',
}

export interface Lead {
  name: string;
  type: LeadType;
  relevance: string;
  outreach_suggestion: string;
}

export interface FormData {
  companyDescription: string;
  targetAudiences: LeadType[];
}