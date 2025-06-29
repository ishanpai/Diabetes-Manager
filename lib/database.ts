import {
  and,
  desc,
  eq,
  gte,
  lte,
  sql,
} from 'drizzle-orm';

import type {
  Entry,
  Patient,
  Recommendation,
  User,
} from '@/types';

import { db } from './db';
import {
  entries,
  patients,
  recommendations,
  users,
  userSettings,
} from './schema';

// User functions
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (result.length === 0) return null;
    
    const user = result[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      password: user.password,
    };
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

export async function findUsers(): Promise<User[]> {
  try {
    const result = await db.select().from(users);
    return result.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      password: user.password,
    }));
  } catch (error) {
    console.error('Error finding users:', error);
    return [];
  }
}

export async function createUser(userData: { email: string; name?: string; image?: string; password?: string }): Promise<User | null> {
  try {
    const result = await db.insert(users).values(userData).returning();
    if (result.length === 0) return null;
    
    const user = result[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      password: user.password,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

// Patient functions
export async function findPatientsByUserId(userId: string, limit?: number, offset?: number): Promise<Patient[]> {
  try {
    const result = await db.select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .orderBy(desc(patients.createdAt))
      .limit(limit || 1000)
      .offset(offset || 0);
    
    return result.map(patient => ({
      id: patient.id,
      name: patient.name,
      dob: patient.dob,
      diabetesType: patient.diabetesType,
      lifestyle: patient.lifestyle || undefined,
      activityLevel: patient.activityLevel as 'Low' | 'Moderate' | 'High' | undefined,
      usualMedications: patient.usualMedications || [],
      userId: patient.userId,
      createdAt: patient.createdAt || new Date(),
      updatedAt: patient.updatedAt || new Date(),
      age: calculateAge(patient.dob),
    }));
  } catch (error) {
    console.error('Error finding patients by user ID:', error);
    return [];
  }
}

export async function findPatientById(patientId: string): Promise<Patient | null> {
  try {
    const result = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    if (result.length === 0) return null;
    
    const patient = result[0];
    return {
      id: patient.id,
      name: patient.name,
      dob: patient.dob,
      diabetesType: patient.diabetesType,
      lifestyle: patient.lifestyle || undefined,
      activityLevel: patient.activityLevel as 'Low' | 'Moderate' | 'High' | undefined,
      usualMedications: patient.usualMedications || [],
      userId: patient.userId,
      createdAt: patient.createdAt || new Date(),
      updatedAt: patient.updatedAt || new Date(),
      age: calculateAge(patient.dob),
    };
  } catch (error) {
    console.error('Error finding patient by ID:', error);
    return null;
  }
}

export async function createPatient(patientData: {
  name: string;
  dob: Date;
  diabetesType: string;
  lifestyle?: string;
  activityLevel?: string;
  usualMedications: Array<{ brand: string; dosage: string; timing?: string }>;
  userId: string;
}): Promise<Patient | null> {
  try {
    const result = await db.insert(patients).values(patientData).returning();
    if (result.length === 0) return null;
    
    const patient = result[0];
    return {
      id: patient.id,
      name: patient.name,
      dob: patient.dob,
      diabetesType: patient.diabetesType,
      lifestyle: patient.lifestyle || undefined,
      activityLevel: patient.activityLevel as 'Low' | 'Moderate' | 'High' | undefined,
      usualMedications: patient.usualMedications || [],
      userId: patient.userId,
      createdAt: patient.createdAt || new Date(),
      updatedAt: patient.updatedAt || new Date(),
      age: calculateAge(patient.dob),
    };
  } catch (error) {
    console.error('Error creating patient:', error);
    return null;
  }
}

export async function updatePatient(patientId: string, updates: Partial<{
  name: string;
  dob: Date;
  diabetesType: string;
  lifestyle: string;
  activityLevel: string;
  usualMedications: Array<{ brand: string; dosage: string; timing?: string }>;
}>): Promise<Patient | null> {
  try {
    const result = await db.update(patients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(patients.id, patientId))
      .returning();
    
    if (result.length === 0) return null;
    
    const patient = result[0];
    return {
      id: patient.id,
      name: patient.name,
      dob: patient.dob,
      diabetesType: patient.diabetesType,
      lifestyle: patient.lifestyle || undefined,
      activityLevel: patient.activityLevel as 'Low' | 'Moderate' | 'High' | undefined,
      usualMedications: patient.usualMedications || [],
      userId: patient.userId,
      createdAt: patient.createdAt || new Date(),
      updatedAt: patient.updatedAt || new Date(),
      age: calculateAge(patient.dob),
    };
  } catch (error) {
    console.error('Error updating patient:', error);
    return null;
  }
}

export async function deletePatient(patientId: string): Promise<boolean> {
  try {
    const result = await db.delete(patients).where(eq(patients.id, patientId)).returning();
    return result.length > 0;
  } catch (error) {
    console.error('Error deleting patient:', error);
    return false;
  }
}

// Entry functions
export async function findEntriesByPatientId(patientId: string, limit?: number, offset?: number): Promise<Entry[]> {
  try {
    const result = await db.select()
      .from(entries)
      .where(eq(entries.patientId, patientId))
      .orderBy(desc(entries.occurredAt))
      .limit(limit || 1000)
      .offset(offset || 0);
    
    return result.map(entry => ({
      id: entry.id,
      patientId: entry.patientId,
      entryType: entry.entryType as 'glucose' | 'meal' | 'insulin',
      value: entry.value,
      units: entry.units || undefined,
      medicationBrand: entry.medicationBrand || undefined,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt || new Date(),
    }));
  } catch (error) {
    console.error('Error finding entries by patient ID:', error);
    return [];
  }
}

export async function findEntriesByPatientIdAndType(patientId: string, entryType: 'glucose' | 'meal' | 'insulin', limit?: number, offset?: number): Promise<Entry[]> {
  try {
    const result = await db.select()
      .from(entries)
      .where(
        and(
          eq(entries.patientId, patientId),
          eq(entries.entryType, entryType)
        )
      )
      .orderBy(desc(entries.occurredAt))
      .limit(limit || 1000)
      .offset(offset || 0);
    
    return result.map(entry => ({
      id: entry.id,
      patientId: entry.patientId,
      entryType: entry.entryType as 'glucose' | 'meal' | 'insulin',
      value: entry.value,
      units: entry.units || undefined,
      medicationBrand: entry.medicationBrand || undefined,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt || new Date(),
    }));
  } catch (error) {
    console.error('Error finding entries by patient ID and type:', error);
    return [];
  }
}

export async function countEntriesByPatientId(patientId: string): Promise<number> {
  try {
    const result = await db.select({ count: sql`count(*)` })
      .from(entries)
      .where(eq(entries.patientId, patientId));
    
    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error('Error counting entries by patient ID:', error);
    return 0;
  }
}

export async function findEntriesByDateRange(patientId: string, startDate: Date, endDate: Date): Promise<Entry[]> {
  try {
    const result = await db.select()
      .from(entries)
      .where(
        and(
          eq(entries.patientId, patientId),
          gte(entries.occurredAt, startDate),
          lte(entries.occurredAt, endDate)
        )
      )
      .orderBy(desc(entries.occurredAt));
    
    return result.map(entry => ({
      id: entry.id,
      patientId: entry.patientId,
      entryType: entry.entryType as 'glucose' | 'meal' | 'insulin',
      value: entry.value,
      units: entry.units || undefined,
      medicationBrand: entry.medicationBrand || undefined,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt || new Date(),
    }));
  } catch (error) {
    console.error('Error finding entries by date range:', error);
    return [];
  }
}

export async function createEntry(entryData: {
  patientId: string;
  entryType: 'glucose' | 'meal' | 'insulin';
  value: string;
  units?: string;
  medicationBrand?: string;
  occurredAt: Date;
}): Promise<Entry | null> {
  try {
    const result = await db.insert(entries).values(entryData).returning();
    if (result.length === 0) return null;
    
    const entry = result[0];
    return {
      id: entry.id,
      patientId: entry.patientId,
      entryType: entry.entryType as 'glucose' | 'meal' | 'insulin',
      value: entry.value,
      units: entry.units || undefined,
      medicationBrand: entry.medicationBrand || undefined,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt || new Date(),
    };
  } catch (error) {
    console.error('Error creating entry:', error);
    return null;
  }
}

export async function updateEntry(entryId: string, updates: Partial<{
  value: string;
  units: string;
  medicationBrand: string;
  occurredAt: Date;
}>): Promise<Entry | null> {
  try {
    const result = await db.update(entries)
      .set(updates)
      .where(eq(entries.id, entryId))
      .returning();
    
    if (result.length === 0) return null;
    
    const entry = result[0];
    return {
      id: entry.id,
      patientId: entry.patientId,
      entryType: entry.entryType as 'glucose' | 'meal' | 'insulin',
      value: entry.value,
      units: entry.units || undefined,
      medicationBrand: entry.medicationBrand || undefined,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt || new Date(),
    };
  } catch (error) {
    console.error('Error updating entry:', error);
    return null;
  }
}

export async function deleteEntry(entryId: string): Promise<boolean> {
  try {
    const result = await db.delete(entries).where(eq(entries.id, entryId)).returning();
    return result.length > 0;
  } catch (error) {
    console.error('Error deleting entry:', error);
    return false;
  }
}

export async function findEntryById(entryId: string): Promise<Entry | null> {
  try {
    const result = await db.select().from(entries).where(eq(entries.id, entryId)).limit(1);
    if (result.length === 0) return null;
    
    const entry = result[0];
    return {
      id: entry.id,
      patientId: entry.patientId,
      entryType: entry.entryType as 'glucose' | 'meal' | 'insulin',
      value: entry.value,
      units: entry.units || undefined,
      medicationBrand: entry.medicationBrand || undefined,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt || new Date(),
    };
  } catch (error) {
    console.error('Error finding entry by ID:', error);
    return null;
  }
}

// Recommendation functions
export async function findRecommendationsByPatientId(patientId: string): Promise<Recommendation[]> {
  try {
    const result = await db.select()
      .from(recommendations)
      .where(eq(recommendations.patientId, patientId))
      .orderBy(desc(recommendations.createdAt));
    
    return result.map(rec => ({
      id: rec.id,
      patientId: rec.patientId,
      prompt: rec.prompt,
      response: rec.response,
      doseUnits: rec.doseUnits || undefined,
      medicationName: rec.medicationName || undefined,
      reasoning: rec.reasoning || undefined,
      safetyNotes: rec.safetyNotes || undefined,
      confidence: rec.confidence as 'high' | 'medium' | 'low' | undefined,
      recommendedMonitoring: rec.recommendedMonitoring || undefined,
      createdAt: rec.createdAt || new Date(),
    }));
  } catch (error) {
    console.error('Error finding recommendations by patient ID:', error);
    return [];
  }
}

export async function createRecommendation(recommendationData: {
  patientId: string;
  prompt: string;
  response: string;
  doseUnits?: number;
  medicationName?: string;
  reasoning?: string;
  safetyNotes?: string;
  confidence?: 'high' | 'medium' | 'low';
  recommendedMonitoring?: string;
}): Promise<Recommendation | null> {
  try {
    const result = await db.insert(recommendations).values(recommendationData).returning();
    if (result.length === 0) return null;
    
    const rec = result[0];
    return {
      id: rec.id,
      patientId: rec.patientId,
      prompt: rec.prompt,
      response: rec.response,
      doseUnits: rec.doseUnits || undefined,
      medicationName: rec.medicationName || undefined,
      reasoning: rec.reasoning || undefined,
      safetyNotes: rec.safetyNotes || undefined,
      confidence: rec.confidence as 'high' | 'medium' | 'low' | undefined,
      recommendedMonitoring: rec.recommendedMonitoring || undefined,
      createdAt: rec.createdAt || new Date(),
    };
  } catch (error) {
    console.error('Error creating recommendation:', error);
    return null;
  }
}

export async function updateRecommendation(recommendationId: string, updates: Partial<{
  prompt: string;
  response: string;
  doseUnits: number;
  medicationName: string;
  reasoning: string;
  safetyNotes: string;
  confidence: 'high' | 'medium' | 'low';
  recommendedMonitoring: string;
}>): Promise<Recommendation | null> {
  try {
    const result = await db.update(recommendations)
      .set(updates)
      .where(eq(recommendations.id, recommendationId))
      .returning();
    
    if (result.length === 0) return null;
    
    const rec = result[0];
    return {
      id: rec.id,
      patientId: rec.patientId,
      prompt: rec.prompt,
      response: rec.response,
      doseUnits: rec.doseUnits || undefined,
      medicationName: rec.medicationName || undefined,
      reasoning: rec.reasoning || undefined,
      safetyNotes: rec.safetyNotes || undefined,
      confidence: rec.confidence as 'high' | 'medium' | 'low' | undefined,
      recommendedMonitoring: rec.recommendedMonitoring || undefined,
      createdAt: rec.createdAt || new Date(),
    };
  } catch (error) {
    console.error('Error updating recommendation:', error);
    return null;
  }
}

export async function deleteRecommendation(recommendationId: string): Promise<boolean> {
  try {
    const result = await db.delete(recommendations).where(eq(recommendations.id, recommendationId)).returning();
    return result.length > 0;
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    return false;
  }
}

// User settings functions
export async function findUserSettings(userId: string): Promise<{ glucoseUnits: string } | null> {
  try {
    const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    if (result.length === 0) return null;
    
    return {
      glucoseUnits: result[0].glucoseUnits,
    };
  } catch (error) {
    console.error('Error finding user settings:', error);
    return null;
  }
}

export async function createUserSettings(userId: string, glucoseUnits: string = 'mg/dL'): Promise<{ glucoseUnits: string } | null> {
  try {
    const result = await db.insert(userSettings).values({ userId, glucoseUnits }).returning();
    if (result.length === 0) return null;
    
    return {
      glucoseUnits: result[0].glucoseUnits,
    };
  } catch (error) {
    console.error('Error creating user settings:', error);
    return null;
  }
}

export async function updateUserSettings(userId: string, glucoseUnits: string): Promise<{ glucoseUnits: string } | null> {
  try {
    const result = await db.update(userSettings)
      .set({ glucoseUnits, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    
    if (result.length === 0) return null;
    
    return {
      glucoseUnits: result[0].glucoseUnits,
    };
  } catch (error) {
    console.error('Error updating user settings:', error);
    return null;
  }
}

export async function findUserSettingsByUserId(userId: string): Promise<{ glucoseUnits: string } | null> {
  return findUserSettings(userId);
}

export async function upsertUserSettings(userId: string, glucoseUnits: string): Promise<{ glucoseUnits: string } | null> {
  try {
    const existingSettings = await findUserSettings(userId);
    
    if (existingSettings) {
      return updateUserSettings(userId, glucoseUnits);
    } else {
      return createUserSettings(userId, glucoseUnits);
    }
  } catch (error) {
    console.error('Error upserting user settings:', error);
    return null;
  }
}

// Helper function
function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}