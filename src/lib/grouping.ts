import { formatDate, type ISODate } from './dates';

export interface MonthGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** Group already-sorted items by calendar month, preserving order. */
export function groupByMonth<T>(items: readonly T[], getDate: (item: T) => ISODate): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const item of items) {
    const date = getDate(item);
    const key = date.slice(0, 7);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: formatDate(date, 'MMMM yyyy'), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
