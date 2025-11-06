import React from 'react';

import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeMap = { sm: 24, md: 48, lg: 72 };

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      className={className}
    >
      <CircularProgress size={sizeMap[size]} color="primary" />
      {text && (
        <Typography variant="body2" color="text.secondary" mt={2}>
          {text}
        </Typography>
      )}
    </Box>
  );
}
