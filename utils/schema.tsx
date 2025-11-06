import { boolean, date, decimal, integer, jsonb, pgTable, text, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { z } from "zod";

export const Companies = pgTable("companyDetails", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyName: varchar("name").notNull(),
  companyWebsite: varchar("companyWebsite"),
  companyLinkedin: varchar("companyLinkedin"),
  region: varchar("region").notNull(),
  industryFocus: varchar("industryFocus").notNull(),
  offerings: varchar("offerings").notNull(),
  marketingPosition: varchar("marketingPosition").notNull(),
  potentialPainPoints: varchar("potentialPainPoints").notNull(),
  contactName: varchar("contactName").notNull(),
  contactPosition: varchar("contactPosition").notNull(),
  linkedin: varchar("linkedin"),
  contactEmail: varchar("contactEmail").notNull(),
  isMailed: boolean("isMailed").default(false),
  addedToMailList: boolean("addedToMailList").default(false),
});

export const LinkedinContent = pgTable("linkedinContent", {
  id: uuid("id").primaryKey().defaultRandom(),
  dayOfMonth: integer("day_of_month").notNull(),
  weekOfMonth: integer("week_of_month").notNull(),
  date: date("date").notNull(),
  specialOccasion: varchar("special_occasion"),
  generalTheme: varchar("general_theme").notNull(),
  postIdeas: varchar("post_ideas").notNull(),
  caption: varchar("caption").notNull(),
  hashtags: varchar("hashtags").notNull(),
  status: varchar("status").default("Draft"),
});

export const WorkTracker = pgTable("workTracker", {
  _id: uuid("id").defaultRandom().primaryKey(),
  task: varchar("task"),
  unit: varchar("unit"),
  status: varchar("status"),
  deadline: varchar("deadline"),
  assignedTo: varchar("assignedTo"),
  lastUpdated: varchar("lastUpdated"),
  workStart: varchar("workStart"),
  memberUpdate: varchar("memberUpdate"),
});

// Dashboard Tools for UI cards and progress
export const Tools = pgTable("tools", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  href: varchar("href").notNull(),
  description: varchar("description").notNull(),
  unit: varchar("unit"),
  status: varchar("status").notNull(),
  progress: integer("progress").default(0),
  criticality: varchar("criticality").default("Medium"),
  views: integer("views").default(0), // Usage count
});

// Tool Requests (Tickets)
export const Tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title").notNull(),
  description: varchar("description").notNull(),
  requestedBy: varchar("requestedBy").notNull(),
  status: varchar("status").notNull(),
  team: varchar("team"),
  department: varchar("department"),
  // Structured request criteria (optional)
  problemStatement: varchar("problemStatement"),
  expectedOutcome: varchar("expectedOutcome"),
  dataSources: varchar("dataSources"),
  constraints: varchar("constraints"),
  manualSteps: varchar("manualSteps"),
  agentBreakdown: varchar("agentBreakdown"),
  dueDate: varchar("dueDate"),
  impact: varchar("impact"),
  businessGoal: varchar("businessGoal"),
  businessSteps: varchar("businessSteps"),
});

// Agritech Universities Results
export const AgritechUniversitiesResults = pgTable("agritech_universities_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  university: varchar("university").notNull(),
  country: varchar("country").notNull(),
  region: varchar("region").notNull(),
  website: varchar("website"),
  hasTto: boolean("has_tto").default(false),
  ttoPageUrl: varchar("tto_page_url"),
  incubationRecord: varchar("incubation_record"),
  linkedinSearchUrl: varchar("linkedin_search_url"),
  createdAt: date("created_at").defaultNow(),
  userId: varchar("user_id").notNull(), // Use email as unique identifier
});

