import type { HealthMetricsDaily } from '@/types/healthhomie';

/** Capability declaration, not a simulated connection. Transport requires owner setup. */
export const GARMIN_SYNC_CAPABILITIES = {
  connected: false, dailySummaryImport: true, nutritionWrite: false,
  reason: 'Garmin transport is not configured. Multi-user access requires a Garmin developer app; nutrition write-back is not implemented or advertised.',
} as const;

/** Isolated daily-summary mapping for a future authenticated Garmin delivery adapter.
 * Caller must authenticate the provider and resolve its user to a local account before storing.
 * No network requests, credentials, or writes happen here. Confirm fields against the owner\'s
 * approved API schema before enabling transport; test fixtures are synthetic, not live data. */
export function normalizeGarminDailySummary(value: unknown): HealthMetricsDaily | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const summary = value as Record<string, unknown>;
  if (typeof summary.calendarDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(summary.calendarDate)) return null;
  const date = new Date(`${summary.calendarDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== summary.calendarDate) return null;
  const metric: HealthMetricsDaily = { date: summary.calendarDate, provider: 'garmin' };
  const fields = [
    ['steps', 'steps', 200_000],
    ['activeKilocalories', 'activeEnergyKcal', 30_000],
    ['totalKilocalories', 'totalEnergyKcal', 40_000],
  ] as const;
  for (const [source, target, max] of fields) {
    const amount = summary[source];
    if (amount == null) continue;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > max || (source === 'steps' && !Number.isInteger(amount))) return null;
    metric[target] = amount;
  }
  return metric;
}
