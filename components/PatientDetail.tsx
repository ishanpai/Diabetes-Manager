import { useState } from 'react';

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
  PatientWithEntries,
  Recommendation,
} from '@/types';
import { getDiabetesTypeColor } from '@/utils/patientUtils';
import { formatDate } from '@/utils/uiUtils';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
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
  const router = useRouter();

  // Dialog state
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryType, setEntryType] = useState<'glucose' | 'meal' | 'insulin'>('glucose');
  const [entryDefaultValues, setEntryDefaultValues] = useState<any>(undefined);
  const [recommendationDialogOpen, setRecommendationDialogOpen] = useState(false);

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
    setRecommendationDialogOpen(true);
  };

  const handleEntrySuccess = (entry: Entry) => {
    // Refresh patient data to show new entry
    refetch();
  };

  const handleRecommendationSuccess = (recommendation: Recommendation) => {
    // Optionally refresh data or show success message
    console.log('Recommendation created:', recommendation);
  };

  const handleAddEntryFromRecommendation = (entryType: 'insulin', defaultValues: any) => {
    setEntryType(entryType);
    
    // If no medication brand is provided, use the first available insulin medication
    let finalDefaultValues = { ...defaultValues };
    if (entryType === 'insulin' && !defaultValues.medicationBrand && patientWithEntries.usualMedications?.length > 0) {
      // Find the first insulin medication (assuming all medications in the list are insulin)
      const firstMedication = patientWithEntries.usualMedications[0];
      finalDefaultValues.medicationBrand = firstMedication.brand;
    }
    
    setEntryDefaultValues(finalDefaultValues);
    setEntryDialogOpen(true);
  };

  const handleEntryUpdate = () => {
    // Refresh patient data when entries are updated
    refetch();
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

  // Explicitly type patient as PatientWithEntries to fix TypeScript error
  const patientWithEntries = patient as PatientWithEntries;

  return (
    <Container maxWidth="lg">
      {showHeader && (
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h4" gutterBottom>
              {patientWithEntries.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body1" color="text.secondary">
                {patientWithEntries.age} years old
              </Typography>
              <Chip 
                label={patientWithEntries.diabetesType} 
                color={getDiabetesTypeColor(patientWithEntries.diabetesType)} 
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
              sx={{ py: 3, fontSize: '1.1rem' }}
            >
              Get Insulin Dose Recommendation
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {/* Recent Entries - Middle */}
        <Grid item xs={12} md={8}>
          <EntriesTable
            patientId={patientId}
            patientMedications={patientWithEntries.usualMedications}
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
                  <Typography variant="body1">{patientWithEntries.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Age</Typography>
                  <Typography variant="body1">{patientWithEntries.age} years old</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                  <Typography variant="body1">{formatDate(patientWithEntries.dob)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Diabetes Type</Typography>
                  <Chip label={patientWithEntries.diabetesType} color={getDiabetesTypeColor(patientWithEntries.diabetesType)} size="small" />
                </Box>
                {patientWithEntries.lifestyle && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Lifestyle</Typography>
                    <Typography variant="body1">{patientWithEntries.lifestyle}</Typography>
                  </Box>
                )}
                {patientWithEntries.activityLevel && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Activity Level</Typography>
                    <Typography variant="body1">{patientWithEntries.activityLevel}</Typography>
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
              {patientWithEntries.usualMedications && patientWithEntries.usualMedications.length > 0 ? (
                <Box display="flex" flexDirection="column" gap={1}>
                  {patientWithEntries.usualMedications.map((med, index) => (
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
        patientMedications={patientWithEntries.usualMedications}
        defaultValues={entryDefaultValues}
        onSuccess={handleEntrySuccess}
      />

      <InsulinRecommendationDialog
        open={recommendationDialogOpen}
        onClose={() => setRecommendationDialogOpen(false)}
        patientId={patientId}
        patientName={patientWithEntries.name}
        onSuccess={handleRecommendationSuccess}
        onAddEntry={handleAddEntryFromRecommendation}
      />
    </Container>
  );
} 