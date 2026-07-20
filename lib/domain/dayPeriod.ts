export type DayPeriod = 'morning' | 'midday' | 'evening';

// Fixed boundaries for now; a future per-user work-day setting can replace this single
// function without touching any of its call sites.
export function getDayPeriod(date = new Date()): DayPeriod {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'midday';
  return 'evening';
}
