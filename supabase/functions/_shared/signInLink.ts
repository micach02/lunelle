/**
 * One-time, password-less sign-in links for partners.
 *
 * Uses the Auth admin API, which needs the service-role key. That key is
 * injected by Supabase into Edge Functions only — it never reaches a browser.
 * The link carries a one-time token hash; the app exchanges it with
 * supabase.auth.verifyOtp() on /shared-access. If the partner has no account
 * yet, Auth creates a password-less one tied to their email.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { appBase } from './email.ts';
import { requireEnv } from './http.ts';

export function adminClient() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createPartnerSignInLink(email: string): Promise<string> {
  const admin = adminClient();
  let result = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (result.error) {
    // Older Auth versions only create new users through the invite type.
    result = await admin.auth.admin.generateLink({ type: 'invite', email });
  }
  const props = result.data?.properties;
  if (result.error || !props?.hashed_token) {
    throw new Error('Could not create sign-in link');
  }
  const params = new URLSearchParams({
    token_hash: props.hashed_token,
    type: props.verification_type ?? 'magiclink',
  });
  return `${appBase(requireEnv('APP_URL'))}/shared-access?${params.toString()}`;
}