// Agritech Startups Results
export const AgritechStartups = pgTable("agritech_startups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  city: varchar("city"),
  website: varchar("website").notNull(),
  description: text("description").notNull(),
  locationScore: integer("location_score").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  feasibilityScore: integer("feasibility_score").notNull(),
  rogueScore: integer("rogue_score").notNull(),
  justification: text("justification").notNull(),
  isPriority: boolean("is_priority").default(false),
  contactInfo: jsonb("contact_info"),
  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// Startup Generation Jobs
export const StartupGenerationJobs = pgTable("startup_generation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull(),
  numStartups: integer("num_startups").notNull(),
  status: varchar("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  progress: integer("progress").default(0),
  result: jsonb("result"),
  error: text("error"),
  createdAt: date("created_at").defaultNow(),
  completedAt: date("completed_at"),
});

// Contact Research Jobs
export const ContactResearchJobs = pgTable("contact_research_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull(),
  startupId: varchar("startup_id").notNull(),
  startupName: varchar("startup_name").notNull(),
  website: varchar("website").notNull(),
  status: varchar("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  result: jsonb("result"),
  error: text("error"),
  createdAt: date("created_at").defaultNow(),
  completedAt: date("completed_at"),
});

// Cold Outreach Contacts - Enhanced
export const Contacts = pgTable("cold_outreach_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  role: varchar("role"),
  company: varchar("company"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  linkedinUrl: varchar("linkedin_url"),
  website: varchar("website"),
  location: varchar("location"),
  notes: text("notes"),

  // Enhanced fields for enterprise features
  phone: varchar("phone"),
  industry: varchar("industry"),
  companySize: varchar("company_size"),
  revenue: varchar("revenue"),
  linkedinProfile: jsonb("linkedin_profile"), // Store LinkedIn profile data
  emailVerified: boolean("email_verified").default(false),
  emailValid: boolean("email_valid").default(true),

  // Engagement tracking
  totalEmailsSent: integer("total_emails_sent").default(0),
  totalOpens: integer("total_opens").default(0),
  totalClicks: integer("total_clicks").default(0),
  totalReplies: integer("total_replies").default(0),
  lastContactedAt: date("last_contacted_at"),
  lastRepliedAt: date("last_replied_at"),
  lastOpenedAt: date("last_opened_at"),

  // Scoring and prioritization
  engagementScore: integer("engagement_score").default(0), // 0-100
  priorityScore: integer("priority_score").default(50), // 0-100
  leadScore: integer("lead_score").default(0), // 0-100

  // Segmentation
  segments: jsonb("segments").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),

  // Status and lifecycle
  status: varchar("status").default("active"), // active, inactive, bounced, unsubscribed
  lifecycleStage: varchar("lifecycle_stage").default("prospect"), // prospect, lead, customer, lost

  // Source tracking
  source: varchar("source"), // csv_import, manual, linkedin, website_scrape
  sourceDetails: jsonb("source_details"),

  // Custom fields
  customFields: jsonb("custom_fields").$type<Record<string, any>>().default({}),

  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// Cold Outreach Campaigns - Enhanced
export const Campaigns = pgTable("cold_outreach_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),

  // Status and lifecycle
  status: varchar("status").notNull().default("draft"), // draft, active, paused, completed, archived
  priority: varchar("priority").default("medium"), // low, medium, high, urgent

  // Scheduling
  startDate: date("start_date"),
  endDate: date("end_date"),
  timezone: varchar("timezone").default("UTC"),
  scheduleType: varchar("schedule_type").default("immediate"), // immediate, scheduled, drip

  // Targeting and segmentation
  targetSegments: jsonb("target_segments").$type<string[]>().default([]),
  targetContacts: jsonb("target_contacts").$type<string[]>().default([]), // Contact IDs
  exclusionRules: jsonb("exclusion_rules").$type<any>().default({}),

  // Email settings
  fromEmail: varchar("from_email"),
  fromName: varchar("from_name"),
  replyToEmail: varchar("reply_to_email"),
  dailyLimit: integer("daily_limit").default(50),
  totalLimit: integer("total_limit"),

  // Templates and content
  primaryTemplateId: uuid("primary_template_id"),
  followUpTemplates: jsonb("follow_up_templates").$type<Array<{
    templateId: string;
    delay: number; // in days
    condition?: string;
  }>>().default([]),

  // A/B Testing
  abTestingEnabled: boolean("ab_testing_enabled").default(false),
  abTestConfig: jsonb("ab_test_config").$type<{
    subjectLines: string[];
    templates: string[];
    sendTimes: string[];
    sampleSize: number;
  }>(),

  // Sequences and automation
  sequenceEnabled: boolean("sequence_enabled").default(false),
  sequenceSteps: jsonb("sequence_steps").$type<Array<{
    id: string;
    name: string;
    templateId: string;
    delay: number; // in days
    condition?: string;
    maxRetries: number;
  }>>().default([]),

  // Performance metrics
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  openedCount: integer("opened_count").default(0),
  clickedCount: integer("clicked_count").default(0),
  repliedCount: integer("replied_count").default(0),
  bouncedCount: integer("bounced_count").default(0),
  unsubscribedCount: integer("unsubscribed_count").default(0),
  complainedCount: integer("complained_count").default(0),

  // Calculated metrics
  openRate: integer("open_rate").default(0), // percentage * 100
  clickRate: integer("click_rate").default(0),
  replyRate: integer("reply_rate").default(0),
  bounceRate: integer("bounce_rate").default(0),
  unsubscribeRate: integer("unsubscribe_rate").default(0),

  // Goals and tracking
  goals: jsonb("goals").$type<{
    targetOpenRate?: number;
    targetClickRate?: number;
    targetReplyRate?: number;
    targetConversions?: number;
  }>().default({}),

  // Integration settings
  crmSyncEnabled: boolean("crm_sync_enabled").default(false),
  crmSystem: varchar("crm_system"), // hubspot, salesforce, pipedrive, etc.
  crmConfig: jsonb("crm_config").$type<any>().default({}),

  // Advanced settings
  trackingEnabled: boolean("tracking_enabled").default(true),
  unsubscribeLink: boolean("unsubscribe_link").default(true),
  customTrackingDomain: varchar("custom_tracking_domain"),

  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// Cold Outreach Messages - Enhanced
export const Messages = pgTable("cold_outreach_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => Campaigns.id),
  contactId: uuid("contact_id").notNull().references(() => Contacts.id),

  // Content
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  templateId: uuid("template_id"),
  templateVersion: integer("template_version"),

  // Status and lifecycle
  status: varchar("status").notNull().default("pending"), // pending, queued, processing, sent, delivered, opened, clicked, replied, failed, bounced, unsubscribed, complained
  priority: varchar("priority").default("normal"), // low, normal, high, urgent

  // Scheduling
  scheduledAt: date("scheduled_at"),
  sentAt: date("sent_at"),
  deliveredAt: date("delivered_at"),
  openedAt: date("opened_at"),
  clickedAt: date("clicked_at"),
  repliedAt: date("replied_at"),
  bouncedAt: date("bounced_at"),

  // Email provider data
  messageId: varchar("message_id"), // Provider's message ID
  provider: varchar("provider").default("sendgrid"), // sendgrid, mailgun, etc.
  providerData: jsonb("provider_data").$type<any>().default({}),

  // Tracking and analytics
  trackingPixelUrl: varchar("tracking_pixel_url"),
  unsubscribeUrl: varchar("unsubscribe_url"),
  clickTrackingUrls: jsonb("click_tracking_urls").$type<Record<string, string>>().default({}),

  // Engagement data
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  uniqueOpens: integer("unique_opens").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  deviceInfo: jsonb("device_info").$type<{
    type?: string;
    os?: string;
    browser?: string;
    location?: string;
  }>(),

  // Sequence and follow-up
  sequenceStep: integer("sequence_step").default(1),
  isFollowUp: boolean("is_follow_up").default(false),
  parentMessageId: uuid("parent_message_id"),
  followUpDelay: integer("follow_up_delay"), // in days

  // A/B Testing
  abTestVariant: varchar("ab_test_variant"), // A, B, C, etc.
  abTestGroup: varchar("ab_test_group"),

  // Error handling
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  errorMessage: text("error_message"),
  errorCode: varchar("error_code"),

  // Compliance and legal
  gdprConsent: boolean("gdpr_consent").default(false),
  canSpamCompliant: boolean("can_spam_compliant").default(true),
  unsubscribeToken: varchar("unsubscribe_token"),

  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// Contact Segments - Enhanced
export const Segments = pgTable("contact_segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),

  // Segmentation criteria
  filters: jsonb("filters").$type<{
    tags?: string[];
    industries?: string[];
    companySize?: { min?: number; max?: number };
    jobTitles?: string[];
    locations?: string[];
    engagementScore?: { min?: number; max?: number };
    lastContacted?: { days?: number };
    customFields?: Record<string, any>;
  }>().default({}),

  // Dynamic vs static
  isDynamic: boolean("is_dynamic").default(true),
  contactIds: jsonb("contact_ids").$type<string[]>().default([]),

  // Analytics
  contactCount: integer("contact_count").default(0),
  lastRefreshed: date("last_refreshed"),

  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// Analytics Events - Enhanced
export const AnalyticsEvents = pgTable("analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: varchar("event_type").notNull(), // email_open, email_click, campaign_sent, etc.
  eventData: jsonb("event_data").$type<any>().default({}),

  // Relations
  contactId: uuid("contact_id").references(() => Contacts.id),
  campaignId: uuid("campaign_id").references(() => Campaigns.id),
  messageId: uuid("message_id").references(() => Messages.id),
  templateId: uuid("template_id").references(() => Templates.id),

  // Metadata
  timestamp: date("timestamp").defaultNow(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  location: jsonb("location").$type<{
    country?: string;
    region?: string;
    city?: string;
  }>(),

  // Device info
  deviceType: varchar("device_type"), // desktop, mobile, tablet
  browser: varchar("browser"),
  os: varchar("os"),

  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
});

// Activity Logs - Enhanced
export const ActivityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: varchar("action").notNull(), // created, updated, deleted, sent, opened, etc.
  entityType: varchar("entity_type").notNull(), // contact, campaign, template, message
  entityId: uuid("entity_id").notNull(),

  // Change tracking
  oldValues: jsonb("old_values").$type<any>(),
  newValues: jsonb("new_values").$type<any>(),
  changes: jsonb("changes").$type<Record<string, { old: any; new: any }>>(),

  // Context
  metadata: jsonb("metadata").$type<any>().default({}),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),

  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
});

// Template Gallery - Enhanced
export const TemplateGallery = pgTable("template_gallery", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  subCategory: varchar("sub_category"),

  // Template content
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  variables: jsonb("variables").$type<string[]>().default([]),

  // Gallery features
  isPublic: boolean("is_public").default(false),
  isPremium: boolean("is_premium").default(false),
  authorId: varchar("author_id"),
  authorName: varchar("author_name"),

  // Usage stats
  usageCount: integer("usage_count").default(0),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }),
  averageOpenRate: decimal("average_open_rate", { precision: 5, scale: 2 }),
  averageClickRate: decimal("average_click_rate", { precision: 5, scale: 2 }),

  // Tags and search
  tags: jsonb("tags").$type<string[]>().default([]),
  industries: jsonb("industries").$type<string[]>().default([]),

  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// A/B Tests - Enhanced
export const ABTests = pgTable("ab_tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),

  // Test configuration
  campaignId: uuid("campaign_id").references(() => Campaigns.id),
  testType: varchar("test_type").notNull(), // subject_line, content, send_time, template
  variants: jsonb("variants").$type<Array<{
    id: string;
    name: string;
    content: any;
    weight: number;
  }>>().notNull(),

  // Test parameters
  sampleSize: integer("sample_size").notNull(),
  confidenceLevel: decimal("confidence_level", { precision: 3, scale: 2 }).default("0.95"),
  testDuration: integer("test_duration"), // in days

  // Status and results
  status: varchar("status").default("draft"), // draft, running, completed, paused
  startedAt: date("started_at"),
  completedAt: date("completed_at"),

  // Results
  winner: varchar("winner"), // variant ID
  results: jsonb("results").$type<{
    variants: Record<string, {
      sent: number;
      opens: number;
      clicks: number;
      replies: number;
      conversions: number;
    }>;
    statisticalSignificance: boolean;
    confidence: number;
  }>(),

  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// Scheduled Jobs - Enhanced
export const ScheduledJobs = pgTable("scheduled_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobType: varchar("job_type").notNull(), // send_campaign, follow_up, analytics_report, etc.
  jobData: jsonb("job_data").$type<any>().notNull(),

  // Scheduling
  scheduledAt: date("scheduled_at").notNull(),
  timezone: varchar("timezone").default("UTC"),
  recurrence: jsonb("recurrence").$type<{
    frequency: "once" | "daily" | "weekly" | "monthly";
    interval?: number;
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    endDate?: string;
  }>(),

  // Execution
  status: varchar("status").default("pending"), // pending, running, completed, failed, cancelled
  startedAt: date("started_at"),
  completedAt: date("completed_at"),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),

  // Error handling
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  nextRetryAt: date("next_retry_at"),

  // Relations
  campaignId: uuid("campaign_id").references(() => Campaigns.id),
  contactId: uuid("contact_id").references(() => Contacts.id),

  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// Integration Logs - Enhanced
export const IntegrationLogs = pgTable("integration_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  integrationType: varchar("integration_type").notNull(), // sendgrid, google_sheets, notion, linkedin, etc.
  action: varchar("action").notNull(), // sync, import, export, authenticate, etc.

  // Request/Response data
  requestData: jsonb("request_data").$type<any>(),
  responseData: jsonb("response_data").$type<any>(),
  statusCode: integer("status_code"),

  // Status and timing
  status: varchar("status").default("success"), // success, error, warning
  duration: integer("duration"), // in milliseconds
  errorMessage: text("error_message"),

  // Metadata
  recordCount: integer("record_count"),
  externalId: varchar("external_id"), // ID from external service
  webhookData: jsonb("webhook_data").$type<any>(),

  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
});

// Cold Outreach Templates - Enhanced
export const Templates = pgTable("cold_outreach_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),

  // Categorization
  category: varchar("category").default("General"),
  tags: jsonb("tags").$type<string[]>().default([]),
  subCategory: varchar("sub_category"),

  // User preferences
  isFavorite: boolean("is_favorite").default(false),
  isPublic: boolean("is_public").default(false),
  sortOrder: integer("sort_order").default(0),

  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsedAt: date("last_used_at"),
  totalSent: integer("total_sent").default(0),
  totalOpens: integer("total_opens").default(0),
  totalClicks: integer("total_clicks").default(0),
  totalReplies: integer("total_replies").default(0),

  // Performance metrics
  openRate: integer("open_rate").default(0), // percentage * 100
  clickRate: integer("click_rate").default(0),
  replyRate: integer("reply_rate").default(0),
  conversionRate: integer("conversion_rate").default(0),

  // Template metadata
  variables: jsonb("variables").$type<Array<{
    name: string;
    description: string;
    example: string;
    required: boolean;
  }>>().default([]),

  // Version control
  version: integer("version").default(1),
  parentTemplateId: uuid("parent_template_id"), // For template variations
  isArchived: boolean("is_archived").default(false),

  // AI and automation
  aiGenerated: boolean("ai_generated").default(false),
  aiPrompt: text("ai_prompt"),
  aiModel: varchar("ai_model"),

  // Preview and thumbnails
  previewText: text("preview_text"), // First 200 chars for preview
  thumbnailUrl: varchar("thumbnail_url"),

  // Advanced settings
  sendTimeOptimization: boolean("send_time_optimization").default(false),
  abTestEnabled: boolean("ab_test_enabled").default(false),
  complianceCheck: boolean("compliance_check").default(true),

  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// User Settings table
export const UserSettings = pgTable("userSettings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  profile: jsonb("profile").$type<{
    firstName?: string;
    lastName?: string;
    company?: string;
    role?: string;
    timezone?: string;
    avatar?: string;
  }>(),

  notifications: jsonb("notifications").$type<{
    email: boolean;
    push: boolean;
    sound: boolean;
    pollInterval: number; // in seconds
    ticketUpdates: boolean;
    workTracker: boolean;
    campaignUpdates: boolean;
    contactUpdates: boolean;
  }>(),

  security: jsonb("security").$type<{
    twoFactorEnabled: boolean;
    sessionTimeout: number; // in minutes
    passwordLastChanged?: string;
    apiKeys?: Array<{
      id: string;
      name: string;
      key: string;
      createdAt: string;
      lastUsed?: string;
    }>;
  }>(),

  integrations: jsonb("integrations").$type<{
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
  }>(),

  coldOutreach: jsonb("cold_outreach").$type<{
    defaultCampaignSettings: {
      dailyLimit: number;
      followUpDelay: number; // in days
      maxFollowUps: number;
    };
    emailTemplates: {
      defaultSubject: string;
      defaultSignature: string;
    };
    crmSync: {
      autoSync: boolean;
      syncInterval: number; // in hours
    };
  }>(),

  system: jsonb("system").$type<{
    theme: 'light' | 'dark' | 'system';
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    dataRetention: number; // in days
    exportFormat: 'csv' | 'json' | 'xlsx';
  }>(),

  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// Settings validation schema
export const settingsSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  profile: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    company: z.string().optional(),
    role: z.string().optional(),
    timezone: z.string().optional(),
    avatar: z.string().optional(),
  }).optional(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sound: z.boolean(),
    pollInterval: z.number().min(10).max(300),
    ticketUpdates: z.boolean(),
    workTracker: z.boolean(),
    campaignUpdates: z.boolean(),
    contactUpdates: z.boolean(),
  }).optional(),
  security: z.object({
    twoFactorEnabled: z.boolean(),
    sessionTimeout: z.number().min(5).max(480),
    passwordLastChanged: z.string().optional(),
    apiKeys: z.array(z.object({
      id: z.string(),
      name: z.string(),
      key: z.string(),
      createdAt: z.string(),
      lastUsed: z.string().optional(),
    })).optional(),
  }).optional(),
  integrations: z.object({
    sendgrid: z.object({
      apiKey: z.string().optional(),
      verified: z.boolean(),
      fromEmail: z.string().optional(),
      fromName: z.string().optional(),
    }),
    googleSheets: z.object({
      connected: z.boolean(),
      spreadsheetId: z.string().optional(),
      sheetName: z.string().optional(),
    }),
    notion: z.object({
      connected: z.boolean(),
      databaseId: z.string().optional(),
    }),
    linkedin: z.object({
      connected: z.boolean(),
      profileUrl: z.string().optional(),
    }),
  }).optional(),
  coldOutreach: z.object({
    defaultCampaignSettings: z.object({
      dailyLimit: z.number().min(1).max(1000),
      followUpDelay: z.number().min(1).max(30),
      maxFollowUps: z.number().min(0).max(10),
    }),
    emailTemplates: z.object({
      defaultSubject: z.string(),
      defaultSignature: z.string(),
    }),
    crmSync: z.object({
      autoSync: z.boolean(),
      syncInterval: z.number().min(1).max(24),
    }),
  }).optional(),
  system: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.string(),
    dateFormat: z.string(),
    timeFormat: z.enum(['12h', '24h']),
    dataRetention: z.number().min(30).max(3650),
    exportFormat: z.enum(['csv', 'json', 'xlsx']),
  }).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Contact validation schema
