import React, { ReactNode } from 'react';

import Link from 'next/link';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, backHref, actions, className = '' }: PageHeaderProps) {
  return (
    <AppBar position="static" color="default" elevation={0} className={className} sx={{ mb: 3 }}>
      <Toolbar>
        {backHref && (
          <Link href={backHref} passHref legacyBehavior>
            <IconButton edge="start" color="inherit" sx={{ mr: 2 }} component="a">
              <ArrowBackIcon />
            </IconButton>
          </Link>
        )}
        <Box flex={1}>
          <Typography variant="h5" color="inherit" fontWeight={700}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
        {actions && <Box ml={2}>{actions}</Box>}
      </Toolbar>
    </AppBar>
  );
} 