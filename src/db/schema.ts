import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const articlesTable = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  published: text("published"),

  loadTime: integer("load_time").notNull(),
  parsingTime: integer("parsing_time").notNull(),
  fetchingStatus: text("fetching_status").notNull(),
  parsingStatus: text("parsing_status").notNull(),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});
