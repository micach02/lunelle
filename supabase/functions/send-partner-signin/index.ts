/**
 * Supabase Edge Function: send-partner-signin  (public — no JWT required)
 *
 * A returning partner enters their email and receives a fresh one-time
 * sign-in link. To avoid revealing who has access, the response is ALWAYS the
 * same generic success, whether or not an email was sent.
 *
 * claim_partner_signin_link() (service role only) decides whether to send:
 * only addresses with an active share, max one per minute and ten per day.
 */
import { buildSignInEmail } from '../_shared/email.ts';
import { corsHeaders, json, requireEnv, sendEmail } from '../_shared/http.ts';
import { adminClient, createPartnerSignInLink } from '../_shared/signInLink.ts';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const GENERIC = { ok: true, message: 'If this email has access to a shared cycle, a sign-in link is on its way.' };

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);

  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return json(400, { error: 'bad_request' }, origin);
  }
  if (typeof email !== 'string') return json(400, { error: 'bad_request' }, origin);
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_RE.test(normalized)) {
    return json(400, { error: 'bad_request', message: 'Enter a valid email address.' }, origin);
  }

  try {
    const { data: allowed, error } = await adminClient().rpc('claim_partner_signin_link', { p_email: normalized });
    if (error) {
      console.error('send-partner-signin: rpc failed', error.code);
      return json(200, GENERIC, origin);
    }
    if (allowed === true) {
      const signInLink = await createPartnerSignInLink(normalized);
      await sendEmail(normalized, buildSignInEmail({ signInLink, appUrl: requireEnv('APP_URL') }));
    }
    return json(200, GENERIC, origin);
  } catch (e) {
    console.error('send-partner-signin: unexpected failure', e instanceof Error ? e.message : 'unknown');
    return json(200, GENERIC, origin);
  }
});
