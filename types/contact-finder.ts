// ============================================================================
// CONTACT FINDER — TYPE DEFINITIONS
// Shared types for the two Hunter.io-backed lookup modes.
// ============================================================================

export interface HunterVerification {
  status: string | null;
  score: number | null;
}

export interface HunterSourceRef {
  uri?: string;
  domain?: string;
}

// --- Search by Name → Hunter Email Finder -----------------------------------

export interface EmailFinderRequest {
  fullName: string;
  company: string;
}

export interface EmailFinderResponse {
  success: boolean;
  message?: string;
  email?: string | null;
  score?: number | null;
  position?: string | null;
  company?: string | null;
  domain?: string | null;
  sources?: HunterSourceRef[];
  verification?: HunterVerification | null;
}

// --- Search by Job Title → Hunter Domain Search (client-side filtered) ------

export interface DomainSearchRequest {
  jobTitle: string;
  company: string;
  showAll?: boolean;
}

export interface DomainContact {
  name: string | null;
  position: string | null;
  email: string | null;
  confidence: number | null;
  department: string | null;
  seniority: string | null;
  verification: HunterVerification | null;
}

export interface DomainSearchResponse {
  success: boolean;
  message?: string;
  company?: string;
  domain?: string | null;
  jobTitle?: string;
  matchedCount?: number;
  totalCount?: number;
  showingAll?: boolean;
  contacts?: DomainContact[];
}
