import React, { ReactNode } from 'react';

import { Box, Typography } from '@mui/material';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <Box textAlign="center" py={8} className={className}>
      {icon && (
        <Box
          mb={3}
          mx="auto"
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{
            width: 64,
            height: 64,
            maxWidth: 64,
            maxHeight: 64,
            overflow: 'hidden',
            color: 'grey.400',
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="h6" color="text.primary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {description}
      </Typography>
      {action && <Box mt={2}>{action}</Box>}
    </Box>
  );
}
