export interface Company {
  id: string;
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

export interface UserSettingsData {
  id?: string;
  userId: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    role?: string;
    timezone: string;
    avatar?: string;
  };
  notifications?: {
    email: boolean;
    push: boolean;
    sound: boolean;
    pollInterval: number;
    ticketUpdates: boolean;
    workTracker: boolean;
    campaignUpdates: boolean;
    contactUpdates: boolean;
  };
  security?: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    passwordLastChanged?: string;
    apiKeys?: Array<{
      id: string;
      name: string;
      key: string;
      createdAt: string;
      lastUsed?: string;
    }>;
  };
  integrations?: {
    sendgrid: {
      apiKey?: string;
      verified: boolean;
      fromEmail?: string;
      fromName?: string;
    };
    googleSheets: {
      connected: boolean;
      spreadsheetId?: string;
      sheetName?: string;
    };
    notion: {
      connected: boolean;
      databaseId?: string;
    };
    linkedin: {
      connected: boolean;
      profileUrl?: string;
    };
  };
  coldOutreach?: {
    defaultCampaignSettings: {
      dailyLimit: number;
      followUpDelay: number;
      maxFollowUps: number;
    };
    emailTemplates: {
      defaultSubject: string;
      defaultSignature: string;
    };
    crmSync: {
      autoSync: boolean;
      syncInterval: number;
    };
  };
  system?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    dataRetention: number;
    exportFormat: 'csv' | 'json' | 'xlsx';
  };
  createdAt?: Date;
  updatedAt?: Date;
}
