import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';

// Database types
export interface User {
  id: string;
  name?: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  glucoseUnits: 'mg/dL' | 'mmol/L';
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

export interface Patient {
  id: string;
  name: string;
  dob: Date;
  diabetesType: string;
  lifestyle?: string;
  activityLevel?: string;
  usualMedications: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface Entry {
  id: string;
  patientId: string;
  entryType: string;
  value: string;
  units?: string;
  medicationBrand?: string;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Recommendation {
  id: string;
  patientId: string;
  prompt: string;
  response: string;
  doseUnits?: number;
  medicationName?: string;
  reasoning?: string;
  safetyNotes?: string;
  confidence?: string;
  recommendedMonitoring?: string;
  targetTime?: Date;
  createdAt: Date;
}

// Database singleton
let db: Database.Database | undefined;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'data', 'diabetes.db');
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables if they don't exist
    initializeTables();
  }
  return db;
}

function initializeTables() {
  const database = getDatabase();
  
  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      emailVerified DATETIME,
      image TEXT,
      password TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Accounts table
  database.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(provider, providerAccountId)
    )
  `);

  // Sessions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      sessionToken TEXT UNIQUE NOT NULL,
      userId TEXT NOT NULL,
      expires DATETIME NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Verification tokens table
  database.exec(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires DATETIME NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `);

  // Patients table
  database.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dob DATETIME NOT NULL,
      diabetesType TEXT NOT NULL,
      lifestyle TEXT,
      activityLevel TEXT,
      usualMedications TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      userId TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Entries table
  database.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      entryType TEXT NOT NULL,
      value TEXT NOT NULL,
      units TEXT,
      medicationBrand TEXT,
      occurredAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // Recommendations table
  database.exec(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      doseUnits INTEGER,
      medicationName TEXT,
      reasoning TEXT,
      safetyNotes TEXT,
      confidence TEXT,
      recommendedMonitoring TEXT,
      targetTime DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // User settings table
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      glucoseUnits TEXT NOT NULL DEFAULT 'mg/dL',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(userId)
    )
  `);

  // Migration: Add medicationName column to existing recommendations table if it doesn't exist
  try {
    database.exec(`ALTER TABLE recommendations ADD COLUMN medicationName TEXT`);
    console.log('Added medicationName column to recommendations table');
  } catch (error) {
    // Column already exists, ignore the error
    console.log('medicationName column already exists in recommendations table');
  }
}

function generateId(prefix: string): string {
  return `${prefix}${randomUUID()}`;
}

// User functions
export function findUserByEmail(email: string): User | undefined {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM users WHERE email = ?');
  const user = stmt.get(email) as User | undefined;
  return user ? { ...user, createdAt: new Date(user.createdAt), updatedAt: new Date(user.updatedAt) } : undefined;
}

export function findUserById(id: string): User | undefined {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(id) as User | undefined;
  return user ? { ...user, createdAt: new Date(user.createdAt), updatedAt: new Date(user.updatedAt) } : undefined;
}

export function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
  const database = getDatabase();
  const id = generateId('usr_');
  const now = new Date();
  
  const stmt = database.prepare(`
    INSERT INTO users (id, name, email, emailVerified, image, password, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Convert undefined values to null for SQLite compatibility
  const name = userData.name ?? null;
  const emailVerified = userData.emailVerified ? 
    (userData.emailVerified instanceof Date ? userData.emailVerified.toISOString() : new Date(userData.emailVerified).toISOString()) 
    : null;
  const image = userData.image ?? null;
  const password = userData.password ?? null;
  
  stmt.run(id, name, userData.email, emailVerified, image, password, now.toISOString(), now.toISOString());
  
  return {
    id,
    ...userData,
    createdAt: now,
    updatedAt: now
  };
}

