import {
  useEffect,
  useState,
} from 'react';

import { PatientWithEntries } from '@/types';

interface UsePatientReturn {
  patient: PatientWithEntries | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updatePatient: (data: Partial<PatientWithEntries>) => Promise<void>;
  deletePatient: () => Promise<void>;
}

export function usePatient(patientId: string): UsePatientReturn {
  const [patient, setPatient] = useState<PatientWithEntries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatient = async () => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/patients/${patientId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Patient not found');
        }
        throw new Error('Failed to fetch patient');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPatient(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch patient');
      }
    } catch (err) {
      console.error('Error fetching patient:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updatePatient = async (data: Partial<PatientWithEntries>) => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update patient');
      }

      const result = await response.json();
      
      if (result.success) {
        setPatient(result.data);
      } else {
        throw new Error(result.error || 'Failed to update patient');
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePatient = async () => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete patient');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete patient');
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  return {
    patient,
    loading,
    error,
    refetch: fetchPatient,
    updatePatient,
    deletePatient,
  };
} 