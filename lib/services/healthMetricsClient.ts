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
