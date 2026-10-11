import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { usePartnerAccess } from './PartnerAccessProvider';

/**
 * "Viewer mode": the person has a cycle shared with them (or an invitation)
 * and has never tracked their own. They get a focused app — the shared view
 * and settings — instead of prompts to record periods. Recording a period
 * turns it off automatically.
 */
export function useViewerMode(): boolean {
  const { status, periods } = useTracking();
  const { incoming } = usePartnerAccess();
  return status === 'ready' && periods.length === 0 && incoming.length > 0;
}
