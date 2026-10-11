/** CORS + JSON helpers shared by Lunelle Edge Functions. */

function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const appUrl = Deno.env.get('APP_URL');
  if (appUrl) origins.add(new URL(appUrl).origin);
  for (const o of (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',')) {
    if (o.trim()) origins.add(new URL(o.trim()).origin);
  }
  return origins;
}

export function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && allowedOrigins().has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function json(status: number, body: Record<string, unknown>, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

/** Send an email through Resend. Never logs recipients or content. */
export async function sendEmail(to: string, email: { subject: string; text: string; html: string }): Promise<boolean> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${requireEnv('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: requireEnv('INVITE_FROM_EMAIL'), to: [to], ...email }),
  });
  if (!response.ok) console.error('email provider responded', response.status);
  return response.ok;
}
