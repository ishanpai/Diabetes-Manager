import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { PatientForm, PatientFormSubmitData } from '@/components/PatientForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { PatientWithEntries } from '@/types';

export default function EditPatient() {
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientWithEntries | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch patient data
  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchPatient(id);
    }
  }, [id]);

  const fetchPatient = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch patient');
      }

      if (result.success) {
        setPatient(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch patient');
      }
    } catch (err) {
      logger.error('Error fetching patient:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setInitialLoading(false);
    }
  };

  if (authLoading || initialLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (error && !patient) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/')}>Go Home</button>
      </div>
    );
  }

  const handleSubmit = async (formData: PatientFormSubmitData) => {
    if (!id || typeof id !== 'string') {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert form data to API format
      const apiData = {
        ...formData,
        dob: new Date(formData.dob), // Convert string to Date
      };

      const response = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update patient');
      }

      if (result.success) {
        // Redirect to the patient's detail page
        router.push(`/patients/${id}`);
      } else {
        throw new Error(result.error || 'Failed to update patient');
      }
    } catch (err) {
      logger.error('Error updating patient:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (id && typeof id === 'string') {
      router.push(`/patients/${id}`);
    } else {
      router.push('/');
    }
  };

  return (
    <PatientForm
      patient={patient}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      loading={loading}
      error={error}
      title="Edit Patient"
      subtitle="Update patient information"
      submitButtonText="Update Patient"
    />
  );
}
