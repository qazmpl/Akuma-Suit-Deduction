import { jsonb, pgTable, text } from "drizzle-orm/pg-core";

export const gameRooms = pgTable("game_rooms", {
  code: text("code").primaryKey(),
  state: jsonb("state").$type<unknown>().notNull(),
});
