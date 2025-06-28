import {
  useEffect,
  useState,
} from 'react';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Medication,
  PatientFormData,
  PatientWithEntries,
} from '@/types';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
// MUI imports
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';

interface PatientFormProps {
  patient?: PatientWithEntries | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
  title: string;
  subtitle: string;
  submitButtonText: string;
}

export function PatientForm({
  patient,
  onSubmit,
  onCancel,
  loading = false,
  error = null,
  title,
  subtitle,
  submitButtonText,
}: PatientFormProps) {
  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    dob: '',
    diabetesType: '',
    lifestyle: '',
    activityLevel: 'Moderate',
    usualMedications: [{ brand: '', dosage: '', timing: '' }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load patient data when editing
  useEffect(() => {
    if (patient) {
      
      setFormData({
        name: patient.name,
        dob: patient.dob instanceof Date 
          ? patient.dob.toISOString().split('T')[0] 
          : new Date(patient.dob).toISOString().split('T')[0],
        diabetesType: patient.diabetesType,
        lifestyle: patient.lifestyle || '',
        activityLevel: patient.activityLevel || 'Moderate',
        usualMedications: patient.usualMedications.length > 0 
          ? patient.usualMedications 
          : [{ brand: '', dosage: '', timing: '' }],
      });
    }
  }, [patient]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    }

    if (!formData.diabetesType) {
      newErrors.diabetesType = 'Diabetes type is required';
    }

    // Validate medications
    formData.usualMedications.forEach((med, index) => {
      if (!med.brand.trim()) {
        newErrors[`medications.${index}.brand`] = 'Medication brand is required';
      }
      if (!med.dosage.trim()) {
        newErrors[`medications.${index}.dosage`] = 'Dosage is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Convert medications array to JSON string for backend
    const medicationsJson = JSON.stringify(formData.usualMedications);
    
    const backendData = {
      ...formData,
      diabetesType: formData.diabetesType,
      usualMedications: medicationsJson
    };

    await onSubmit(backendData);
  };

  const handleInputChange = (field: keyof PatientFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const updatedMedications = [...formData.usualMedications];
    updatedMedications[index] = { ...updatedMedications[index], [field]: value };
    setFormData(prev => ({ ...prev, usualMedications: updatedMedications }));

    // Clear error when user starts typing
    const errorKey = `medications.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      usualMedications: [...prev.usualMedications, { brand: '', dosage: '', timing: '' }],
    }));
  };

  const removeMedication = (index: number) => {
    if (formData.usualMedications.length > 1) {
      setFormData(prev => ({
        ...prev,
        usualMedications: prev.usualMedications.filter((_, i) => i !== index),
      }));
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  return (
    <Box minHeight="100vh" bgcolor="#fafafa">
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper elevation={3} sx={{ borderRadius: 3, p: 4 }}>
          <Typography variant="h4" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {subtitle}
          </Typography>
          
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            {/* Basic Information */}
            <Typography variant="h6" gutterBottom>Basic Information</Typography>
            <Grid container spacing={3} mb={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Date of Birth"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleInputChange('dob', e.target.value)}
                  error={!!errors.dob}
                  helperText={errors.dob}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.diabetesType} required>
                  <InputLabel>Diabetes Type</InputLabel>
                  <Select
                    label="Diabetes Type"
                    value={formData.diabetesType}
                    onChange={(e) => handleInputChange('diabetesType', e.target.value)}
                  >
                    <MenuItem value="">Select diabetes type</MenuItem>
                    <MenuItem value="type1">Type 1</MenuItem>
                    <MenuItem value="type2">Type 2</MenuItem>
                    <MenuItem value="gestational">Gestational</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                  <FormHelperText>{errors.diabetesType}</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Activity Level</InputLabel>
                  <Select
                    label="Activity Level"
                    value={formData.activityLevel}
                    onChange={(e) => handleInputChange('activityLevel', e.target.value)}
                  >
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Moderate">Moderate</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Lifestyle / Notes"
                  value={formData.lifestyle}
                  onChange={(e) => handleInputChange('lifestyle', e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />
              </Grid>
            </Grid>
            
            {/* Medications */}
            <Typography variant="h6" gutterBottom>Medications</Typography>
            {formData.usualMedications.map((med, idx) => (
              <Grid container spacing={2} alignItems="center" key={idx} mb={1}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Brand"
                    value={med.brand}
                    onChange={(e) => handleMedicationChange(idx, 'brand', e.target.value)}
                    error={!!errors[`medications.${idx}.brand`]}
                    helperText={errors[`medications.${idx}.brand`]}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Dosage"
                    value={med.dosage}
                    onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                    error={!!errors[`medications.${idx}.dosage`]}
                    helperText={errors[`medications.${idx}.dosage`]}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Timing (e.g. before breakfast)"
                    value={med.timing}
                    onChange={(e) => handleMedicationChange(idx, 'timing', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={1}>
                  <IconButton 
                    color="error" 
                    onClick={() => removeMedication(idx)} 
                    disabled={formData.usualMedications.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Box display="flex" justifyContent="flex-end" mb={3}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addMedication}>
                Add Medication
              </Button>
            </Box>
            
            {/* Submit */}
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="outlined" color="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={loading}>
                {loading ? 'Saving...' : submitButtonText}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
} 