export const contactSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  email: z.string().email('Invalid email address'),
  role: z.string().optional(),
  company: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().optional(),
  notes: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  revenue: z.string().optional(),
  linkedinProfile: z.record(z.any()).optional(),
  emailVerified: z.boolean().optional(),
  emailValid: z.boolean().optional(),
  status: z.string().optional(),
  lifecycleStage: z.string().optional(),
  engagementScore: z.number().min(0).max(100).optional(),
  priorityScore: z.number().min(0).max(100).optional(),
  leadScore: z.number().min(0).max(100).optional(),
  totalEmailsSent: z.number().optional(),
  totalOpens: z.number().optional(),
  totalClicks: z.number().optional(),
  totalReplies: z.number().optional(),
  totalBounces: z.number().optional(),
  lastContactedAt: z.date().optional(),
  lastRepliedAt: z.date().optional(),
  lastOpenedAt: z.date().optional(),
  segments: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  source: z.string().optional(),
  sourceDetails: z.record(z.any()).optional(),
  userId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const coldOutreachSignupSchema = z.object({
  email: z.string().email('Invalid email address').max(254, 'Email must be less than 254 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be less than 128 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
});

// Template validation schema
export const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  content: z.string().min(1, 'Content is required').max(10000, 'Content must be less than 10,000 characters'),
  category: z.string().optional().default('General'),
  tags: z.array(z.string()).optional().default([]),
  subCategory: z.string().optional(),
  isFavorite: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(false),
  sortOrder: z.number().optional().default(0),
  usageCount: z.number().optional().default(0),
  lastUsedAt: z.date().optional(),
  totalSent: z.number().optional().default(0),
  totalOpens: z.number().optional().default(0),
  totalClicks: z.number().optional().default(0),
  totalReplies: z.number().optional().default(0),
  openRate: z.number().optional().default(0),
  clickRate: z.number().optional().default(0),
  replyRate: z.number().optional().default(0),
  conversionRate: z.number().optional().default(0),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    example: z.string(),
    required: z.boolean()
  })).optional().default([]),
  version: z.number().optional().default(1),
  parentTemplateId: z.string().optional(),
  isArchived: z.boolean().optional().default(false),
  aiGenerated: z.boolean().optional().default(false),
  aiPrompt: z.string().optional(),
  aiModel: z.string().optional(),
  previewText: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  sendTimeOptimization: z.boolean().optional().default(false),
  abTestEnabled: z.boolean().optional().default(false),
  complianceCheck: z.boolean().optional().default(true),
  userId: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Removed hybrid table - using simple startup generation only


