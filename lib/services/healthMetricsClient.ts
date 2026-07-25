import { apiUrl, getToken } from '@/lib/services/authClient';
import type { HealthSnapshot } from '@/types/healthhomie';

/** Merged snapshot from whichever health providers are connected (Oura today, others later) — not device-local. */
export async function getLatestHealthSnapshot(): Promise<HealthSnapshot> {
  const token = await getToken();
  const date = new Date().toISOString().slice(0, 10);
  if (!token) return { date };

  const response = await fetch(apiUrl('/api/data/health-metrics'), { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return { date };
  return response.json();
}

export type HealthMetricsHistoryDay = { date: string; readinessScore?: number; sleepScore?: number };

/** Per-day readiness/sleep history — not device-local, used to correlate against food/mood/routine logs. */
export async function getHealthMetricsHistory(days = 30): Promise<HealthMetricsHistoryDay[]> {
  const token = await getToken();
  if (!token) return [];

  const response = await fetch(apiUrl(`/api/data/health-metrics-history?days=${days}`), { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return [];
  const payload = await response.json();
  return payload.metrics ?? [];
}
