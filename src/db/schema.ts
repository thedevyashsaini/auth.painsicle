import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  providers: text("providers").notNull(),
  pfp: text("pfp").notNull(),
});

export const clientTable = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  domains: text("domains"),
  provider: text("provider").notNull().default("github"),
  logo: text("logo"),
});

export const kvTable = sqliteTable("kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  expiry: integer("expiry").notNull(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type InsertClient = typeof clientTable.$inferInsert;
export type SelectClient = typeof clientTable.$inferSelect;