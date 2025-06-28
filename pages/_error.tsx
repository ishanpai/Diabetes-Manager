import { NextPageContext } from 'next';

import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import {
  Box,
  Container,
} from '@mui/material';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error;
}

function Error({ statusCode, hasGetInitialPropsRun, err }: ErrorProps) {
  if (!hasGetInitialPropsRun && err) {
    // getInitialProps is not called in case of
    // https://github.com/vercel/next.js/issues/8592. As a workaround, we pass
    // err via _app.js so it can be captured
    return null;
  }

  const getErrorMessage = () => {
    if (statusCode === 404) {
      return 'This page could not be found.';
    }
    if (statusCode === 500) {
      return 'An internal server error occurred.';
    }
    return 'An unexpected error occurred.';
  };

  const getErrorTitle = () => {
    if (statusCode === 404) {
      return 'Page Not Found';
    }
    if (statusCode === 500) {
      return 'Server Error';
    }
    return 'Something went wrong';
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" bgcolor="#fafafa">
      <Container maxWidth="sm">
        <ErrorDisplay
          error={getErrorMessage()}
          onRetry={() => window.location.reload()}
        />
      </Container>
    </Box>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode, hasGetInitialPropsRun: true };
};

export default Error; 