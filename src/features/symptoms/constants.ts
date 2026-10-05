import type { ChoiceOption } from '@/components/ui/Form';
import { MOODS, SYMPTOM_KEYS, type Mood, type SymptomKey } from '@/types/domain';

export const SYMPTOM_LABELS: Record<SymptomKey, string> = {
  cramps: 'Cramps',
  headache: 'Headache',
  bloating: 'Bloating',
  breast_tenderness: 'Breast tenderness',
  fatigue: 'Fatigue',
  acne: 'Acne',
  back_pain: 'Back pain',
  nausea: 'Nausea',
  other: 'Other',
};

export const MOOD_META: Record<Mood, { label: string; emoji: string }> = {
  happy: { label: 'Happy', emoji: '😊' },
  normal: { label: 'Normal', emoji: '🙂' },
  sad: { label: 'Sad', emoji: '😢' },
  irritated: { label: 'Irritated', emoji: '😤' },
  anxious: { label: 'Anxious', emoji: '😟' },
  tired: { label: 'Tired', emoji: '😴' },
};

export const SYMPTOM_OPTIONS: ChoiceOption<SymptomKey>[] = SYMPTOM_KEYS.map((value) => ({
  value,
  label: SYMPTOM_LABELS[value],
}));

export const MOOD_OPTIONS: ChoiceOption<Mood>[] = MOODS.map((value) => ({
  value,
  label: MOOD_META[value].label,
  icon: MOOD_META[value].emoji,
}));
