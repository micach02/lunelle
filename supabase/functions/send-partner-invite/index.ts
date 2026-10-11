/**
 * Supabase Edge Function: send-partner-invite
 *
 * Emails the partner invitation for a PENDING share owned by the caller. The
 * email contains a one-time sign-in link, so the partner never has to sign up.
 *
 * Security
 * - The owner check runs with the caller's own JWT and the public key, so
 *   record_partner_invite_email() enforces ownership, status and cooldown.
 * - Only after that check is the service role used — solely to create the
 *   partner's one-time sign-in link (see _shared/signInLink.ts).
 * - Links are built from the APP_URL secret, never from the request.
 * - Never logs email addresses or any user data.
 *
 * Secrets: RESEND_API_KEY, INVITE_FROM_EMAIL, APP_URL, optional ALLOWED_ORIGINS.
 * SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildInviteEmail } from '../_shared/email.ts';
import { corsHeaders, json, requireEnv, sendEmail } from '../_shared/http.ts';
import { createPartnerSignInLink } from '../_shared/signInLink.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json(401, { error: 'unauthorized', message: 'Please sign in again.' }, origin);

  let shareId: unknown;
  try {
    ({ shareId } = await req.json());
  } catch {
    return json(400, { error: 'bad_request' }, origin);
  }
  if (typeof shareId !== 'string' || !UUID_RE.test(shareId)) {
    return json(400, { error: 'bad_request' }, origin);
  }

  try {
    const asOwner = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await asOwner.rpc('record_partner_invite_email', { p_share_id: shareId });
    if (error) {
      if (error.code === 'LU006') {
        return json(429, { error: 'too_soon', message: 'An invitation email was just sent. Please wait a minute before resending.' }, origin);
      }
      if (error.code === 'LU004') {
        return json(404, { error: 'not_found', message: 'This invitation is no longer pending.' }, origin);
      }
      console.error('send-partner-invite: rpc failed', error.code);
      return json(400, { error: 'rpc_failed', message: 'We couldn’t prepare the invitation email.' }, origin);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.partner_email) return json(404, { error: 'not_found', message: 'This invitation is no longer pending.' }, origin);

    const signInLink = await createPartnerSignInLink(row.partner_email);
    const email = buildInviteEmail({ inviterName: row.inviter_name, signInLink, appUrl: requireEnv('APP_URL') });
    if (!(await sendEmail(row.partner_email, email))) {
      return json(502, { error: 'email_failed', message: 'We couldn’t send the invitation email. Please try again in a minute.' }, origin);
    }
    return json(200, { ok: true }, origin);
  } catch (e) {
    console.error('send-partner-invite: unexpected failure', e instanceof Error ? e.message : 'unknown');
    return json(500, { error: 'server_error', message: 'Something went wrong sending the invitation.' }, origin);
  }
});
