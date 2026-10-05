/**
 * Public, build-time configuration. Only the Supabase URL and the PUBLIC
 * (anon / publishable) key are ever exposed to the browser. Secret or
 * service-role keys bypass Row Level Security and are rejected outright.
 */

/**
 * Accept the project URL in the forms people commonly copy from the
 * dashboard (e.g. the Data API URL ".../rest/v1/") and reduce it to the
 * project origin that supabase-js expects.
 */
export function normalizeSupabaseUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
}

/** True for keys that must never ship to a browser. */
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  // Legacy JWT keys: inspect the role claim.
  const payload = key.split('.')[1];
  if (!payload) return false;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json?.role === 'service_role';
  } catch {
    return false;
  }
}

/** The app's base path without a trailing slash: "" at a domain root, "/lunelle" on GitHub Pages. */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Absolute URL of an in-app path, honouring the base path (for email redirect links). */
export function appUrl(path: string): string {
  return `${window.location.origin}${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const usesSecretKey = anonKey.length > 0 && isSecretKey(anonKey);

export const env = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  usesSecretKey,
  isSupabaseConfigured: url.length > 0 && anonKey.length > 0 && !usesSecretKey,
} as const;
