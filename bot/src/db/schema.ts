import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const polls = sqliteTable("polls", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pollMessageId: text("poll_message_id").notNull().unique(),
  companionMessageId: text("companion_message_id"),
  channelId: text("channel_id").notNull(),
  group: text("group").notNull(),
  game: text("game"),
  // JSON array of ISO datetime strings, ordered to match Discord poll answer indices
  slots: text("slots").notNull(),
  status: text("status", { enum: ["active", "completed", "cancelled"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export type Poll = typeof polls.$inferSelect;
export type NewPoll = typeof polls.$inferInsert;