// ============================================================================
// AGTECH EVENT FINDER TABLES
// ============================================================================

// AgTech Events - Store discovered events
export const AgTechEvents = pgTable("agtech_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventName: varchar("event_name").notNull(),
  date: varchar("date").notNull(),
  location: varchar("location").notNull(),
  description: text("description").notNull(),
  price: varchar("price").notNull(),
  registrationLink: varchar("registration_link").notNull(),
  
  // Search metadata
  searchLocation: varchar("search_location").notNull(), // Original search query
  
  // User tracking
  userId: varchar("user_id").notNull(),
  
  // Timestamps
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// AgTech Event Search History - Track user searches
export const AgTechEventSearchHistory = pgTable("agtech_event_search_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull(),
  location: varchar("location").notNull(),
  resultsCount: integer("results_count").notNull(),
  
  // Timestamps
  searchedAt: date("searched_at").defaultNow(),
});

// AgTech Event Favorites - User saved events
export const AgTechEventFavorites = pgTable("agtech_event_favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull(),
  eventId: uuid("event_id").notNull().references(() => AgTechEvents.id),
  
  // Notes
  notes: text("notes"),
  
  // Timestamps
  createdAt: date("created_at").defaultNow(),
});

// Validation schemas for AgTech Events
export const agTechEventSchema = z.object({
  id: z.string().optional(),
  eventName: z.string().min(1, 'Event name is required'),
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.string().min(1, 'Price is required'),
  registrationLink: z.string().url('Must be a valid URL'),
  searchLocation: z.string().min(1, 'Search location is required'),
  userId: z.string().min(1, 'User ID is required'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const agTechEventSearchHistorySchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  location: z.string().min(1, 'Location is required'),
  resultsCount: z.number().min(0, 'Results count must be non-negative'),
  searchedAt: z.date().optional(),
});

export const agTechEventFavoriteSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  notes: z.string().optional(),
  createdAt: z.date().optional(),
});


