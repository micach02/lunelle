import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { PartnerSharingSection } from '@/features/partner/components/PartnerSharingSection';
import { useViewerMode } from '@/features/partner/useViewerMode';
import { useRecordDialogs } from '@/features/tracking/RecordDialogs';
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

/** Shown instead of cycle settings to people who only view a shared cycle. */
function OwnTrackingCard() {
  const dialogs = useRecordDialogs();
  return (
    <Section id="tracking-heading" title="Your own tracking">
      <p className="text-sm text-ink-muted">
        Lunelle is set up for viewing a cycle shared with you, so there’s nothing for you to record. If you’d also like to
        track a cycle of your own, you can start at any time.
      </p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={() => dialogs.openPeriod()}>
        Start tracking my own cycle
      </Button>
    </Section>
  );
}

export function SettingsPage() {
  const viewerMode = useViewerMode();
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />
      <Section id="profile-heading" title="Profile">
        <ProfileForm />
      </Section>
      {viewerMode ? (
        <OwnTrackingCard />
      ) : (
        <>
          <Section id="cycle-heading" title="Cycle settings" description="Starting values for your estimates.">
            <CycleSettingsForm />
          </Section>
          <Section
            id="partner-heading"
            title="Partner sharing"
            description="Let a partner see your cycle, and optionally help keep it up to date. You can stop at any time."
          >
            <PartnerSharingSection />
            <p className="mt-4 text-sm text-ink-muted">
              Has someone shared with you?{' '}
              <Link to="/partner" className="font-medium text-accent hover:underline">
                Shared with you
              </Link>
            </p>
          </Section>
        </>
      )}
      <Section id="privacy-heading" title="Privacy" description="How Lunelle stores and protects your data.">
        <PrivacySection />
      </Section>
      <Section id="account-heading" title="Account">
        <AccountSection />
      </Section>
    </div>
  );
}
