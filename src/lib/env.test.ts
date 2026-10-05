// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isSecretKey, normalizeSupabaseUrl } from './env';

describe('normalizeSupabaseUrl', () => {
  it.each([
    'https://abc.supabase.co',
    'https://abc.supabase.co/',
    'https://abc.supabase.co/rest/v1/',
    '  https://abc.supabase.co/rest/v1  ',
  ])('reduces %s to the project origin', (input) => {
    expect(normalizeSupabaseUrl(input)).toBe('https://abc.supabase.co');
  });

  it('keeps an empty value empty', () => {
    expect(normalizeSupabaseUrl('')).toBe('');
  });
});

describe('isSecretKey', () => {
  const jwt = (role: string) => `x.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.y`;

  it('rejects secret and service-role keys', () => {
    expect(isSecretKey('sb_secret_abc123')).toBe(true);
    expect(isSecretKey(jwt('service_role'))).toBe(true);
  });

  it('accepts publishable and anon keys', () => {
    expect(isSecretKey('sb_publishable_abc123')).toBe(false);
    expect(isSecretKey(jwt('anon'))).toBe(false);
  });
});
