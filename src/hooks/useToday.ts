import { useEffect, useState } from 'react';
import { todayISO, type ISODate } from '@/lib/dates';

/**
 * Today's local calendar date, refreshed when the app regains focus or the
 * date rolls over — so a PWA left open overnight shows the right cycle day.
 */
export function useToday(): ISODate {
  const [today, setToday] = useState<ISODate>(() => todayISO());

  useEffect(() => {
    const refresh = () => setToday((prev) => {
      const now = todayISO();
      return now === prev ? prev : now;
    });
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}
