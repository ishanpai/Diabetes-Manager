import Link from 'next/link';
import { useRouter } from 'next/router';

import { PatientDetail } from '@/components/PatientDetail';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { usePatients } from '@/hooks/usePatients';
import { logger } from '@/lib/logger';
import {
  getDiabetesTypeColor,
  getGlucoseStatusColor,
} from '@/utils/patientUtils';
import { formatDate } from '@/utils/uiUtils';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';

export default function Dashboard() {
  const { isLoading: authLoading } = useAuth();
  const { patients, loading, error, refetch } = usePatients();
  const router = useRouter();

  const handleDeletePatient = async (patientId: string) => {
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

      // Refresh the patients list
      refetch();
    } catch (err) {
      logger.error('Error deleting patient:', err);
      alert('Failed to delete patient. Please try again.');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner size="lg" text="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  return (
    <Container maxWidth="lg">
      {/* Header with Add Patient Button */}
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Link href="/patients/new" passHref legacyBehavior>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} component="a">
            Add Patient
          </Button>
        </Link>
      </Box>

      {/* Content based on number of patients */}
      {patients.length === 0 ? (
        <EmptyState
          icon={<AddIcon sx={{ fontSize: 48, color: 'grey.400' }} />}
          title="No patients yet"
          description="Get started by adding your first patient to begin managing their diabetes care."
          action={
            <Link href="/patients/new" passHref legacyBehavior>
              <Button variant="contained" color="primary" startIcon={<AddIcon />} component="a">
                Add Your First Patient
              </Button>
            </Link>
          }
        />
      ) : patients.length === 1 ? (
        // Show detailed view for single patient
        <Card sx={{
          p: 4,
          height: '100%',
          transition: 'all 0.2s ease-in-out',
        }}
        >
        <PatientDetail 
          patientId={patients[0].id} 
          showHeader={true} 
          showActions={true}
        />
        </Card>
      ) : (
        // Show summary cards for multiple patients
        <Grid container spacing={3}>
          {patients.map((patient) => (
            <Grid item xs={12} md={6} lg={4} key={patient.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  }
                }}
                onClick={() => router.push(`/patients/${patient.id}`)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {patient.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {patient.age} years old
                      </Typography>
                      <Chip
                        label={patient.diabetesType}
                        color={getDiabetesTypeColor(patient.diabetesType)}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                    </Box>
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/patients/${patient.id}/edit`);
                        }}
                        sx={{ color: 'primary.main' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePatient(patient.id);
                        }}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Last Glucose Reading */}
                  {patient.lastGlucoseReading && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Last Glucose Reading
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1" fontWeight={600}>
                          {patient.lastGlucoseReading.value} mg/dL
                        </Typography>
                        <Chip
                          label={patient.lastGlucoseReading.status}
                          color={getGlucoseStatusColor(patient.lastGlucoseReading.status)}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Box>
                    </Box>
                  )}

                  {/* Recent Activity */}
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Recent Activity
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {patient.recentEntries} entries this week
                    </Typography>
                    {patient.lastEntryDate && (
                      <Typography variant="caption" color="text.secondary">
                        Last: {formatDate(patient.lastEntryDate)}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
} 