// ============================================================================
// SENTIMENT ANALYZER TABLES (Enterprise-Grade)
// ============================================================================

// Sentiment Articles - Stores analyzed articles with sentiment data
export const SentimentArticles = pgTable("sentiment_articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyQuery: varchar("company_query", { length: 255 }).notNull(),
  descriptionQuery: varchar("description_query", { length: 255 }),
  title: varchar("title", { length: 500 }).notNull(),
  link: varchar("link", { length: 1000 }).notNull().unique(),
  snippet: text("snippet"),
  sentiment: varchar("sentiment", { length: 20 }).notNull(), // 'positive', 'negative', 'neutral'
  reasoning: text("reasoning").notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  companyQueryIdx: index("sentiment_articles_company_query_idx").on(table.companyQuery),
  userIdIdx: index("sentiment_articles_user_id_idx").on(table.userId),
  linkIdx: index("sentiment_articles_link_idx").on(table.link),
  createdAtIdx: index("sentiment_articles_created_at_idx").on(table.createdAt),
  sentimentIdx: index("sentiment_articles_sentiment_idx").on(table.sentiment),
}));

// Sentiment Search History - Tracks user search history
export const SentimentSearchHistory = pgTable("sentiment_search_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyQuery: varchar("company_query", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  resultsCount: integer("results_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("sentiment_search_history_user_id_idx").on(table.userId),
  createdAtIdx: index("sentiment_search_history_created_at_idx").on(table.createdAt),
  companyQueryIdx: index("sentiment_search_history_company_query_idx").on(table.companyQuery),
}));

