import { Suspense, useMemo, useState } from 'react';
import { Outlet } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { NAV_ITEMS, PARTNER_NAV_ITEM } from '@/components/layout/navigation';
import { PartnerAccessProvider, usePartnerAccess } from '@/features/partner/PartnerAccessProvider';
import { useViewerMode } from '@/features/partner/useViewerMode';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useAuth } from '@/features/auth/AuthProvider';
import { QuickAddDialog } from '@/features/tracking/QuickAddDialog';
import { OwnRecordDialogsProvider } from '@/features/tracking/RecordDialogs';
import { TrackingDataProvider, useTracking } from '@/features/tracking/TrackingDataProvider';

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-5">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-56 w-full rounded-card" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
      </div>
    </div>
  );
}

function TrackingGate() {
  const { status, error, reload } = useTracking();
  if (status === 'loading') return <PageSkeleton />;
  if (status === 'error') {
    return <ErrorState title="We couldn’t load your data" message={error ?? ''} onRetry={reload} />;
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
    </Suspense>
  );
}

function Shell() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { incoming } = usePartnerAccess();
  const viewerMode = useViewerMode();
  const settingsItem = NAV_ITEMS[NAV_ITEMS.length - 1];
  const navItems = useMemo(() => {
    if (viewerMode) return [PARTNER_NAV_ITEM, settingsItem];
    if (incoming.length > 0) return [...NAV_ITEMS.slice(0, -1), PARTNER_NAV_ITEM, settingsItem];
    return NAV_ITEMS;
  }, [viewerMode, incoming.length, settingsItem]);
  return (
    <AppShell onQuickAdd={viewerMode ? undefined : () => setQuickAddOpen(true)} navItems={navItems}>
      <TrackingGate />
      <QuickAddDialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </AppShell>
  );
}

/** Everything behind sign-in. Keyed by user so data never leaks between sessions. */
export function AuthenticatedApp() {
  const { user } = useAuth();
  if (!user) return null;
  const fallbackName = typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : null;
  return (
    <TrackingDataProvider key={user.id} userId={user.id} fallbackName={fallbackName}>
      <PartnerAccessProvider key={user.id}>
        <OwnRecordDialogsProvider>
          <Shell />
        </OwnRecordDialogsProvider>
      </PartnerAccessProvider>
    </TrackingDataProvider>
  );
}
