import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { appUrl } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

function redirectTo(path: string): string {
  return appUrl(path);
}

export interface SignUpResult {
  /** True when Supabase requires the user to confirm their email first. */
  needsEmailVerification: boolean;
}

export const authService = {
  async getSession(): Promise<Session | null> {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
    const { data } = getSupabase().auth.onAuthStateChange((event, session) => callback(event, session));
    return () => data.subscription.unsubscribe();
  },

  async signUp(email: string, password: string, displayName: string): Promise<SignUpResult> {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: redirectTo('/auth/callback'),
      },
    });
    if (error) throw error;
    return { needsEmailVerification: !data.session };
  },

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signOut(): Promise<void> {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
  },

  async resendVerification(email: string): Promise<void> {
    const { error } = await getSupabase().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo('/auth/callback') },
    });
    if (error) throw error;
  },

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo('/reset-password'),
    });
    if (error) throw error;
  },

  async updatePassword(password: string): Promise<void> {
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) throw error;
  },

  /** Re-check the current password before sensitive account changes. */
  async verifyPassword(email: string, password: string): Promise<void> {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async updateEmail(email: string): Promise<void> {
    const { error } = await getSupabase().auth.updateUser(
      { email },
      { emailRedirectTo: redirectTo('/auth/callback') },
    );
    if (error) throw error;
  },

  /** Permanently delete the account and all tracking data, then clear the local session. */
  async deleteAccount(): Promise<void> {
    const { error } = await getSupabase().rpc('delete_own_account');
    if (error) throw error;
    await getSupabase().auth.signOut({ scope: 'local' });
  },
};

export type AuthService = typeof authService;
