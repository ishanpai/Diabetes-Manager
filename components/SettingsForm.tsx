import {
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/router';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSettings } from '@/hooks/useSettings';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';

export function SettingsForm() {
  const router = useRouter();
  const { settings, loading, error, updateSettings } = useSettings();
  const [formData, setFormData] = useState({
    glucoseUnits: 'mg/dL' as 'mg/dL' | 'mmol/L',
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load settings when component mounts
  useEffect(() => {
    if (settings) {
      setFormData({
        glucoseUnits: settings.glucoseUnits || 'mg/dL',
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateSettings(formData);
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleInputChange = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K],
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading settings..." />;
  }

  return (
    <Box minHeight="100vh" bgcolor="#fafafa">
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper elevation={3} sx={{ borderRadius: 3, p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Configure your preferences for the application.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {saveError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {saveError}
            </Alert>
          )}

          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Settings saved successfully!
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Glucose Units */}
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>
                Glucose Measurements
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose your preferred units for glucose readings. This will be used as the default when adding new glucose entries.
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Glucose Units</InputLabel>
                <Select
                  value={formData.glucoseUnits}
                  onChange={(e) =>
                    handleInputChange('glucoseUnits', e.target.value as typeof formData.glucoseUnits)
                  }
                  label="Glucose Units"
                >
                  <MenuItem value="mg/dL">mg/dL (US Standard)</MenuItem>
                  <MenuItem value="mmol/L">mmol/L (International)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Action Buttons */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Button 
                variant="outlined" 
                onClick={() => router.back()}
                disabled={saveLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saveLoading}
              >
                {saveLoading ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
} 
