import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PartnerSharingSection } from '@/features/partner/components/PartnerSharingSection';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { AccountSection } from '@/features/settings/components/AccountSection';
import { CycleSettingsForm } from '@/features/settings/components/CycleSettingsForm';
import { PrivacySection } from '@/features/settings/components/PrivacySection';
import { ProfileForm } from '@/features/settings/components/ProfileForm';

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <Card aria-labelledby={id}>
      <CardHeader title={<span id={id}>{title}</span>} description={description} />
      {children}
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />
      <Section id="profile-heading" title="Profile">
        <ProfileForm />
      </Section>
      <Section id="cycle-heading" title="Cycle settings" description="Starting values for your estimates.">
        <CycleSettingsForm />
      </Section>
      <Section
        id="partner-heading"
        title="Partner sharing"
        description="Let a partner view your cycle. View-only, and you can stop at any time."
      >
        <PartnerSharingSection />
        <p className="mt-4 text-sm text-ink-muted">
          Has someone shared with you?{' '}
          <Link to="/partner" className="font-medium text-accent hover:underline">
            Shared with you
          </Link>
        </p>
      </Section>
      <Section id="privacy-heading" title="Privacy" description="How Lunelle stores and protects your data.">
        <PrivacySection />
      </Section>
      <Section id="account-heading" title="Account">
        <AccountSection />
      </Section>
    </div>
  );
}
