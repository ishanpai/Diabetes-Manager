import React, {
  useEffect,
  useState,
} from 'react';

import {
  Controller,
  useForm,
} from 'react-hook-form';
import { z } from 'zod';

import { useSettings } from '@/hooks/useSettings';
import { Medication } from '@/types';
import { formatDateTimeForInput } from '@/utils/uiUtils';
import { zodResolver } from '@hookform/resolvers/zod';
import HistoryIcon from '@mui/icons-material/History';
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
  patientId?: string;
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

interface PastMeal {
  id: string;
  value: string;
  occurredAt: string;
  date: string;
  time: string;
  timeDiff: number; // minutes difference from entered time
}

export function EntryForm({
  entryType,
  patientId,
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
  const { settings, loading: settingsLoading } = useSettings();
  const [fetchingPreviousMeals, setFetchingPreviousMeals] = useState(false);
  const [pastMeals, setPastMeals] = useState<PastMeal[]>([]);
  const [selectedPastMeal, setSelectedPastMeal] = useState<string>('');
  
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

  // Create a key based on defaultValues and settings to force re-render when they change
  const formKey = JSON.stringify({ defaultValues, settings });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(getValidationSchema()),
    defaultValues: {
      value: '',
      units: entryType === 'glucose' ? (settings?.glucoseUnits || 'mg/dL') : entryType === 'insulin' ? 'IU' : undefined,
      medicationBrand: '',
      occurredAt: new Date(),
      ...defaultValues,
    },
  });

  // Watch the occurredAt field to refetch meals when time changes
  const watchedOccurredAt = watch('occurredAt');

  // Reset form when defaultValues or settings change
  React.useEffect(() => {
      reset({
      value: defaultValues?.value || '',
      units: entryType === 'glucose' ? (settings?.glucoseUnits || 'mg/dL') : entryType === 'insulin' ? 'IU' : defaultValues?.units,
      medicationBrand: defaultValues?.medicationBrand || '',
      occurredAt: defaultValues?.occurredAt || new Date(),
      });
  }, [defaultValues, entryType, reset, settings?.glucoseUnits]);

  // Fetch past meals when the time changes
  useEffect(() => {
    if (entryType === 'meal' && patientId && watchedOccurredAt) {
      fetchPastMeals();
    }
  }, [entryType, patientId, watchedOccurredAt]);

  const handleFormSubmit = async (data: EntryFormValues) => {
    await onSubmit(data);
  };

  const fetchPastMeals = async () => {
    if (!patientId || !watchedOccurredAt) return;
    
    setFetchingPreviousMeals(true);
    try {
      // Get the time from the form
      const enteredTime = new Date(watchedOccurredAt);
      const enteredTimeMinutes = enteredTime.getHours() * 60 + enteredTime.getMinutes();
      
      // Fetch meals from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const response = await fetch(`/api/entries?patientId=${patientId}&entryType=meal&startDate=${thirtyDaysAgo.toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          // Process and sort meals by relevance to entered time
          const processedMeals: PastMeal[] = result.data.map((meal: any) => {
            const mealDate = new Date(meal.occurredAt);
            const mealTimeMinutes = mealDate.getHours() * 60 + mealDate.getMinutes();
            const timeDiff = Math.abs(mealTimeMinutes - enteredTimeMinutes);
            
            return {
              id: meal.id,
              value: meal.value,
              occurredAt: meal.occurredAt,
              date: mealDate.toLocaleDateString(),
              time: mealDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timeDiff,
            };
          });
          
          // Sort by time difference (closest first), then by date (most recent first)
          processedMeals.sort((a, b) => {
            if (a.timeDiff !== b.timeDiff) {
              return a.timeDiff - b.timeDiff;
            }
            return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
          });
          
          // Limit to top 10 most relevant meals
          setPastMeals(processedMeals.slice(0, 10));
        } else {
          setPastMeals([]);
        }
      }
    } catch (error) {
      console.error('Error fetching past meals:', error);
      setPastMeals([]);
    } finally {
      setFetchingPreviousMeals(false);
    }
  };

  const handlePastMealSelect = (mealId: string) => {
    setSelectedPastMeal(mealId);
    const selectedMeal = pastMeals.find(meal => meal.id === mealId);
    if (selectedMeal) {
      setValue('value', selectedMeal.value);
    }
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

      {/* Show loading spinner while settings are loading */}
      {settingsLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      )}

      {/* Only show form when settings are loaded */}
      {!settingsLoading && (
      <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 1 }}>
          {/* Glucose Units - Dropdown with options */}
        {entryType === 'glucose' && (
          <Controller
            name="units"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Units</InputLabel>
                <Select {...field} label="Units" disabled>
                  <MenuItem value="mg/dL">mg/dL</MenuItem>
                  <MenuItem value="mmol/L">mmol/L</MenuItem>
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Units are set in your <a href="/settings" style={{ color: 'inherit', textDecoration: 'underline' }}>settings</a>
                </Typography>
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
              <Box>
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
                {/* Past Meals Dropdown - Only for meal entries */}
                {entryType === 'meal' && patientId && (
                  <Box mt={1}>
                    <FormControl fullWidth>
                      <InputLabel>
                        {fetchingPreviousMeals ? 'Loading past meals...' : 'Choose from past meals'}
                      </InputLabel>
                      <Select
                        value={selectedPastMeal}
                        onChange={(e) => handlePastMealSelect(e.target.value)}
                        label={fetchingPreviousMeals ? 'Loading past meals...' : 'Choose from past meals'}
                        disabled={fetchingPreviousMeals || pastMeals.length === 0}
                        startAdornment={fetchingPreviousMeals ? <CircularProgress size={16} /> : <HistoryIcon />}
                      >
                        {pastMeals.length === 0 && !fetchingPreviousMeals && (
                          <MenuItem disabled>No past meals found</MenuItem>
                        )}
                        {pastMeals.map((meal) => (
                          <MenuItem key={meal.id} value={meal.id}>
                            <Box>
                              <Typography variant="body2">{meal.value}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {meal.date} at {meal.time} 
                                {meal.timeDiff > 0 && ` (${meal.timeDiff} min ${meal.timeDiff === 1 ? 'difference' : 'difference'})`}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {pastMeals.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          Showing meals closest to the time you entered
                        </Typography>
                      )}
                    </FormControl>
                  </Box>
                )}
              </Box>
          )}
        />

        {/* Medication Selection for Insulin */}
        {entryType === 'insulin' && (
          <Controller
            name="medicationBrand"
            control={control}
              render={({ field }) => {
                // Deduplicate medications by trimming whitespace and removing duplicates
                const uniqueMedications = Array.from(
                  new Set(
                    patientMedications
                      .map(med => med.brand.trim())
                      .filter(brand => brand.length > 0)
                  )
                ).sort();

                return (
              <FormControl fullWidth>
                <InputLabel>Medication</InputLabel>
                <Select {...field} label="Medication" error={!!errors.medicationBrand}>
                      {uniqueMedications.map((brand) => (
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
                );
              }}
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
      )}

      {/* Action Buttons */}
      <Box display="flex" justifyContent="space-between" mt={4}>
        {showDeleteButton && onDelete && (
          <Button 
            onClick={onDelete} 
            color="error" 
            variant="outlined"
            disabled={loading || settingsLoading}
          >
            {deleteButtonText}
          </Button>
        )}
        
        <Box display="flex" gap={2} ml="auto">
          <Button onClick={onCancel} disabled={loading || settingsLoading}>
            {cancelButtonText}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || settingsLoading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Saving...' : submitButtonText}
          </Button>
        </Box>
      </Box>
    </form>
  );
} 