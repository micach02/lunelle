// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  appBase,
  buildInviteEmail,
  buildSignInEmail,
  requestLinkUrl,
  sanitizeName,
} from '../../supabase/functions/_shared/email.ts';

const LINK = 'https://micach02.github.io/lunelle/shared-access?token_hash=abc&type=magiclink';
const APP = 'https://micach02.github.io/lunelle/';

describe('app URLs', () => {
  it('keeps a sub-path such as GitHub Pages and drops query strings', () => {
    expect(appBase('https://micach02.github.io/lunelle/?utm=x#top')).toBe('https://micach02.github.io/lunelle');
    expect(appBase('https://lunelle.example.com/')).toBe('https://lunelle.example.com');
    expect(requestLinkUrl(APP)).toBe('https://micach02.github.io/lunelle/shared-access');
  });
});

describe('partner invitation email', () => {
  const email = buildInviteEmail({ inviterName: 'Sarah', signInLink: LINK, appUrl: APP });

  it('contains the one-time sign-in link and says no sign-up is needed', () => {
    expect(email.subject).toBe('Sarah invited you to Lunelle');
    expect(email.text).toContain(LINK);
    expect(email.html).toContain(`href="${LINK.replace(/&/g, '&amp;')}"`);
    expect(email.text).toMatch(/No sign-up needed/);
  });

  it('tells the partner where to get a new link', () => {
    expect(email.text).toContain('https://micach02.github.io/lunelle/shared-access');
  });

  it('contains no health data', () => {
    for (const word of ['period started', 'ovulation on', 'fertile', 'intimacy', 'symptom']) {
      expect(email.text.toLowerCase()).not.toContain(word);
    }
  });

  it('escapes user-controlled names in HTML and flattens them in the subject', () => {
    const hostile = buildInviteEmail({
      inviterName: '<img src=x onerror=alert(1)>\r\nBcc: evil@example.com',
      signInLink: LINK,
      appUrl: APP,
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

describe('sign-in email', () => {
  it('contains only the link and no inviter or health details', () => {
    const email = buildSignInEmail({ signInLink: LINK, appUrl: APP });
    expect(email.subject).toBe('Your Lunelle sign-in link');
    expect(email.text).toContain(LINK);
    expect(email.text.toLowerCase()).not.toMatch(/fertile|intimacy|symptom/);
  });
});
