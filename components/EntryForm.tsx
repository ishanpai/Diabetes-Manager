import React from 'react';

import {
  Controller,
  useForm,
} from 'react-hook-form';
import { z } from 'zod';

import { Medication } from '@/types';
import { formatDateTimeForInput } from '@/utils/uiUtils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';

// Form interface for the component
export interface EntryFormValues {
  value: string;
  units?: string;
  medicationBrand?: string;
  occurredAt: Date;
}

interface EntryFormProps {
  entryType: 'glucose' | 'meal' | 'insulin';
  patientMedications?: Medication[];
  defaultValues?: Partial<EntryFormValues>;
  onSubmit: (data: EntryFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
  submitButtonText?: string;
  cancelButtonText?: string;
  showDeleteButton?: boolean;
  onDelete?: () => Promise<void>;
  deleteButtonText?: string;
}

export function EntryForm({
  entryType,
  patientMedications = [],
  defaultValues,
  onSubmit,
  onCancel,
  loading = false,
  error = null,
  submitButtonText = 'Save Entry',
  cancelButtonText = 'Cancel',
  showDeleteButton = false,
  onDelete,
  deleteButtonText = 'Delete',
}: EntryFormProps) {
  // Create validation schema based on entry type
  const getValidationSchema = () => {
    const baseSchema = z.object({
      value: z.string().min(1, 'Value is required'),
      occurredAt: z.preprocess((val) => {
        if (typeof val === 'string') {
          return new Date(val);
        }
        return val;
      }, z.date({
        required_error: "Date and time is required",
        invalid_type_error: "Invalid date format",
      })),
    });

    switch (entryType) {
      case 'glucose':
        return baseSchema.extend({
          units: z.enum(['mg/dL', 'mmol/L']),
        });
      case 'insulin':
        return baseSchema.extend({
          units: z.literal('IU'),
          medicationBrand: z.string().min(1, 'Medication is required'),
        });
      case 'meal':
      default:
        return baseSchema;
    }
  };

  // Create a key based on defaultValues to force re-render when they change
  const formKey = JSON.stringify(defaultValues || {});

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(getValidationSchema()),
    defaultValues: {
      value: '',
      units: entryType === 'glucose' ? 'mg/dL' : entryType === 'insulin' ? 'IU' : undefined,
      medicationBrand: '',
      occurredAt: new Date(),
      ...defaultValues,
    },
  });

  // Reset form when defaultValues change
  React.useEffect(() => {
    if (defaultValues) {
      reset({
        value: '',
        units: entryType === 'glucose' ? 'mg/dL' : entryType === 'insulin' ? 'IU' : undefined,
        medicationBrand: '',
        occurredAt: new Date(),
        ...defaultValues,
      });
    }
  }, [defaultValues, entryType, reset]);

  const handleFormSubmit = async (data: EntryFormValues) => {
    await onSubmit(data);
  };

  const getValueLabel = () => {
    switch (entryType) {
      case 'glucose':
        return 'Glucose Value';
      case 'meal':
        return 'Meal Description';
      case 'insulin':
        return 'Insulin Dose (IU)';
      default:
        return 'Value';
    }
  };

  const getValuePlaceholder = () => {
    switch (entryType) {
      case 'glucose':
        return 'e.g., 120';
      case 'meal':
        return 'e.g., Breakfast: 2 slices toast, 1 egg, coffee';
      case 'insulin':
        return 'e.g., 8';
      default:
        return '';
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} key={formKey}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 1 }}>
        {/* Glucose Units */}
        {entryType === 'glucose' && (
          <Controller
            name="units"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Units</InputLabel>
                <Select {...field} label="Units">
                  <MenuItem value="mg/dL">mg/dL</MenuItem>
                  <MenuItem value="mmol/L">mmol/L</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        )}

        {/* Insulin Units */}
        {entryType === 'insulin' && (
          <Controller
            name="units"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Units</InputLabel>
                <Select {...field} label="Units">
                  <MenuItem value="IU">IU</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        )}

        {/* Value Field */}
        <Controller
          name="value"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={getValueLabel()}
              placeholder={getValuePlaceholder()}
              fullWidth
              error={!!errors.value}
              helperText={errors.value?.message}
              type={entryType === 'glucose' || entryType === 'insulin' ? 'number' : 'text'}
              inputProps={
                entryType === 'glucose'
                  ? { min: 40, max: 600 }
                  : entryType === 'insulin'
                  ? { min: 0, max: 50, step: 0.5 }
                  : {}
              }
            />
          )}
        />

        {/* Medication Selection for Insulin */}
        {entryType === 'insulin' && (
          <Controller
            name="medicationBrand"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Medication</InputLabel>
                <Select {...field} label="Medication" error={!!errors.medicationBrand}>
                  {Array.from(new Set(patientMedications.map(med => med.brand))).map((brand) => (
                    <MenuItem key={brand} value={brand}>
                      {brand}
                    </MenuItem>
                  ))}
                </Select>
                {errors.medicationBrand && (
                  <Typography variant="caption" color="error">
                    {errors.medicationBrand.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />
        )}

        {/* Native Date/Time Picker - Uses Local Timezone */}
        <Controller
          name="occurredAt"
          control={control}
          render={({ field }) => (
            <TextField
              label="Date & Time (Local Timezone)"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!errors.occurredAt}
              helperText={errors.occurredAt?.message || "Uses your local timezone"}
              value={field.value ? formatDateTimeForInput(field.value) : ''}
              onChange={e => {
                // Convert the input value to a Date object in local timezone
                const inputValue = e.target.value;
                if (inputValue) {
                  const date = new Date(inputValue);
                  field.onChange(date);
                }
              }}
            />
          )}
        />
      </Box>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="space-between" mt={4}>
        {showDeleteButton && onDelete && (
          <Button 
            onClick={onDelete} 
            color="error" 
            variant="outlined"
            disabled={loading}
          >
            {deleteButtonText}
          </Button>
        )}
        
        <Box display="flex" gap={2} ml="auto">
          <Button onClick={onCancel} disabled={loading}>
            {cancelButtonText}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Saving...' : submitButtonText}
          </Button>
        </Box>
      </Box>
    </form>
  );
} 