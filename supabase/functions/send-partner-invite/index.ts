/**
 * Supabase Edge Function: send-partner-invite
 *
 * Sends the partner-invitation email for a PENDING share owned by the caller.
 *
 * Security
 * - Runs with the caller's own JWT and the public anon key, so every database
 *   call is subject to RLS and the owner checks in record_partner_invite_email().
 *   The service-role key is never used.
 * - The link in the email comes from the APP_URL secret, never from the
 *   request, so it can't be pointed at another site.
 * - Never logs email addresses or any user data.
 *
 * Secrets (supabase secrets set …):
 *   RESEND_API_KEY      API key for https://resend.com
 *   INVITE_FROM_EMAIL   e.g. "Lunelle <invites@your-domain.com>" (verified sender)
 *   APP_URL             e.g. https://lunelle.example.com
 *   ALLOWED_ORIGINS     optional, comma-separated extra browser origins (e.g. http://localhost:5173)
 * SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase automatically.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildInviteEmail } from './email.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const appUrl = Deno.env.get('APP_URL');
  if (appUrl) origins.add(new URL(appUrl).origin);
  for (const o of (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',')) {
    if (o.trim()) origins.add(new URL(o.trim()).origin);
  }
  return origins;
}

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && allowedOrigins().has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(status: number, body: Record<string, unknown>, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

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
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc('record_partner_invite_email', { p_share_id: shareId });
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

    const email = buildInviteEmail({
      inviterName: row.inviter_name,
      partnerEmail: row.partner_email,
      appUrl: env('APP_URL'),
    });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env('INVITE_FROM_EMAIL'),
        to: [row.partner_email],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    if (!response.ok) {
      console.error('send-partner-invite: email provider responded', response.status);
      return json(502, { error: 'email_failed', message: 'We couldn’t send the invitation email. Please try again in a minute.' }, origin);
    }

    return json(200, { ok: true }, origin);
  } catch (e) {
    console.error('send-partner-invite: unexpected failure', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'server_error', message: 'Something went wrong sending the invitation.' }, origin);
  }
});
