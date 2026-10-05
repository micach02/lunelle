import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { FullPageSpinner } from '@/components/ui/Feedback';
import { useAuth } from '@/features/auth/AuthProvider';

/** Only signed-in users get past this point. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Sign-in/up screens: send signed-in users back to where they were headed. */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    // Only same-app paths — never an open redirect.
    const target = from && from.startsWith('/') && !from.startsWith('//') ? from : '/';
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}
