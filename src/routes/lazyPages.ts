import { lazy } from 'react';

// Charts (Recharts) are only needed on Insights — keep them out of the main bundle.
export const InsightsPage = lazy(() => import('@/pages/InsightsPage'));