// Sentiment API Usage - Tracks daily API usage per user (100/day limit)
export const SentimentApiUsage = pgTable("sentiment_api_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  date: date("date").notNull(),
  count: integer("count").default(0).notNull(),
  resetAt: timestamp("reset_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userDateIdx: index("sentiment_api_usage_user_date_idx").on(table.userId, table.date),
}));

// Validation schemas for Sentiment Analyzer
export const sentimentArticleSchema = z.object({
  id: z.string().optional(),
  companyQuery: z.string().min(1, 'Company query is required').max(255),
  descriptionQuery: z.string().max(255).optional(),
  title: z.string().min(1, 'Title is required').max(500),
  link: z.string().url('Must be a valid URL').max(1000),
  snippet: z.string().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral'], {
    errorMap: () => ({ message: 'Sentiment must be positive, negative, or neutral' })
  }),
  reasoning: z.string().min(1, 'Reasoning is required'),
  userId: z.string().min(1, 'User ID is required'),
  createdAt: z.date().optional(),
});

export const sentimentSearchHistorySchema = z.object({
  id: z.string().optional(),
  companyQuery: z.string().min(1, 'Company query is required').max(255),
  userId: z.string().min(1, 'User ID is required'),
  resultsCount: z.number().min(0, 'Results count must be non-negative'),
  createdAt: z.date().optional(),
});

