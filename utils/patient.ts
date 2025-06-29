import {
  Medication,
  Patient,
} from '@/types';

export interface PatientWithParsedMedications extends Omit<Patient, 'usualMedications'> {
  usualMedications: Medication[];
}

/**
 * Parses the usualMedications JSON string from the database into an array
 * This function handles the conversion from SQLite's string storage to the frontend array format
 * Also trims medication fields to clean up any trailing whitespace
 */
export function parsePatientMedications(patient: any): PatientWithParsedMedications {
  let medications: Medication[] = [];
  
  if (patient.usualMedications) {
    try {
      medications = JSON.parse(patient.usualMedications);
      // Trim medication fields to clean up any trailing whitespace
      medications = medications.map(med => ({
        brand: med.brand?.trim() || '',
        dosage: med.dosage?.trim() || '',
        timing: med.timing?.trim() || '',
      }));
    } catch (error) {
      console.error('Error parsing patient medications:', error);
      medications = [];
    }
  }
  
  return {
    ...patient,
    usualMedications: medications
  };
}

/**
 * Parses medications for multiple patients
 */
export function parsePatientsMedications(patients: any[]): PatientWithParsedMedications[] {
  return patients.map(parsePatientMedications);
}