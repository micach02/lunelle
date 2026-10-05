/** Turn Supabase/Postgres/network errors into calm, user-facing messages. */

interface ErrorLike {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
}

const POSTGRES_MESSAGES: Record<string, string> = {
  '23P01': 'This period overlaps one you have already recorded.',
  '23505': 'A record for this date already exists.',
  '23514': 'Some of the values entered are not valid.',
  '42501': 'You do not have permission to do that. Please sign in again.',
  PGRST301: 'Your session has expired. Please sign in again.',
  // Partner sharing (see supabase/migrations/*_partner_sharing.sql)
  LU001: 'You can’t invite yourself — enter your partner’s email address.',
  LU002: 'You already have an active partner share. Cancel it before inviting someone else.',
  LU003: 'Too many invitations today. Please try again tomorrow.',
  LU004: 'This invitation is no longer active.',
  LU005: 'Please verify your email address first.',
  LU006: 'An invitation email was just sent. Please wait a minute before resending.',
};

/** An error whose message is already written for the user. */
export class UserFacingError extends Error {
  override name = 'UserFacingError';

  constructor(
    message: string,
    /** Optional machine-readable reason, e.g. "too_soon". */
    readonly code?: string,
  ) {
    super(message);
  }
}

const AUTH_MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'The email or password is incorrect.'],
  [/email not confirmed/i, 'Please verify your email address before signing in.'],
  [/user already registered/i, 'An account with this email already exists.'],
  [/password should be at least/i, 'Your password is too short.'],
  [/new password should be different/i, 'Choose a password different from your current one.'],
  [/rate limit|too many requests/i, 'Too many attempts. Please wait a moment and try again.'],
  [/expired|invalid.*(token|link|code)/i, 'This link is invalid or has expired. Please request a new one.'],
  [/weak password|pwned/i, 'Please choose a stronger password.'],
];

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (error instanceof UserFacingError) return error.message;
  const e = error as ErrorLike;
  if (e.code && POSTGRES_MESSAGES[e.code]) return POSTGRES_MESSAGES[e.code];
  if (e.message) {
    if (/failed to fetch|networkerror|load failed/i.test(e.message)) {
      return 'We could not reach the server. Check your connection and try again.';
    }
    for (const [pattern, message] of AUTH_MESSAGES) {
      if (pattern.test(e.message)) return message;
    }
    // Supabase Auth messages are already user-oriented; Postgres messages are not.
    if (e.name === 'AuthApiError' || e.name === 'AuthWeakPasswordError') return e.message;
  }
  return fallback;
}
