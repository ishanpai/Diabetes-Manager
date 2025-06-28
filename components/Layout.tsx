import { ReactNode } from 'react';

import {
  signOut,
  useSession,
} from 'next-auth/react';
import Link from 'next/link';

import LogoutIcon from '@mui/icons-material/Logout';
import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
} from '@mui/material';

export default function Layout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  const getWelcomeMessage = () => {
    if (!session?.user) return 'Welcome';
    return `Welcome, ${session.user.name || session.user.email}`;
  };

  return (
    <Box minHeight="100vh" bgcolor="#fafafa">
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <Link href="/" passHref legacyBehavior>
            <Typography 
              variant="h6" 
              component="a" 
              sx={{ 
                flexGrow: 1, 
                textDecoration: 'none', 
                color: 'inherit',
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8,
                }
              }}
            >
              Diabetes Workflow Companion
            </Typography>
          </Link>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {getWelcomeMessage()}
            </Typography>
            {session?.user && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                size="small"
                sx={{ 
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'inherit',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                Logout
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {children}
      </Container>
    </Box>
  );
} 