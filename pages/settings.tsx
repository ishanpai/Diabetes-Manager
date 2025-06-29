import { SettingsForm } from '@/components/SettingsForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  return <SettingsForm />;
} 