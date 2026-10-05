import { Link } from 'react-router';
import { ChevronRight, Users } from 'lucide-react';
import { usePartnerAccess } from '../PartnerAccessProvider';

/** Dashboard entry point to invitations and shared cycles. */
export function PartnerBanner() {
  const { incoming } = usePartnerAccess();
  if (incoming.length === 0) return null;

  const pending = incoming.filter((s) => s.status === 'pending');
  const accepted = incoming.filter((s) => s.status === 'accepted');
  const message =
    pending.length > 0
      ? `${pending[0].ownerName} invited you to view their cycle.`
      : accepted.length === 1
        ? `View ${accepted[0].ownerName}’s shared cycle.`
        : `View the ${accepted.length} cycles shared with you.`;

  return (
    <Link
      to="/partner"
      className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 text-sm text-accent-ink transition-colors hover:border-accent"
    >
      <Users className="size-5 shrink-0" aria-hidden />
      <span className="flex-1 font-medium">{message}</span>
      <span className="flex items-center gap-0.5 font-medium">
        {pending.length > 0 ? 'Review' : 'Open'}
        <ChevronRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}
