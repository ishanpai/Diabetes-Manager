import { useState } from 'react';

import { useRouter } from 'next/router';

import { PatientForm } from '@/components/PatientForm';
import { useAuth } from '@/hooks/useAuth';
import { PatientFormData } from '@/types';

export default function NewPatient() {
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return null; // Let the layout handle loading
  }

  const handleSubmit = async (formData: PatientFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Convert form data to API format
      const apiData = {
        ...formData,
        dob: new Date(formData.dob), // Convert string to Date
      };

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create patient');
      }

      if (result.success) {
        // Redirect to the new patient's page
        router.push(`/patients/${result.data.id}`);
      } else {
        throw new Error(result.error || 'Failed to create patient');
      }
    } catch (err) {
      console.error('Error creating patient:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <PatientForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      loading={loading}
      error={error}
      title="Add New Patient"
      subtitle="Enter patient information to get started"
      submitButtonText="Save Patient"
    />
  );
} 