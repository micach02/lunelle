/**
 * Partner email content. Pure and dependency-free so it can be unit-tested
 * outside Deno. Emails deliberately contain NO cycle or health data — only
 * who sent the invitation and a one-time sign-in link.
 */

export interface Email {
  subject: string;
  text: string;
  html: string;
}

const MAX_NAME_LENGTH = 80;

/** Inviter names are user-controlled: flatten control characters/whitespace and cap length. */
export function sanitizeName(name: string | null | undefined): string {
  // Control characters (incl. CR/LF, which could break email headers) become spaces.
  const printable = Array.from(name ?? '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  const clean = printable.replace(/\s+/g, ' ').trim();
  return (clean || 'Someone you know').slice(0, MAX_NAME_LENGTH);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "https://user.github.io/lunelle/?x#y" → "https://user.github.io/lunelle" */
export function appBase(appUrl: string): string {
  const app = new URL(appUrl);
  return `${app.origin}${app.pathname.replace(/\/+$/, '')}`;
}

/** Where a partner can ask for a fresh sign-in link. */
export function requestLinkUrl(appUrl: string): string {
  return `${appBase(appUrl)}/shared-access`;
}

function layout(heading: string, paragraphs: string[], button: { label: string; href: string }, footer: string): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#585163;">${p}</p>`)
    .join('\n        ');
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f7f4f0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#221c2e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;color:#5b4a8b;">Lunelle</p>
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;">${heading}</h1>
        ${body}
        <p style="margin:8px 0 28px;">
          <a href="${escapeHtml(button.href)}" style="display:inline-block;background:#5b4a8b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:14px;font-weight:600;">${button.label}</a>
        </p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6c6577;">${footer}</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function buildInviteEmail({
  inviterName,
  signInLink,
  appUrl,
}: {
  inviterName: string | null | undefined;
  /** One-time link that signs the partner in — no account setup needed. */
  signInLink: string;
  appUrl: string;
}): Email {
  const name = sanitizeName(inviterName);
  const again = requestLinkUrl(appUrl);
  const subject = `${name} invited you to Lunelle`;

  const text = [
    `${name} has invited you to view their cycle on Lunelle.`,
    '',
    'You’ll see their estimated cycle phases and period dates, plus anything else they choose to share. Access is view-only, and they can stop sharing at any time.',
    '',
    'No sign-up needed — this link signs you in:',
    signInLink,
    '',
    `The link works once and expires soon. You can always get a new one at ${again}`,
    '',
    'If you weren’t expecting this invitation, you can ignore this email.',
  ].join('\n');

  const html = layout(
    `${escapeHtml(name)} invited you to Lunelle`,
    [
      'You’ll see their estimated cycle phases and period dates, plus anything else they choose to share. Access is view-only, and they can stop sharing at any time.',
      'No sign-up or password needed — the button below signs you in.',
    ],
    { label: 'Open shared view', href: signInLink },
    `The button works once and expires soon. You can always get a new link at <a href="${escapeHtml(again)}" style="color:#5b4a8b;">${escapeHtml(again)}</a>. If you weren’t expecting this invitation, you can ignore this email.`,
  );

  return { subject, text, html };
}

export function buildSignInEmail({ signInLink, appUrl }: { signInLink: string; appUrl: string }): Email {
  const again = requestLinkUrl(appUrl);
  const subject = 'Your Lunelle sign-in link';
  const text = [
    'Here is your link to open the cycle shared with you on Lunelle:',
    signInLink,
    '',
    `The link works once and expires soon. You can request another at ${again}`,
    '',
    'If you didn’t ask for this, you can ignore this email.',
  ].join('\n');
  const html = layout(
    'Your sign-in link',
    ['Use the button below to open the cycle shared with you on Lunelle.'],
    { label: 'Open shared view', href: signInLink },
    'The button works once and expires soon. If you didn’t ask for this, you can ignore this email.',
  );
  return { subject, text, html };
}
