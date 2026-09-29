import {
  timestamp,
  integer,
  pgTable,
  varchar,
  index,
} from "drizzle-orm/pg-core";

export const linksTable = pgTable(
  "links",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id),
    shortCode: varchar().notNull().unique(),
    originalUrl: varchar().notNull(),
    clickCount: integer().default(0).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [index("links_user_id_idx").on(table.userId)],
);

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: varchar({ length: 100 }).notNull().unique(),
  passwordHash: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: varchar().primaryKey(),
    userId: integer()
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const clicksTable = pgTable(
  "clicks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    linkId: integer()
      .notNull()
      .references(() => linksTable.id),

    clickedAt: timestamp().defaultNow().notNull(),
  },
  (table) => [index("clicks_link_id_idx").on(table.linkId)],
);
