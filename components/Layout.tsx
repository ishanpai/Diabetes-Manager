import {
  ReactNode,
  useState,
} from 'react';

import {
  signOut,
  useSession,
} from 'next-auth/react';
import Link from 'next/link';

import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  AppBar,
  Avatar,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';

export default function Layout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
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
              <>
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{ 
                    color: 'inherit',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'inherit',
                      fontSize: '1rem'
                    }}
                  >
                    {session.user.name ? session.user.name.charAt(0).toUpperCase() : 
                     session.user.email ? session.user.email.charAt(0).toUpperCase() : 
                     <AccountCircleIcon />}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 150,
                    }
                  }}
                >
                  <Link href="/settings" passHref legacyBehavior>
                    <MenuItem 
                      component="a"
                      onClick={handleMenuClose}
                      sx={{ 
                        textDecoration: 'none',
                        color: 'inherit',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                          color: 'primary.contrastText',
                        }
                      }}
                    >
                      <SettingsIcon sx={{ mr: 1, fontSize: 20 }} />
                      Settings
                    </MenuItem>
                  </Link>
                  <MenuItem 
                    onClick={() => {
                      handleMenuClose();
                      handleLogout();
                    }}
                    sx={{ 
                      '&:hover': {
                        backgroundColor: 'error.light',
                        color: 'error.contrastText',
                      }
                    }}
                  >
                    <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
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