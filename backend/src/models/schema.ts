import { pgTable, text, timestamp, uuid, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const sitters = pgTable('sitters', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseUid: text('firebase_uid').unique().notNull(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone'),
  bio: text('bio'),
  profileImage: text('profile_image'),
  location: text('location'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sitterId: uuid('sitter_id').references(() => sitters.id).notNull(),
  petName: text('pet_name').notNull(),
  petType: text('pet_type').notNull(), // dog, cat, etc
  ownerName: text('owner_name').notNull(),
  ownerContact: text('owner_contact'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  shareLink: text('share_link').unique().notNull(), // for owners to view
  isActive: boolean('is_active').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const updates = pgTable('updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'photo' | 'video'
  mediaUrl: text('media_url'), // Cloudinary URL
  caption: text('caption'),
  metadata: jsonb('metadata'), // Cloudinary metadata, dimensions, etc
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessionStats = pgTable('session_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  totalUpdates: integer('total_updates').default(0),
  totalPhotos: integer('total_photos').default(0),
  totalVideos: integer('total_videos').default(0),
  lastUpdateAt: timestamp('last_update_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const sittersRelations = relations(sitters, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  sitter: one(sitters, {
    fields: [sessions.sitterId],
    references: [sitters.id],
  }),
  updates: many(updates),
  stats: one(sessionStats, {
    fields: [sessions.id],
    references: [sessionStats.sessionId],
  }),
}));

export const updatesRelations = relations(updates, ({ one }) => ({
  session: one(sessions, {
    fields: [updates.sessionId],
    references: [sessions.id],
  }),
}));

export const sessionStatsRelations = relations(sessionStats, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionStats.sessionId],
    references: [sessions.id],
  }),
}));

// Types for TypeScript
export type Sitter = typeof sitters.$inferSelect;
export type NewSitter = typeof sitters.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Update = typeof updates.$inferSelect;
export type NewUpdate = typeof updates.$inferInsert;

export type SessionStats = typeof sessionStats.$inferSelect;
export type NewSessionStats = typeof sessionStats.$inferInsert;