import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  password: integer("password"),
  providers: text("providers").notNull(),
});

export const clientTable = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  domains: text("domains"),
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