export interface Company {
    id: number;
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
  revenue?: number;
  employeeCount?: number;
  yearFounded?: number;
  marketShare?: number;
  techStack?: string[];
}
