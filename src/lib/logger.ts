/**
 * The ONLY place Lunelle writes to the console (enforced by ESLint).
 *
 * Reproductive and sexual-health data must never be logged. This logger
 * therefore accepts only a static context label and extracts nothing but an
 * error code/name — never messages, details, payloads or row data (Postgres
 * error `details` can contain the failing row). In production it is silent.
 */
export function logError(context: string, error: unknown): void {
  if (!import.meta.env.DEV) return;
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : error instanceof Error
        ? error.name
        : 'unknown';
  console.error(`[lunelle] ${context} failed (${code})`);
}
