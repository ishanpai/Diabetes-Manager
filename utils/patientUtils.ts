import {
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
  switch (type) {
    case 'Type 1':
      return 'error';
    case 'Type 2':
      return 'primary';
    case 'Gestational':
      return 'secondary';
    default:
      return 'default';
  }
}

export function formatPatientName(patient: Patient | PatientWithStats): string {
  return patient.name;
}

export function formatPatientAge(patient: Patient | PatientWithStats): string {
  return `${patient.age} years old`;
}

export function formatPatientInfo(patient: Patient | PatientWithStats): string {
  return `${patient.age} years old • ${patient.diabetesType}`;
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