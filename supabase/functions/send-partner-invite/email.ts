/**
 * Partner-invitation email content. Pure and dependency-free so it can be
 * unit-tested outside Deno. It deliberately contains NO cycle or health data —
 * only who sent the invitation and how to accept it.
 */

export interface InviteEmail {
  subject: string;
  text: string;
  html: string;
}

const MAX_NAME_LENGTH = 80;

/** Inviter names are user-controlled: flatten whitespace and cap length. */
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

export function buildInviteEmail({
  inviterName,
  partnerEmail,
  appUrl,
}: {
  inviterName: string | null | undefined;
  partnerEmail: string;
  appUrl: string;
}): InviteEmail {
  const name = sanitizeName(inviterName);
  // Keep the app's path (e.g. https://user.github.io/lunelle) but drop any query/hash.
  const app = new URL(appUrl);
  const link = `${app.origin}${app.pathname.replace(/\/+$/, '')}/partner`;
  const subject = `${name} invited you to Lunelle`;

  const text = [
    `${name} has invited you to view their cycle on Lunelle.`,
    '',
    'You’ll see their estimated cycle phases and period dates, plus anything else they choose to share. Access is view-only, and they can stop sharing at any time.',
    '',
    `To accept, sign in to Lunelle — or create an account — using this email address (${partnerEmail}), then open “Shared with you”:`,
    link,
    '',
    'If you weren’t expecting this invitation, you can ignore this email.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f7f4f0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#221c2e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;color:#5b4a8b;">Lunelle</p>
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;">${escapeHtml(name)} invited you to Lunelle</h1>
        <p style="margin:0 0 16px;line-height:1.6;color:#585163;">
          You’ll see their estimated cycle phases and period dates, plus anything else they choose to share.
          Access is view-only, and they can stop sharing at any time.
        </p>
        <p style="margin:0 0 24px;line-height:1.6;color:#585163;">
          To accept, sign in to Lunelle — or create an account — using
          <strong style="color:#221c2e;">${escapeHtml(partnerEmail)}</strong>, then open “Shared with you”.
        </p>
        <p style="margin:0 0 28px;">
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#5b4a8b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:14px;font-weight:600;">Open Lunelle</a>
        </p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6c6577;">
          If you weren’t expecting this invitation, you can ignore this email.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
