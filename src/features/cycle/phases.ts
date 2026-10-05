import type { CyclePhase } from './services/cycleCalculator';

export interface PhaseMeta {
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  /** Tailwind classes — literal strings so the compiler can see them. */
  softBg: string;
  text: string;
  stroke: string;
  fill: string;
  border: string;
}

export const PHASE_ORDER: CyclePhase[] = ['menstruation', 'follicular', 'ovulation', 'luteal'];

export const PHASES: Record<CyclePhase, PhaseMeta> = {
  menstruation: {
    label: 'Menstruation',
    shortLabel: 'Period',
    emoji: '🩸',
    description:
      'Your period. The uterine lining sheds, usually over 3–7 days. Energy can dip — rest is productive too.',
    softBg: 'bg-phase-menstruation-soft',
    text: 'text-phase-menstruation',
    stroke: 'stroke-phase-menstruation',
    fill: 'fill-phase-menstruation',
    border: 'border-phase-menstruation',
  },
  follicular: {
    label: 'Follicular phase',
    shortLabel: 'Follicular',
    emoji: '🌱',
    description:
      'After your period, rising estrogen helps an egg mature and the uterine lining rebuild. Many people notice energy returning.',
    softBg: 'bg-phase-follicular-soft',
    text: 'text-phase-follicular',
    stroke: 'stroke-phase-follicular',
    fill: 'fill-phase-follicular',
    border: 'border-phase-follicular',
  },
  ovulation: {
    label: 'Ovulation',
    shortLabel: 'Ovulation',
    emoji: '🥚',
    description:
      'The estimated time an egg is released, based on your recorded cycle. The days just before and around it are the most fertile.',
    softBg: 'bg-phase-ovulation-soft',
    text: 'text-phase-ovulation',
    stroke: 'stroke-phase-ovulation',
    fill: 'fill-phase-ovulation',
    border: 'border-phase-ovulation',
  },
  luteal: {
    label: 'Luteal phase',
    shortLabel: 'Luteal',
    emoji: '🌙',
    description:
      'After estimated ovulation, progesterone rises. Some people notice premenstrual symptoms like bloating or mood changes toward the end.',
    softBg: 'bg-phase-luteal-soft',
    text: 'text-phase-luteal',
    stroke: 'stroke-phase-luteal',
    fill: 'fill-phase-luteal',
    border: 'border-phase-luteal',
  },
};
