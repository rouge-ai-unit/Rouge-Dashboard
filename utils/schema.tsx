import { boolean, date, integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

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