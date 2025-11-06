import { relations } from 'drizzle-orm';
import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User settings table
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  glucoseUnits: text('glucose_units').default('mg/dL').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Patients table
export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  dob: timestamp('dob').notNull(),
  diabetesType: text('diabetes_type').notNull(),
  lifestyle: text('lifestyle'),
  activityLevel: text('activity_level'),
  usualMedications: jsonb('usual_medications')
    .$type<Array<{ brand: string; dosage: string; timing?: string }>>()
    .default([]),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Entries table
export const entries = pgTable('entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  entryType: text('entry_type').notNull(), // 'glucose', 'meal', 'insulin'
  value: text('value').notNull(),
  units: text('units'),
  medicationBrand: text('medication_brand'),
  occurredAt: timestamp('occurred_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Recommendations table
export const recommendations = pgTable('recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  prompt: text('prompt').notNull(),
  response: text('response').notNull(),
  doseUnits: integer('dose_units'),
  medicationName: text('medication_name'),
  reasoning: text('reasoning'),
  safetyNotes: text('safety_notes'),
  confidence: text('confidence'), // 'high', 'medium', 'low'
  recommendedMonitoring: text('recommended_monitoring'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  patients: many(patients),
  settings: one(userSettings),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  entries: many(entries),
  recommendations: many(recommendations),
}));

export const entriesRelations = relations(entries, ({ one }) => ({
  patient: one(patients, {
    fields: [entries.patientId],
    references: [patients.id],
  }),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  patient: one(patients, {
    fields: [recommendations.patientId],
    references: [patients.id],
  }),
}));