// Account functions
export function createAccount(accountData: Omit<Account, 'id'>): Account {
  const database = getDatabase();
  const id = generateId('acc_');
  
  const stmt = database.prepare(`
    INSERT INTO accounts (id, userId, type, provider, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Convert undefined values to null for SQLite compatibility
  const refresh_token = accountData.refresh_token ?? null;
  const access_token = accountData.access_token ?? null;
  const expires_at = accountData.expires_at ?? null;
  const token_type = accountData.token_type ?? null;
  const scope = accountData.scope ?? null;
  const id_token = accountData.id_token ?? null;
  const session_state = accountData.session_state ?? null;
  
  stmt.run(id, accountData.userId, accountData.type, accountData.provider, accountData.providerAccountId,
    refresh_token, access_token, expires_at, token_type, scope, id_token, session_state);
  
  return { id, ...accountData };
}

export function findAccountByProvider(provider: string, providerAccountId: string): Account | undefined {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM accounts WHERE provider = ? AND providerAccountId = ?');
  return stmt.get(provider, providerAccountId) as Account | undefined;
}

// Session functions
export function createSession(sessionData: Omit<Session, 'id'>): Session {
  const database = getDatabase();
  const id = generateId('ses_');
  
  const stmt = database.prepare(`
    INSERT INTO sessions (id, sessionToken, userId, expires)
    VALUES (?, ?, ?, ?)
  `);
  
  // Convert date to ISO string for SQLite compatibility
  const expires = sessionData.expires instanceof Date ? sessionData.expires.toISOString() : new Date(sessionData.expires).toISOString();
  
  stmt.run(id, sessionData.sessionToken, sessionData.userId, expires);
  
  return { id, ...sessionData };
}

export function findSessionByToken(sessionToken: string): Session | undefined {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM sessions WHERE sessionToken = ?');
  const session = stmt.get(sessionToken) as Session | undefined;
  return session ? { ...session, expires: new Date(session.expires) } : undefined;
}

export function deleteSession(sessionToken: string): void {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM sessions WHERE sessionToken = ?');
  stmt.run(sessionToken);
}

// Patient functions
export function findPatientsByUserId(userId: string): Patient[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM patients 
    WHERE userId = ? 
    ORDER BY updatedAt DESC
  `);
  const patients = stmt.all(userId) as Patient[];
  return patients.map(p => ({ ...p, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt), dob: new Date(p.dob) }));
}

export function findPatientById(id: string): Patient | undefined {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM patients WHERE id = ?');
  const patient = stmt.get(id) as Patient | undefined;
  return patient ? { ...patient, createdAt: new Date(patient.createdAt), updatedAt: new Date(patient.updatedAt), dob: new Date(patient.dob) } : undefined;
}

