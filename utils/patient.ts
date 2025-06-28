import {
  Medication,
  Patient,
} from '@/types';

export interface PatientWithParsedMedications extends Omit<Patient, 'usualMedications'> {
  usualMedications: Medication[];
}

/**
 * Parses the usualMedications JSON string from the database into an array
 * This function handles the conversion from Prisma's string storage to the frontend array format
 */
export function parsePatientMedications(patient: any): PatientWithParsedMedications {
  return {
    ...patient,
    usualMedications: patient.usualMedications 
      ? JSON.parse(patient.usualMedications)
      : []
  };
}

/**
 * Parses medications for multiple patients
 */
export function parsePatientsMedications(patients: any[]): PatientWithParsedMedications[] {
  return patients.map(parsePatientMedications);
} 