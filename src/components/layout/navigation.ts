import { CalendarDays, ChartColumn, Heart, House, Settings, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/intimacy', label: 'Intimacy', icon: Heart },
  { to: '/insights', label: 'Insights', icon: ChartColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Shown only when someone has shared their cycle with (or invited) the user. */
export const PARTNER_NAV_ITEM: NavItem = { to: '/partner', label: 'Shared', icon: Users };
