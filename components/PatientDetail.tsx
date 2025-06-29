import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/router';

import { AddEntryDialog } from '@/components/dialogs/AddEntryDialog';
import {
  InsulinRecommendationDialog,
} from '@/components/dialogs/InsulinRecommendationDialog';
import { EntriesTable } from '@/components/EntriesTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePatient } from '@/hooks/usePatient';
import {
  Entry,
  Recommendation,
} from '@/types';
import {
  formatPatientAge,
  getDiabetesTypeColor,
  getHistoryRequirementStatus,
} from '@/utils/patientUtils';
import { formatDate } from '@/utils/uiUtils';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicationIcon from '@mui/icons-material/Medication';
import MonitorIcon from '@mui/icons-material/Monitor';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Typography,
} from '@mui/material';

interface PatientDetailProps {
  patientId: string;
  showHeader?: boolean;
  showActions?: boolean;
}

export function PatientDetail({ patientId, showHeader = true, showActions = true }: PatientDetailProps) {
  const { patient, loading, error, refetch } = usePatient(patientId);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const router = useRouter();

  // Dialog state
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryType, setEntryType] = useState<'glucose' | 'meal' | 'insulin'>('glucose');
  const [entryDefaultValues, setEntryDefaultValues] = useState<any>(undefined);
  const [recommendationDialogOpen, setRecommendationDialogOpen] = useState(false);

  // Fetch entries for the patient
  const fetchEntries = async () => {
    setEntriesLoading(true);
    try {
      const response = await fetch(`/api/entries?patientId=${patientId}&limit=1000&offset=0`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch entries');
      }

      if (result.success) {
        setEntries(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch entries');
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  // Fetch entries when patientId changes
  useEffect(() => {
    if (patientId) {
      fetchEntries();
    }
  }, [patientId]);

  const handleDeletePatient = async () => {
    if (!confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete patient');
      }

      // Redirect to dashboard after deletion
      router.push('/dashboard');
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('Failed to delete patient. Please try again.');
    }
  };

  const handleAddEntry = (type: 'glucose' | 'meal' | 'insulin') => {
    setEntryType(type);
    setEntryDefaultValues(undefined);
    setEntryDialogOpen(true);
  };

  const handleRecommendInsulin = () => {
    if (!historyRequirementStatus.hasSufficientHistory) {
      alert(historyRequirementStatus.message);
      return;
    }
    setRecommendationDialogOpen(true);
  };

  const handleEntrySuccess = (entry: Entry) => {
    // Refresh patient data and entries to show new entry
    refetch();
    fetchEntries();
  };

  const handleRecommendationSuccess = (recommendation: Recommendation) => {
    // Optionally refresh data or show success message
    console.log('Recommendation created:', recommendation);
  };

  const handleAddEntryFromRecommendation = (entryType: 'insulin', defaultValues: any) => {

    if (!patient) {
      alert("Patient not found");
      return;
    }

    setEntryType(entryType);

    // If no medication brand is provided, use the first available insulin medication
    let finalDefaultValues = { ...defaultValues };
    if (entryType === 'insulin' && !defaultValues.medicationBrand && patient.usualMedications?.length > 0) {
      // Find the first insulin medication (assuming all medications in the list are insulin)
      const firstMedication = patient.usualMedications[0];
      finalDefaultValues.medicationBrand = firstMedication.brand;
    }

    setEntryDefaultValues(finalDefaultValues);
    setEntryDialogOpen(true);
  };

  const handleEntryUpdate = () => {
    // Refresh patient data and entries when entries are updated
    refetch();
    fetchEntries();
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading patient..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  if (!patient) {
    return <EmptyState title="Patient not found" description="The patient you're looking for doesn't exist." />;
  }

  const historyRequirementStatus = getHistoryRequirementStatus(entries);

  return (
    <Container maxWidth="lg">
      {showHeader && (
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h4" gutterBottom>
              {patient.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body1" color="text.secondary">
                {formatPatientAge(patient)}
              </Typography>
              <Chip
                label={patient.diabetesType}
                color={getDiabetesTypeColor(patient.diabetesType)}
                size="small"
              />
            </Box>
          </Box>
          {showActions && (
            <Box display="flex" gap={2}>
              <Link href={`/patients/${patientId}/edit`} passHref legacyBehavior>
                <Button variant="outlined" startIcon={<EditIcon />} component="a">
                  Edit Patient
                </Button>
              </Link>
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeletePatient}>
                Delete Patient
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Entry Buttons */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<MonitorIcon />}
              onClick={() => handleAddEntry('glucose')}
              sx={{ py: 2 }}
              color="warning"
            >
              Add Glucose Reading
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<RestaurantIcon />}
              onClick={() => handleAddEntry('meal')}
              sx={{ py: 2 }}
              color="success"
            >
              Add Meal
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<MedicationIcon />}
              onClick={() => handleAddEntry('insulin')}
              sx={{ py: 2 }}
              color="info"
            >
              Add Insulin Dose
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<LocalHospitalIcon />}
              onClick={handleRecommendInsulin}
              disabled={!historyRequirementStatus.hasSufficientHistory || entriesLoading}
              sx={{ py: 3, fontSize: '1.1rem' }}
            >
              Get Insulin Dose Recommendation
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* History Status Card */}
      {entriesLoading && (
        <Typography variant="body2" color="text.secondary">
          Loading patient history...
        </Typography>
      )}
      {!historyRequirementStatus.hasSufficientHistory && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <InfoIcon color={historyRequirementStatus.hasSufficientHistory ? "success" : "warning"} />
              <Typography variant="h6">
                Not enough history for recommendations
              </Typography>
            </Box>
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                To enable insulin recommendations, please add:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  At least 3 entries (glucose readings, meals, or insulin doses)
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Entries from at least 1 day ago (not just today)
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  A mix of different entry types for better context
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Recent Entries - Middle */}
        <Grid item xs={12} md={8}>
          <EntriesTable
            patientId={patientId}
            patientMedications={patient.usualMedications}
            onEntryUpdate={handleEntryUpdate}
          />
        </Grid>

        {/* Patient Information - Right */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Patient Information
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Name</Typography>
                  <Typography variant="body1">{patient.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Age</Typography>
                  <Typography variant="body1">{formatPatientAge(patient)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                  <Typography variant="body1">{formatDate(patient.dob)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Diabetes Type</Typography>
                  <Chip label={patient.diabetesType} color={getDiabetesTypeColor(patient.diabetesType)} size="small" />
                </Box>
                {patient.lifestyle && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Lifestyle</Typography>
                    <Typography variant="body1">{patient.lifestyle}</Typography>
                  </Box>
                )}
                {patient.activityLevel && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Activity Level</Typography>
                    <Typography variant="body1">{patient.activityLevel}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Medications - Below Patient Info */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Usual Medications
              </Typography>
              {patient.usualMedications && patient.usualMedications.length > 0 ? (
                <Box display="flex" flexDirection="column" gap={1}>
                  {patient.usualMedications.map((med, index) => (
                    <Box key={index} p={2} border={1} borderColor="grey.200" borderRadius={1}>
                      <Typography variant="body1" fontWeight={600}>
                        {med.brand}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {med.dosage} • {med.timing}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No medications recorded
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialogs */}
      <AddEntryDialog
        open={entryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        entryType={entryType}
        patientId={patientId}
        patientMedications={patient.usualMedications}
        defaultValues={entryDefaultValues}
        onSuccess={handleEntrySuccess}
      />

      <InsulinRecommendationDialog
        open={recommendationDialogOpen}
        onClose={() => setRecommendationDialogOpen(false)}
        patientId={patientId}
        patientName={patient.name}
        onSuccess={handleRecommendationSuccess}
        onAddEntry={handleAddEntryFromRecommendation}
      />
    </Container>
  );
} 