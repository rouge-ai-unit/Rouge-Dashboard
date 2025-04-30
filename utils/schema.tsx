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
  linkedin: varchar("linkedin").notNull(),
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
  hashtags: varchar("hashtags").notNull(), // Assuming the 3 hashtags are stored as a comma-separated string
});
