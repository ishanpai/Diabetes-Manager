import { calculateAge } from '@/lib/dateUtils';
import {
  Entry,
  Patient,
  PatientWithStats,
} from '@/types';

export function getGlucoseStatus(value: number): 'low' | 'normal' | 'high' {
  if (value < 70) return 'low';
  if (value > 180) return 'high';
  return 'normal';
}

export function getGlucoseStatusColor(status: 'low' | 'normal' | 'high'): 'error' | 'success' | 'warning' {
  switch (status) {
    case 'low':
      return 'error';
    case 'high':
      return 'warning';
    case 'normal':
      return 'success';
    default:
      return 'success';
  }
}

export function getDiabetesTypeColor(type: string): 'primary' | 'secondary' | 'info' | 'default' | 'error' | 'warning' | 'success' {
  return 'default';
}

export function formatPatientName(patient: Patient | PatientWithStats): string {
  return patient.name;
}

export function formatPatientAge(patient: Patient | PatientWithStats): string {
  const patientAge = patient.age || calculateAge(patient.dob);
  return `${patientAge} years old`;
}

export function formatPatientInfo(patient: Patient | PatientWithStats): string {
  const patientAge = patient.age || calculateAge(patient.dob);
  return `${patientAge} years old • ${patient.diabetesType}`;
}

export function getPatientActivityLevel(patient: Patient | PatientWithStats): string {
  return patient.activityLevel || 'Not specified';
}

export function getPatientLifestyle(patient: Patient | PatientWithStats): string {
  return patient.lifestyle || 'Not specified';
}

export function getMedicationCount(patient: Patient | PatientWithStats): number {
  return patient.usualMedications.length;
}

export function formatMedications(patient: Patient | PatientWithStats): string {
  if (patient.usualMedications.length === 0) {
    return 'No medications';
  }
  
  if (patient.usualMedications.length === 1) {
    const med = patient.usualMedications[0];
    return `${med.brand} ${med.dosage}`;
  }
  
  return `${patient.usualMedications.length} medications`;
}

export function hasSufficientHistoryForRecommendations(entries: Entry[]): boolean {
  if (entries.length === 0) return false;
  
  // Check if we have entries from at least 1 day ago
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  // Check if any entry is from at least 1 day ago
  const hasHistoricalData = entries.some(entry => {
    const entryDate = new Date(entry.occurredAt);
    return entryDate < oneDayAgo;
  });
  
  // Also require at least 3 total entries for better context
  return hasHistoricalData && entries.length >= 3;
}

export function getHistoryRequirementStatus(entries: Entry[]): {
  hasSufficientHistory: boolean;
  message: string;
  missingDays: number;
  totalEntries: number;
} {
  const totalEntries = entries.length;
  
  if (totalEntries === 0) {
    return {
      hasSufficientHistory: false,
      message: "No patient history found. Please add at least 1 day of glucose readings, meals, and insulin doses before getting recommendations.",
      missingDays: 1,
      totalEntries: 0
    };
  }
  
  if (totalEntries < 3) {
    return {
      hasSufficientHistory: false,
      message: `Only ${totalEntries} entries found. Please add at least 3 entries (glucose, meals, insulin) over at least 1 day before getting recommendations.`,
      missingDays: 1,
      totalEntries
    };
  }
  
  // Check if we have entries from at least 1 day ago
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const hasHistoricalData = entries.some(entry => {
    const entryDate = new Date(entry.occurredAt);
    return entryDate < oneDayAgo;
  });
  
  if (!hasHistoricalData) {
    return {
      hasSufficientHistory: false,
      message: "All entries are from today. Please add entries from at least 1 day ago to provide better context for recommendations.",
      missingDays: 1,
      totalEntries
    };
  }
  
  return {
    hasSufficientHistory: true,
    message: "Sufficient history available for recommendations.",
    missingDays: 0,
    totalEntries
  };
} 