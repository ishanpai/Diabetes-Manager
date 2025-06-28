import { useEffect } from 'react';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
} from '@mui/material';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (session) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const handleGetStarted = () => {
    router.push('/auth/signin');
  };

  const handleLogin = () => {
    router.push('/auth/signin');
  };

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            borderRadius: 3,
            maxWidth: 600,
            width: '100%',
          }}
        >
          <Typography variant="h2" component="h1" gutterBottom color="primary">
            Diabetes Workflow Companion
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom color="text.secondary">
            Streamline diabetes management with AI-powered insulin recommendations
          </Typography>
          
          <Typography variant="body1" paragraph sx={{ mt: 3, mb: 4 }}>
            Track patient data, record meals and blood sugar readings, and get intelligent 
            insulin dose recommendations with a single tap. Designed for caregivers to 
            provide better diabetes care efficiently and safely.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{ minWidth: 150 }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={handleLogin}
              sx={{ minWidth: 150 }}
            >
              Sign In
            </Button>
          </Box>

          <Box sx={{ mt: 6 }}>
            <Typography variant="h6" gutterBottom>
              Key Features
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                • Multi-patient management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Quick data entry
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • AI insulin recommendations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Visual analytics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Safety checks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Mobile-optimized
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 