export const sentimentApiUsageSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  date: z.string().min(1, 'Date is required'),
  count: z.number().min(0, 'Count must be non-negative').max(100, 'Daily limit is 100'),
  resetAt: z.date(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ============================================================================
// AI OUTREACH AGENT TABLES
// ============================================================================

export const OutreachLists = pgTable("ai_outreach_lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  companyDescription: text("company_description").notNull(),
  targetAudiences: jsonb("target_audiences").$type<string[]>().notNull(),
  status: varchar("status", { length: 50 }).default("completed"), // 'generating', 'completed', 'failed'
  leadCount: integer("lead_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    processingTime?: number;
    aiModel?: string;
    cacheHit?: boolean;
  }>(),
}, (table) => ({
  userIdIdx: index("ai_outreach_lists_user_id_idx").on(table.userId),
  createdAtIdx: index("ai_outreach_lists_created_at_idx").on(table.createdAt),
  statusIdx: index("ai_outreach_lists_status_idx").on(table.status),
}));

export const OutreachLeads = pgTable("ai_outreach_leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: uuid("list_id").notNull().references(() => OutreachLists.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // LeadType enum values
  relevance: text("relevance").notNull(),
  outreachSuggestion: text("outreach_suggestion").notNull(),
  status: varchar("status", { length: 50 }).default("active"), // 'active', 'contacted', 'responded', 'archived'
  priority: integer("priority").default(1), // 1-5, higher is more important
  tags: jsonb("tags").$type<string[]>().default([]),
  contactInfo: jsonb("contact_info").$type<{
    email?: string;
    linkedin?: string;
    website?: string;
    phone?: string;
  }>(),
  notes: text("notes"),
  contactedAt: timestamp("contacted_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  listIdIdx: index("ai_outreach_leads_list_id_idx").on(table.listId),
  userIdIdx: index("ai_outreach_leads_user_id_idx").on(table.userId),
  typeIdx: index("ai_outreach_leads_type_idx").on(table.type),
  statusIdx: index("ai_outreach_leads_status_idx").on(table.status),
}));

