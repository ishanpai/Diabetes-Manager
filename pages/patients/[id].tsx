import { useRouter } from 'next/router';

import { PatientDetail } from '@/components/PatientDetail';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';

export default function PatientDetailPage() {
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  if (authLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (!id || typeof id !== 'string') {
    return <div>Invalid patient ID</div>;
  }

  return <PatientDetail patientId={id} />;
} 