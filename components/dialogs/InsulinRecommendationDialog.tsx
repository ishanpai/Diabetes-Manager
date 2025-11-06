import { useEffect, useState } from 'react';

import { DOSE_DIFFERENCE_WARNING_THRESHOLD, PROGRESS_STEPS } from '@/lib/config';
import { Recommendation, RecommendationProgress } from '@/types';
import type { EntryFormValues } from '@/components/EntryForm';
import { logger } from '@/lib/logger';
import { formatDateTimeForInput } from '@/utils/uiUtils';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';

interface InsulinRecommendationDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onSuccess?: (recommendation: Recommendation) => void;
  onAddEntry?: (entryType: 'insulin', defaultValues: Partial<EntryFormValues>) => void;
}

export function InsulinRecommendationDialog({
  open,
  onClose,
  patientId,
  patientName,
  onSuccess,
  onAddEntry,
}: InsulinRecommendationDialogProps) {
  const [progress, setProgress] = useState<RecommendationProgress>('idle');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [lastDose] = useState<number | null>(null);
  const [targetTime, setTargetTime] = useState<Date>(() => {
    // Default to current time + 5 minutes
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now;
  });

  useEffect(() => {
    if (open) {
      // Reset target time to current time + 5 minutes when dialog opens
      const now = new Date();
      now.setMinutes(now.getMinutes() + 5);
      setTargetTime(now);
      setProgress('idle');
      setError(null);
      setRecommendation(null);
      setShowWarning(false);
    }
  }, [open]);

  // Debug progress changes
  useEffect(() => {
    logger.debug('Progress state changed to:', progress);
  }, [progress]);

  const startRecommendation = async () => {
    setProgress('gathering-data');
    setError(null);
    setRecommendation(null);
    setShowWarning(false);

    try {
      // Make the API call with streaming response
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          targetTime: targetTime.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let doneReading = false;

      while (!doneReading) {
        const { done, value } = await reader.read();

        if (done) {
          doneReading = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last line in buffer if it's incomplete
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              logger.debug('Received SSE data:', data);

              switch (data.type) {
                case 'progress':
                  logger.debug('Progress update:', data.step, data.message);
                  setProgress(data.step as RecommendationProgress);
                  // Force a small delay to make progress visible
                  await new Promise((resolve) => setTimeout(resolve, 100));
                  break;
                case 'error':
                  logger.debug('Error received:', data.error);
                  setError(data.error);
                  setProgress('error');
                  return;
                case 'result': {
                  logger.debug('Result received:', data.data);
                  const newRecommendation = data.data as Recommendation;

                  // Check for dose difference warning (20% threshold)
                  if (newRecommendation.doseUnits && lastDose) {
                    const difference = Math.abs(newRecommendation.doseUnits - lastDose) / lastDose;
                    if (difference > DOSE_DIFFERENCE_WARNING_THRESHOLD) {
                      setShowWarning(true);
                    }
                  }

                  setRecommendation(newRecommendation);
                  setProgress('complete');
                  onSuccess?.(newRecommendation);
                  return;
                }
              }
            } catch (parseError) {
              logger.error('Error parsing SSE data:', parseError, 'Line:', line);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Recommendation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProgress('error');
    }
  };

  const handleClose = () => {
    setProgress('idle');
    setError(null);
    setRecommendation(null);
    setShowWarning(false);
    onClose();
  };

  const getProgressLabel = () => {
    const currentStep = PROGRESS_STEPS.find((step) => step.key === progress);
    logger.debug('Current progress:', progress, 'Label:', currentStep?.label);
    return currentStep?.label || 'Processing...';
  };

  const getProgressValue = () => {
    if (progress === 'idle') {
      return 0;
    }
    if (progress === 'error') {
      return 0;
    }
    if (progress === 'complete') {
      return 100;
    }

    const currentIndex = PROGRESS_STEPS.findIndex((step) => step.key === progress);
    const value = ((currentIndex + 1) / PROGRESS_STEPS.length) * 100;
    logger.debug('Progress value:', progress, 'Index:', currentIndex, 'Value:', value);
    return value;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">Insulin Dose Recommendation</Typography>
          {progress === 'complete' && <CheckCircleIcon color="success" />}
          {progress === 'error' && <ErrorIcon color="error" />}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Target Time Input - Only show when not in progress */}
          {progress === 'idle' && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Target Time for Insulin
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  When do you plan to administer the insulin? This helps provide more accurate
                  recommendations.
                </Typography>
                <TextField
                  label="Target Time (Local Timezone)"
                  type="datetime-local"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formatDateTimeForInput(targetTime)}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue) {
                      const date = new Date(inputValue);
                      setTargetTime(date);
                    }
                  }}
                  helperText="Uses your local timezone"
                />
              </CardContent>
            </Card>
          )}

          {/* Progress Section */}
          {progress !== 'idle' && progress !== 'complete' && progress !== 'error' && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Getting Recommendation for {patientName}
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">{getProgressLabel()}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={getProgressValue()}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          )}

          {/* Error Section */}
          {error && (
            <Alert severity="error">
              <Typography variant="body2">{error}</Typography>
            </Alert>
          )}

          {/* Warning Section */}
          {showWarning && recommendation && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Dose Difference Warning
                </Typography>
                <Typography variant="body2">
                  This recommended dose differs by more than 20% from your most recent comparable
                  dose. Please review carefully before administering.
                </Typography>
              </Box>
            </Alert>
          )}

          {/* Recommendation Result */}
          {recommendation && progress === 'complete' && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recommended Dose
                </Typography>

                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Typography variant="h4" color="primary" fontWeight={600}>
                    {recommendation.doseUnits} IU
                  </Typography>
                  {recommendation.medicationName && (
                    <Typography variant="h6" color="text.secondary">
                      of {recommendation.medicationName}
                    </Typography>
                  )}
                  <Chip label="Recommended" color="primary" variant="outlined" />
                  {recommendation.confidence && (
                    <Chip
                      label={`Confidence: ${recommendation.confidence}`}
                      color={
                        recommendation.confidence === 'high'
                          ? 'success'
                          : recommendation.confidence === 'medium'
                            ? 'warning'
                            : 'error'
                      }
                      variant="outlined"
                      size="small"
                    />
                  )}
                </Box>

                {recommendation.reasoning && (
                  <Box mb={3}>
                    <Typography variant="subtitle2" gutterBottom>
                      Reasoning
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {recommendation.reasoning}
                    </Typography>
                  </Box>
                )}

                {recommendation.safetyNotes && (
                  <Box mb={3}>
                    <Typography variant="subtitle2" gutterBottom color="error">
                      Safety Notes
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      {recommendation.safetyNotes}
                    </Typography>
                  </Box>
                )}

                {recommendation.recommendedMonitoring && (
                  <Box mb={3}>
                    <Typography variant="subtitle2" gutterBottom color="info.main">
                      Monitoring Recommendations
                    </Typography>
                    <Typography variant="body2" color="info.main">
                      {recommendation.recommendedMonitoring}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Legal Disclaimer */}
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    <strong>Legal Disclaimer:</strong> This recommendation is for informational
                    purposes only and should not replace professional medical advice. Always consult
                    with a healthcare provider before making changes to insulin dosing.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    <strong>Safety Notice:</strong> This tool is designed to assist caregivers but
                    does not guarantee accuracy. Verify all doses with a healthcare professional.
                  </Typography>
                </Box>

                {/* Add as Entry Button */}
                {onAddEntry && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => {
                        onAddEntry('insulin', {
                          value: recommendation.doseUnits?.toString() || '',
                          units: 'IU',
                          medicationBrand: recommendation.medicationName || '',
                          occurredAt: targetTime,
                        });
                        handleClose();
                      }}
                      sx={{ mb: 1 }}
                    >
                      Add {recommendation.doseUnits} IU{' '}
                      {recommendation.medicationName ? `of ${recommendation.medicationName}` : ''}{' '}
                      as Entry
                    </Button>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      textAlign="center"
                    >
                      You can modify the dose and medication in the entry form if needed
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        {progress === 'idle' && (
          <Button onClick={startRecommendation} variant="contained">
            Get Recommendation
          </Button>
        )}
        {progress === 'error' && (
          <Button onClick={startRecommendation} variant="outlined">
            Try Again
          </Button>
        )}
        <Button onClick={handleClose} variant="contained">
          {progress === 'complete' ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
