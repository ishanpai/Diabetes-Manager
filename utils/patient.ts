import {
  Medication,
  Patient,
} from '@/types';
import { logger } from '@/lib/logger';

type RawPatient = Patient & {
  usualMedications?: string | Medication[];
};

export interface PatientWithParsedMedications extends Omit<Patient, 'usualMedications'> {
  usualMedications: Medication[];
}

/**
 * Parses the usualMedications JSON string from the database into an array
 * This function handles the conversion from SQLite's string storage to the frontend array format
 * Also trims medication fields to clean up any trailing whitespace
 */
export function parsePatientMedications(patient: RawPatient): PatientWithParsedMedications {
  let medications: Medication[] = [];
  
  if (typeof patient.usualMedications === 'string') {
    try {
      medications = JSON.parse(patient.usualMedications || '[]');
      // Trim medication fields to clean up any trailing whitespace
      medications = medications.map(med => ({
        brand: med.brand?.trim() || '',
        dosage: med.dosage?.trim() || '',
        timing: med.timing?.trim() || '',
      }));
    } catch (error) {
      logger.error('Error parsing patient medications:', error);
      medications = [];
    }
  } else if (Array.isArray(patient.usualMedications)) {
    medications = patient.usualMedications.map(med => ({
      brand: med.brand?.trim() || '',
      dosage: med.dosage?.trim() || '',
      timing: med.timing?.trim() || '',
    }));
  }
  
  return {
    ...patient,
    usualMedications: medications
  };
}

/**
 * Parses medications for multiple patients
 */
export function parsePatientsMedications(patients: RawPatient[]): PatientWithParsedMedications[] {
  return patients.map(parsePatientMedications);
}
