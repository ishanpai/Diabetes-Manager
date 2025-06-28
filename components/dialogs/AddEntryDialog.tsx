import { useState } from 'react';

import {
  EntryForm,
  EntryFormValues,
} from '@/components/EntryForm';
import { Entry } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';

interface AddEntryDialogProps {
  open: boolean;
  onClose: () => void;
  entryType: 'glucose' | 'meal' | 'insulin';
  patientId: string;
  patientMedications?: Array<{ brand: string; dosage: string; timing?: string }>;
  defaultValues?: any;
  onSuccess?: (entry: Entry) => void;
}

export function AddEntryDialog({
  open,
  onClose,
  entryType,
  patientId,
  patientMedications = [],
  defaultValues,
  onSuccess,
}: AddEntryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDialogTitle = () => {
    switch (entryType) {
      case 'glucose':
        return 'Add Glucose Reading';
      case 'meal':
        return 'Add Meal';
      case 'insulin':
        return 'Add Insulin Dose';
      default:
        return 'Add Entry';
    }
  };

  const handleSubmit = async (data: EntryFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          entryType, // Use the fixed entryType from props
          patientId,
          occurredAt: data.occurredAt.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create entry');
      }

      const result = await response.json();
      onSuccess?.(result.data);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Add {entryType.charAt(0).toUpperCase() + entryType.slice(1)} Entry
      </DialogTitle>
      <DialogContent>
        <EntryForm
          entryType={entryType}
          patientMedications={patientMedications}
          onSubmit={handleSubmit}
          onCancel={onClose}
          loading={loading}
          error={error}
          submitButtonText="Add Entry"
          defaultValues={defaultValues}
        />
      </DialogContent>
    </Dialog>
  );
} 