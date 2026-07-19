import { shiftDateKey } from './nutrition';

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

/**
 * Which completed 7-day review period `today` falls in, relative to `planStart` (1-indexed —
 * index 1 covers planStart..planStart+6). Returns null until the first full week has elapsed,
 * so nothing is shown before there's a week's worth of data to review.
 */
export function currentReviewWeekIndex(planStart: string, today: string): number | null {
  const elapsed = daysBetween(planStart, today);
  if (elapsed < 7) return null;
  return Math.floor(elapsed / 7);
}

export function reviewWeekRange(planStart: string, weekIndex: number): { start: string; end: string } {
  return {
    start: shiftDateKey(planStart, (weekIndex - 1) * 7),
    end: shiftDateKey(planStart, weekIndex * 7 - 1),
  };
}

export function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let date = start; date <= end; date = shiftDateKey(date, 1)) dates.push(date);
  return dates;
}
