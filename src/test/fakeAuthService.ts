import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { vi } from 'vitest';
import type { AuthService } from '@/features/auth/services/authService';

export function fakeSession(email = 'sam@example.com'): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email,
      app_metadata: {},
      user_metadata: { display_name: 'Sam' },
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
    },
  } as Session;
}

/** A controllable stand-in for authService. Call `emit` to simulate Supabase events. */
export function createFakeAuthService(initialSession: Session | null = null) {
  let listener: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;
  const emit = (event: AuthChangeEvent, session: Session | null) => listener?.(event, session);

  const service = {
    getSession: vi.fn(async () => initialSession),
    onAuthStateChange: vi.fn((cb: (event: AuthChangeEvent, session: Session | null) => void) => {
      listener = cb;
      return () => {
        listener = null;
      };
    }),
    signUp: vi.fn(async () => ({ needsEmailVerification: true })),
    signIn: vi.fn(async () => {
      emit('SIGNED_IN', fakeSession());
    }),
    signOut: vi.fn(async () => emit('SIGNED_OUT', null)),
    resendVerification: vi.fn(async () => {}),
    sendPasswordReset: vi.fn(async () => {}),
    updatePassword: vi.fn(async () => {}),
    verifyPassword: vi.fn(async () => {}),
    updateEmail: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => emit('SIGNED_OUT', null)),
  } satisfies AuthService;

  return { service, emit };
}
