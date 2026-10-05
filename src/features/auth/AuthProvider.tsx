import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { logError } from '@/lib/logger';
import { authService, type AuthService } from './services/authService';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  /** True after arriving from a password-reset email link. */
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  service: AuthService;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  service = authService,
}: {
  children: ReactNode;
  /** Injectable for tests. */
  service?: AuthService;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let active = true;
    // Auth events are authoritative; a slower initial getSession() must not overwrite them.
    let receivedEvent = false;

    const unsubscribe = service.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      receivedEvent = true;
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
    });

    service
      .getSession()
      .then((initial) => {
        if (!active || receivedEvent) return;
        setSession(initial);
        setStatus(initial ? 'authenticated' : 'unauthenticated');
      })
      .catch((error: unknown) => {
        logError('auth.getSession', error);
        if (active && !receivedEvent) setStatus('unauthenticated');
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [service]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      isPasswordRecovery,
      clearPasswordRecovery: () => setIsPasswordRecovery(false),
      service,
    }),
    [status, session, isPasswordRecovery, service],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
