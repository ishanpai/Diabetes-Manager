import { useEffect } from 'react';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export function useAuth(redirectTo?: string) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push(redirectTo || '/auth/signin');
    }
  }, [session, status, router, redirectTo]);

  return {
    session,
    status,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    user: session?.user,
  };
} 