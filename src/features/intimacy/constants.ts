import type { ChoiceOption } from '@/components/ui/Form';
import type { Ejaculation, ProtectionMethod } from '@/types/domain';

export const PROTECTION_LABELS: Record<ProtectionMethod, string> = {
  none: 'No protection',
  condom: 'Condom',
  hormonal_contraception: 'Hormonal contraception',
  withdrawal: 'Withdrawal',
  other: 'Other method',
  unknown: 'Unknown',
};

export const EJACULATION_LABELS: Record<Ejaculation, string> = {
  inside: 'Inside',
  outside: 'Outside',
  unknown: 'Unknown',
  not_applicable: 'Not applicable',
};

export const PROTECTION_OPTIONS: ChoiceOption<ProtectionMethod>[] = (
  Object.keys(PROTECTION_LABELS) as ProtectionMethod[]
).map((value) => ({ value, label: PROTECTION_LABELS[value] }));

export const EJACULATION_CHOICES: ChoiceOption<Ejaculation>[] = (
  Object.keys(EJACULATION_LABELS) as Ejaculation[]
).map((value) => ({ value, label: EJACULATION_LABELS[value] }));
