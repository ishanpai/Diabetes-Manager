import React from 'react';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  Alert,
  Box,
  Button,
  Typography,
} from '@mui/material';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onRetry, className = '' }: ErrorDisplayProps) {
  return (
    <Box textAlign="center" className={className}>
      <Alert severity="error" icon={<ErrorOutlineIcon fontSize="large" />} sx={{ mb: 2, justifyContent: 'center' }}>
        <Typography variant="h6" gutterBottom>Error</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>
        {onRetry && (
          <Button variant="contained" color="primary" onClick={onRetry} sx={{ mt: 1 }}>
            Try Again
          </Button>
        )}
      </Alert>
    </Box>
  );
} 