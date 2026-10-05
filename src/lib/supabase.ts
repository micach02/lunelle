import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { env } from './env';

export type LunelleSupabaseClient = SupabaseClient<Database>;

let client: LunelleSupabaseClient | null = null;

/**
 * The browser Supabase client. Uses only the PUBLIC anon key; every query is
 * subject to Row Level Security on the server. PKCE is used for email links
 * so tokens never appear in the URL fragment.
 */
export function getSupabase(): LunelleSupabaseClient {
  if (client) return client;
  if (!env.isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/** Test seam: replace the client with a fake. */
export function setSupabaseClientForTesting(fake: LunelleSupabaseClient | null): void {
  client = fake;
}
