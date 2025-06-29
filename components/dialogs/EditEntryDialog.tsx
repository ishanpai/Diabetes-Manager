import {
  useEffect,
  useState,
} from 'react';

import {
  EntryForm,
  EntryFormValues,
} from '@/components/EntryForm';
import { useSettings } from '@/hooks/useSettings';
import {
  Entry,
  Medication,
} from '@/types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';

interface EditEntryDialogProps {
  open: boolean;
  onClose: () => void;
  entry: Entry | null;
  patientMedications: Medication[];
  onSuccess: (entry: Entry) => void;
}

export function EditEntryDialog({
  open,
  onClose,
  entry,
  patientMedications,
  onSuccess,
}: EditEntryDialogProps) {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultValues, setDefaultValues] = useState<Partial<EntryFormValues>>({});

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setDefaultValues({
        value: entry.value,
        units: entry.units || '',
        medicationBrand: entry.medicationBrand || '',
        occurredAt: entry.occurredAt instanceof Date 
          ? entry.occurredAt 
          : new Date(entry.occurredAt),
      });
      setError(null);
    }
  }, [entry]);

  const handleSubmit = async (data: EntryFormValues) => {
    if (!entry) return;

    setLoading(true);
    setError(null);

    try {
      let units = data.units;
      if (entry.entryType === 'glucose') {
        units = settings?.glucoseUnits || 'mg/dL';
      }
      const response = await fetch(`/api/entries/${entry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryType: entry.entryType,
          value: data.value,
          units,
          medicationBrand: entry.entryType === 'insulin' ? data.medicationBrand : undefined,
          occurredAt: data.occurredAt.toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update entry');
      }

      if (result.success) {
        onSuccess(result.data);
        onClose();
      } else {
        throw new Error(result.error || 'Failed to update entry');
      }
    } catch (err) {
      console.error('Error updating entry:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!entry || !confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/entries/${entry.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }

      // Call onSuccess with a deleted flag or handle deletion differently
      onSuccess({ ...entry, value: 'DELETED' } as Entry);
      onClose();
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!entry) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Edit {entry.entryType.charAt(0).toUpperCase() + entry.entryType.slice(1)} Entry
      </DialogTitle>
      <DialogContent>
        <EntryForm
          entryType={entry.entryType}
          patientId={entry.patientId}
          patientMedications={patientMedications}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={onClose}
          onDelete={handleDelete}
          loading={loading}
          error={error}
          submitButtonText="Update Entry"
          showDeleteButton={true}
          deleteButtonText="Delete Entry"
        />
      </DialogContent>
    </Dialog>
  );
} 