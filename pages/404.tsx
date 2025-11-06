import { useRouter } from 'next/router';

import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { Box, Container } from '@mui/material';

export default function Custom404() {
  const router = useRouter();

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" bgcolor="#fafafa">
      <Container maxWidth="sm">
        <ErrorDisplay
          error="This page could not be found."
          onRetry={() => router.push('/dashboard')}
        />
      </Container>
    </Box>
  );
}
