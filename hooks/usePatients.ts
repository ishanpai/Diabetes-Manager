import { useEffect, useState } from 'react';

import { PatientWithStats } from '@/types';
import { logger } from '@/lib/logger';

interface UsePatientsReturn {
  patients: PatientWithStats[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totalPatients: number;
}

export function usePatients(): UsePatientsReturn {
  const [patients, setPatients] = useState<PatientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/patients');

      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Handle both old and new API response formats
        const patientsData = result.data.patients || result.data;
        setPatients(patientsData || []);
      } else {
        throw new Error(result.error || 'Failed to fetch patients');
      }
    } catch (err) {
      logger.error('Error fetching patients:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPatients([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return {
    patients: patients || [],
    loading,
    error,
    refetch: fetchPatients,
    totalPatients: (patients || []).length,
  };
}
