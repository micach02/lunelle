// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildInviteEmail, sanitizeName } from '../../supabase/functions/send-partner-invite/email.ts';

describe('partner invitation email', () => {
  const email = buildInviteEmail({
    inviterName: 'Sarah',
    partnerEmail: 'alex@example.com',
    appUrl: 'https://lunelle.example.com/',
  });

  it('links to the partner page on the configured app URL', () => {
    expect(email.text).toContain('https://lunelle.example.com/partner');
    expect(email.html).toContain('href="https://lunelle.example.com/partner"');
  });

  it('keeps a sub-path such as GitHub Pages and drops query strings', () => {
    const pages = buildInviteEmail({
      inviterName: 'Sarah',
      partnerEmail: 'alex@example.com',
      appUrl: 'https://micach02.github.io/lunelle/?utm=x#top',
    });
    expect(pages.text).toContain('https://micach02.github.io/lunelle/partner');
  });

  it('names the inviter and the address to sign up with', () => {
    expect(email.subject).toBe('Sarah invited you to Lunelle');
    expect(email.text).toContain('alex@example.com');
  });

  it('contains no health data', () => {
    for (const word of ['period started', 'ovulation on', 'fertile', 'intimacy', 'symptom']) {
      expect(email.text.toLowerCase()).not.toContain(word);
    }
  });

  it('escapes user-controlled names in HTML and flattens them in the subject', () => {
    const hostile = buildInviteEmail({
      inviterName: '<img src=x onerror=alert(1)>\r\nBcc: evil@example.com',
      partnerEmail: 'alex@example.com',
      appUrl: 'https://lunelle.example.com',
    });
    expect(hostile.html).not.toContain('<img');
    expect(hostile.html).toContain('&lt;img');
    expect(hostile.subject).not.toMatch(/[\r\n]/);
  });

  it('falls back when the inviter has no name and caps long names', () => {
    expect(sanitizeName('   ')).toBe('Someone you know');
    expect(sanitizeName('x'.repeat(200))).toHaveLength(80);
  });
});