export function createPatient(patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Patient {
  const database = getDatabase();
  const id = generateId('pat_');
  const now = new Date();
  
  const stmt = database.prepare(`
    INSERT INTO patients (id, name, dob, diabetesType, lifestyle, activityLevel, usualMedications, userId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Convert undefined values to null for SQLite compatibility
  const lifestyle = patientData.lifestyle ?? null;
  const activityLevel = patientData.activityLevel ?? null;
  
  // Convert dates to ISO strings for SQLite
  const dob = patientData.dob instanceof Date ? patientData.dob.toISOString() : new Date(patientData.dob).toISOString();
  
  stmt.run(id, patientData.name, dob, patientData.diabetesType, lifestyle,
    activityLevel, patientData.usualMedications, patientData.userId, now.toISOString(), now.toISOString());
  
  return {
    id,
    ...patientData,
    createdAt: now,
    updatedAt: now
  };
}

export function updatePatient(id: string, patientData: Partial<Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>>): Patient | undefined {
  const database = getDatabase();
  const now = new Date();
  
  const stmt = database.prepare(`
    UPDATE patients 
    SET name = COALESCE(?, name), dob = COALESCE(?, dob), diabetesType = COALESCE(?, diabetesType),
        lifestyle = COALESCE(?, lifestyle), activityLevel = COALESCE(?, activityLevel),
        usualMedications = COALESCE(?, usualMedications), updatedAt = ?
    WHERE id = ?
  `);
  
  // Convert undefined values to null for SQLite compatibility
  const name = patientData.name ?? null;
  const dob = patientData.dob 
    ? (patientData.dob instanceof Date ? patientData.dob.toISOString() : new Date(patientData.dob).toISOString())
    : null;
  const diabetesType = patientData.diabetesType ?? null;
  const lifestyle = patientData.lifestyle ?? null;
  const activityLevel = patientData.activityLevel ?? null;
  const usualMedications = patientData.usualMedications ?? null;
  
  const result = stmt.run(name, dob, diabetesType, lifestyle, activityLevel, usualMedications, now.toISOString(), id);
  
  if (result.changes > 0) {
    return findPatientById(id);
  }
  return undefined;
}

export function deletePatient(id: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM patients WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Entry functions
export function findEntriesByPatientId(patientId: string, limit = 10, offset = 0): Entry[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM entries 
    WHERE patientId = ? 
    ORDER BY updatedAt DESC
    LIMIT ? OFFSET ?
  `);
  const entries = stmt.all(patientId, limit, offset) as Entry[];
  return entries.map(e => ({ ...e, occurredAt: new Date(e.occurredAt), createdAt: new Date(e.createdAt), updatedAt: new Date(e.updatedAt) }));
}

export function findEntryById(id: string): Entry | undefined {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM entries WHERE id = ?');
  const entry = stmt.get(id) as Entry | undefined;
  return entry ? { ...entry, occurredAt: new Date(entry.occurredAt), createdAt: new Date(entry.createdAt), updatedAt: new Date(entry.updatedAt) } : undefined;
}

export function createEntry(entryData: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>): Entry {
  const database = getDatabase();
  const id = generateId('ent_');
  const now = new Date();
  
  const stmt = database.prepare(`
    INSERT INTO entries (id, patientId, entryType, value, units, medicationBrand, occurredAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Convert undefined values to null for SQLite compatibility
  const units = entryData.units ?? null;
  const medicationBrand = entryData.medicationBrand ?? null;
  
  // Convert dates to ISO strings for SQLite
  const occurredAt = entryData.occurredAt instanceof Date ? entryData.occurredAt.toISOString() : new Date(entryData.occurredAt).toISOString();
  
  stmt.run(id, entryData.patientId, entryData.entryType, entryData.value, units, medicationBrand, occurredAt, now.toISOString(), now.toISOString());
  
  return {
    id,
    ...entryData,
    createdAt: now,
    updatedAt: now
  };
}

export function updateEntry(id: string, entryData: Partial<Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>>): Entry | undefined {
  const database = getDatabase();
  const now = new Date();
  
  const stmt = database.prepare(`
    UPDATE entries 
    SET patientId = COALESCE(?, patientId), entryType = COALESCE(?, entryType), value = COALESCE(?, value),
        units = COALESCE(?, units), medicationBrand = COALESCE(?, medicationBrand), occurredAt = COALESCE(?, occurredAt),
        updatedAt = ?
    WHERE id = ?
  `);
  
  // Convert undefined values to null for SQLite compatibility
  const patientId = entryData.patientId ?? null;
  const entryType = entryData.entryType ?? null;
  const value = entryData.value ?? null;
  const units = entryData.units ?? null;
  const medicationBrand = entryData.medicationBrand ?? null;
  const occurredAt = entryData.occurredAt 
    ? (entryData.occurredAt instanceof Date ? entryData.occurredAt.toISOString() : new Date(entryData.occurredAt).toISOString())
    : null;
  
  const result = stmt.run(patientId, entryType, value, units, medicationBrand, occurredAt, now.toISOString(), id);
  
  if (result.changes > 0) {
    return findEntryById(id);
  }
  return undefined;
}

export function deleteEntry(id: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM entries WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Recommendation functions
export function findRecommendationsByPatientId(patientId: string, limit = 10, offset = 0): Recommendation[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM recommendations 
    WHERE patientId = ? 
    ORDER BY updatedAt DESC
    LIMIT ? OFFSET ?
  `);
  const recommendations = stmt.all(patientId, limit, offset) as Recommendation[];
  return recommendations.map(r => ({ ...r, createdAt: new Date(r.createdAt) }));
}

export function findRecommendationById(id: string): Recommendation | undefined {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM recommendations WHERE id = ?');
  const recommendation = stmt.get(id) as Recommendation | undefined;
  return recommendation ? { ...recommendation, createdAt: new Date(recommendation.createdAt) } : undefined;
}

export function createRecommendation(recommendationData: Omit<Recommendation, 'id' | 'createdAt'>): Recommendation {
  const database = getDatabase();
  const id = generateId('rec_');
  const now = new Date();
  
  const stmt = database.prepare(`
    INSERT INTO recommendations (id, patientId, prompt, response, doseUnits, medicationName, reasoning, safetyNotes, confidence, recommendedMonitoring, targetTime, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Convert undefined values to null for SQLite compatibility
  const doseUnits = recommendationData.doseUnits ?? null;
  const medicationName = recommendationData.medicationName ?? null;
  const reasoning = recommendationData.reasoning ?? null;
  const safetyNotes = recommendationData.safetyNotes ?? null;
  const confidence = recommendationData.confidence ?? null;
  const recommendedMonitoring = recommendationData.recommendedMonitoring ?? null;
  const targetTime = recommendationData.targetTime
    ? (recommendationData.targetTime instanceof Date
        ? recommendationData.targetTime.toISOString()
        : new Date(recommendationData.targetTime).toISOString())
    : null;
  
  stmt.run(id, recommendationData.patientId, recommendationData.prompt, recommendationData.response, doseUnits, medicationName, reasoning, safetyNotes, confidence, recommendedMonitoring, targetTime, now.toISOString());
  
  return {
    id,
    ...recommendationData,
    createdAt: now
  };
}

export function updateRecommendation(id: string, recommendationData: Partial<Omit<Recommendation, 'id' | 'createdAt'>>): Recommendation | undefined {
  const database = getDatabase();
  const now = new Date();
  
  const stmt = database.prepare(`
    UPDATE recommendations 
    SET patientId = COALESCE(?, patientId), prompt = COALESCE(?, prompt), response = COALESCE(?, response),
        doseUnits = COALESCE(?, doseUnits), medicationName = COALESCE(?, medicationName), reasoning = COALESCE(?, reasoning),
        safetyNotes = COALESCE(?, safetyNotes), confidence = COALESCE(?, confidence), recommendedMonitoring = COALESCE(?, recommendedMonitoring),
        targetTime = COALESCE(?, targetTime), updatedAt = ?
    WHERE id = ?
  `);
  
  // Convert undefined values to null for SQLite compatibility
  const patientId = recommendationData.patientId ?? null;
  const prompt = recommendationData.prompt ?? null;
  const response = recommendationData.response ?? null;
  const doseUnits = recommendationData.doseUnits ?? null;
  const medicationName = recommendationData.medicationName ?? null;
  const reasoning = recommendationData.reasoning ?? null;
  const safetyNotes = recommendationData.safetyNotes ?? null;
  const confidence = recommendationData.confidence ?? null;
  const recommendedMonitoring = recommendationData.recommendedMonitoring ?? null;
  const targetTime = recommendationData.targetTime
    ? (recommendationData.targetTime instanceof Date
        ? recommendationData.targetTime.toISOString()
        : new Date(recommendationData.targetTime).toISOString())
    : null;
  
  const result = stmt.run(patientId, prompt, response, doseUnits, medicationName, reasoning, safetyNotes, confidence, recommendedMonitoring, targetTime, now.toISOString(), id);
  
  if (result.changes > 0) {
    return findRecommendationById(id);
  }
  return undefined;
}

export function deleteRecommendation(id: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM recommendations WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// User settings functions
export function findUserSettingsByUserId(userId: string): UserSettings | undefined {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM user_settings WHERE userId = ?');
  const settings = stmt.get(userId) as UserSettings | undefined;
  return settings ? { 
    ...settings, 
    createdAt: new Date(settings.createdAt), 
    updatedAt: new Date(settings.updatedAt) 
  } : undefined;
}

export function createUserSettings(settingsData: Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'>): UserSettings {
  const database = getDatabase();
  const id = generateId('set_');
  const now = new Date();
  
  const stmt = database.prepare(`
    INSERT INTO user_settings (id, userId, glucoseUnits, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, settingsData.userId, settingsData.glucoseUnits, now.toISOString(), now.toISOString());
  
  return {
    id,
    ...settingsData,
    createdAt: now,
    updatedAt: now
  };
}

export function updateUserSettings(userId: string, settingsData: Partial<Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): UserSettings | undefined {
  const database = getDatabase();
  const now = new Date();
  
  const stmt = database.prepare(`
    UPDATE user_settings 
    SET glucoseUnits = COALESCE(?, glucoseUnits), updatedAt = ?
    WHERE userId = ?
  `);
  
  // Convert undefined values to null for SQLite compatibility
  const glucoseUnits = settingsData.glucoseUnits ?? null;
  
  const result = stmt.run(glucoseUnits, now.toISOString(), userId);
  
  if (result.changes > 0) {
    return findUserSettingsByUserId(userId);
  }
  return undefined;
}

export function upsertUserSettings(userId: string, settingsData: Partial<Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): UserSettings {
  const existingSettings = findUserSettingsByUserId(userId);
  
  if (existingSettings) {
    const updatedSettings = updateUserSettings(userId, settingsData);
    if (updatedSettings) {
      return updatedSettings;
    }
    // Fallback to existing settings if update failed
    return existingSettings;
  } else {
    return createUserSettings({
      userId,
      glucoseUnits: settingsData.glucoseUnits || 'mg/dL',
    });
  }
}