import { Checkbox } from '@/components/ui/Form';
import type { ShareScopes } from '../services/partnerService';

/** Owner-controlled switches for what a partner can see. */
export function ShareScopeFields({
  value,
  onChange,
  disabled,
}: {
  value: ShareScopes;
  onChange: (next: ShareScopes) => void;
  disabled?: boolean;
}) {
  const notesAvailable = value.symptoms || value.intimacy;
  const set = (patch: Partial<ShareScopes>) => {
    const next = { ...value, ...patch };
    if (!next.symptoms && !next.intimacy) next.notes = false;
    onChange(next);
  };

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-ink">What your partner can see</legend>
      <p className="text-xs text-ink-muted">
        Always included: your cycle phases, period dates and estimates (next period, ovulation, fertile window).
      </p>
      <Checkbox
        label="Symptoms & mood"
        checked={value.symptoms}
        onChange={(e) => set({ symptoms: e.target.checked })}
      />
      <Checkbox
        label="Intimacy records"
        description="Date and time, protection, and emergency contraception."
        checked={value.intimacy}
        onChange={(e) => set({ intimacy: e.target.checked })}
      />
      <Checkbox
        label="Include notes"
        description={notesAvailable ? 'Your written notes on shared symptoms and intimacy records.' : 'Share symptoms or intimacy records first.'}
        checked={value.notes}
        disabled={!notesAvailable}
        onChange={(e) => set({ notes: e.target.checked })}
      />
      <Checkbox
        label="Allow adding and editing"
        description="Your partner can log periods, and symptoms or intimacy if shared, and fix mistakes. They can never delete anything, and records they add are labelled."
        checked={value.canEdit}
        onChange={(e) => set({ canEdit: e.target.checked })}
      />
    </fieldset>
  );
}