export const OutreachSessions = pgTable("ai_outreach_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // in seconds
  actions: jsonb("actions").$type<Array<{
    action: string;
    timestamp: string;
    metadata?: any;
  }>>().default([]),
  metadata: jsonb("metadata").$type<{
    totalListsGenerated?: number;
    totalLeadsViewed?: number;
    exportCount?: number;
    searchQueries?: string[];
  }>(),
}, (table) => ({
  userIdIdx: index("ai_outreach_sessions_user_id_idx").on(table.userId),
  sessionIdIdx: index("ai_outreach_sessions_session_id_idx").on(table.sessionId),
  startedAtIdx: index("ai_outreach_sessions_started_at_idx").on(table.startedAt),
}));

// Validation schemas for AI Outreach Agent
export const outreachListSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required').max(255),
  companyDescription: z.string().min(50, 'Company description must be at least 50 characters').max(2000),
  targetAudiences: z.array(z.string()).min(1, 'At least one target audience required').max(5),
  status: z.enum(['generating', 'completed', 'failed']).optional(),
  leadCount: z.number().min(0).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  completedAt: z.date().optional(),
  errorMessage: z.string().optional(),
  metadata: z.object({
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional(),
    processingTime: z.number().optional(),
    aiModel: z.string().optional(),
    cacheHit: z.boolean().optional(),
  }).optional(),
});

export const outreachLeadSchema = z.object({
  id: z.string().uuid().optional(),
  listId: z.string().uuid('Invalid list ID'),
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Lead name is required').max(255),
  type: z.string().min(1, 'Lead type is required').max(50),
  relevance: z.string().min(10, 'Relevance must be at least 10 characters'),
  outreachSuggestion: z.string().min(20, 'Outreach suggestion must be at least 20 characters'),
  status: z.enum(['active', 'contacted', 'responded', 'archived']).optional(),
  priority: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  contactInfo: z.object({
    email: z.string().email().optional(),
    linkedin: z.string().url().optional(),
    website: z.string().url().optional(),
    phone: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  contactedAt: z.date().optional(),
  respondedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const outreachSessionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().min(1, 'User ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  startedAt: z.date().optional(),
  endedAt: z.date().optional(),
  duration: z.number().optional(),
  actions: z.array(z.object({
    action: z.string(),
    timestamp: z.string(),
    metadata: z.any().optional(),
  })).optional(),
  metadata: z.object({
    totalListsGenerated: z.number().optional(),
    totalLeadsViewed: z.number().optional(),
    exportCount: z.number().optional(),
    searchQueries: z.array(z.string()).optional(),
  }).optional(),
});

// ============================================================================
// AUTHENTICATION TABLES (Enterprise-Grade)
// ============================================================================

// Import from auth-schema
export * from './auth-schema';
