import { boolean, date, integer, jsonb, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

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
  rougeScore: integer("rouge_score").notNull(),
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

// Scraped Startups Data (Real market data from web scraping)
export const ScrapedStartups = pgTable("scraped_startups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  website: varchar("website"),
  description: text("description"),
  city: varchar("city"),
  country: varchar("country").default("Thailand"),
  industry: varchar("industry").default("Agritech"),
  sourceUrl: varchar("source_url").notNull(), // URL where this data was scraped from
  sourceName: varchar("source_name").notNull(), // e.g., "Seedtable", "Tracxn"
  scrapedAt: date("scraped_at").defaultNow(),
  isValidated: boolean("is_validated").default(false),
  validationScore: integer("validation_score"), // 0-100 quality score
  dataFreshness: integer("data_freshness").default(100), // Decreases over time
  userId: varchar("user_id"), // Associated user (null for global data)
  metadata: jsonb("metadata"), // Additional scraped information
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow(),
});

// AI Validation Results (Cross-referencing AI-generated vs real startups)
export const AIValidationResults = pgTable("ai_validation_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  aiStartupId: varchar("ai_startup_id"), // Reference to AI-generated startup
  aiStartupName: varchar("ai_startup_name").notNull(),
  scrapedStartupId: varchar("scraped_startup_id"), // Reference to real scraped startup
  scrapedStartupName: varchar("scraped_startup_name").notNull(),
  similarityScore: integer("similarity_score").notNull(), // 0-100 similarity percentage
  validationStatus: varchar("validation_status").notNull(), // 'high_match', 'medium_match', 'low_match', 'no_match'
  validationDetails: jsonb("validation_details"), // Detailed comparison results
  marketGapAnalysis: jsonb("market_gap_analysis"), // Analysis of market positioning
  userId: varchar("user_id").notNull(),
  createdAt: date("created_at").defaultNow(),
});

// Scraping Jobs (Track scraping operations)
export const ScrapingJobs = pgTable("scraping_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull(),
  sourceUrls: jsonb("source_urls").notNull(), // Array of URLs to scrape
  status: varchar("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  progress: integer("progress").default(0), // 0-100
  totalUrls: integer("total_urls").notNull(),
  processedUrls: integer("processed_urls").default(0),
  successfulScrapes: integer("successful_scrapes").default(0),
  failedScrapes: integer("failed_scrapes").default(0),
  result: jsonb("result"), // Summary of scraping results
  error: text("error"),
  createdAt: date("created_at").defaultNow(),
  completedAt: date("completed_at"),
});

// Removed hybrid table - using simple startup generation only