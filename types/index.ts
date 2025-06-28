// Core types for the Diabetes Workflow Companion application

// User types
export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

// Medication types
export interface Medication {
  brand: string;
  dosage: string;
  timing?: string; // Free text timing description
}

// Patient types
export interface Patient {
  id: string;
  name: string;
  dob: Date;
  diabetesType: string;
  lifestyle?: string;
  activityLevel?: 'Low' | 'Moderate' | 'High';
  usualMedications: Medication[];
  createdAt: Date;
  updatedAt: Date;
  age: number;
}

// Patient with additional stats for dashboard
export interface PatientWithStats extends Patient {
  lastGlucoseReading?: {
    value: number;
    occurredAt: Date;
    status: 'low' | 'normal' | 'high';
  };
  recentEntries: number;
  lastEntryDate?: Date;
}

// Patient with entries for detailed view
export interface PatientWithEntries extends PatientWithStats {
  entries: Entry[];
}

// Entry types
export interface Entry {
  id: string;
  patientId: string;
  entryType: 'glucose' | 'meal' | 'insulin';
  value: string;
  units?: string;
  medicationBrand?: string;
  occurredAt: Date;
  createdAt: Date;
}

// Glucose entry specific
export interface GlucoseEntry extends Entry {
  entryType: 'glucose';
  value: string;
  units: 'mg/dL' | 'mmol/L';
}

// Meal entry specific
export interface MealEntry extends Entry {
  entryType: 'meal';
  value: string; // Meal description
}

// Insulin entry specific
export interface InsulinEntry extends Entry {
  entryType: 'insulin';
  value: string; // Dose amount
  units: 'IU';
  medicationBrand: string;
}

// Dashboard data structure
export interface DashboardData {
  totalPatients: number;
  patients: PatientWithStats[];
}

// Patient summary for dashboard
export interface PatientSummary {
  totalPatients: number;
  patients: PatientWithStats[];
}

// Form data types
export interface PatientFormData {
  name: string;
  dob: string; // HTML date input format (YYYY-MM-DD)
  diabetesType: string;
  lifestyle?: string;
  activityLevel?: 'Low' | 'Moderate' | 'High';
  usualMedications: Medication[];
}

export interface EntryFormData {
  patientId: string;
  entryType: 'glucose' | 'meal' | 'insulin';
  value: string;
  units?: string;
  medicationBrand?: string;
  occurredAt: string; // ISO string
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
}

// Glucose status types
export type GlucoseStatus = 'low' | 'normal' | 'high';

// Diabetes type options
export type DiabetesType = 'Type 1' | 'Type 2' | 'Gestational' | 'Other';

// Activity level options
export type ActivityLevel = 'Low' | 'Moderate' | 'High';

// Recommendation types
export interface Recommendation {
  id: string;
  patientId: string;
  prompt: string;
  response: string;
  doseUnits?: number;
  medicationName?: string;
  reasoning?: string;
  safetyNotes?: string;
  confidence?: 'high' | 'medium' | 'low';
  recommendedMonitoring?: string;
  createdAt: Date;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm extends LoginForm {
  name: string;
  confirmPassword: string;
}

export interface PatientForm {
  name: string;
  dob: Date;
  diabetesType: string;
  lifestyle?: string;
  activityLevel?: string;
  usualMedications: Medication[];
}

export interface EntryForm {
  entryType: 'glucose' | 'meal' | 'insulin';
  value: string;
  units?: string;
  medicationBrand?: string;
  occurredAt: Date;
}

// API Response types
export interface AuthResponse {
  user: User;
  token: string;
}

// Chart types
export interface GlucoseDataPoint {
  date: Date;
  value: number;
  entry: Entry;
}

export interface ChartData {
  glucose: GlucoseDataPoint[];
  meals: Entry[];
  insulin: Entry[];
}

// AI Model types
export interface AIRecommendationRequest {
  patientId: string;
  currentGlucose?: number;
  mealDescription?: string;
  recentEntries: Entry[];
}

export interface AIRecommendationResponse {
  doseUnits: number;
  reasoning: string;
  confidence: number;
  warnings?: string[];
}

// Progress states for recommendation flow
export type RecommendationProgress = 
  | 'idle'
  | 'gathering-data'
  | 'building-prompt'
  | 'calling-ai'
  | 'parsing-response'
  | 'complete'
  | 'error';

// Unit types
export type GlucoseUnit = 'mg/dL' | 'mmol/L';
export type InsulinUnit = 'IU';

// Validation schemas
export interface ValidationError {
  field: string;
  message: string;
}

// Store types
export interface AppState {
  user: User | null;
  currentPatient: Patient | null;
  patients: Patient[];
  entries: Entry[];
  recommendations: Recommendation[];
  isLoading: boolean;
  error: string | null;
  recommendationProgress: RecommendationProgress;
  units: {
    glucose: GlucoseUnit;
    insulin: InsulinUnit;
  };
}

// Theme types
export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
}

// Date utility types for API serialization
export interface PatientApiResponse extends Omit<Patient, 'dob' | 'createdAt' | 'updatedAt'> {
  dob: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntryApiResponse extends Omit<Entry, 'occurredAt' | 'createdAt' | 'updatedAt'> {
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
} 