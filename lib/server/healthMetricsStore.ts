import { getSql } from './db';
import type { HealthMetricsDaily } from '../../types/healthhomie';

/** Shared by every provider sync (Oura, Fitbit, ...) — same table, keyed by (userId, date, provider). */
export async function upsertHealthMetrics(userId: string, metrics: HealthMetricsDaily[]): Promise<void> {
  const sql = getSql();
  for (const metric of metrics) {
    await sql`
      INSERT INTO health_metrics_daily ("userId", date, provider, steps, "activeEnergyKcal", "totalEnergyKcal", "sleepMinutes", "sleepScore", "readinessScore", "activityScore")
      VALUES (${userId}, ${metric.date}, ${metric.provider}, ${metric.steps ?? null}, ${metric.activeEnergyKcal ?? null}, ${metric.totalEnergyKcal ?? null}, ${metric.sleepMinutes ?? null}, ${metric.sleepScore ?? null}, ${metric.readinessScore ?? null}, ${metric.activityScore ?? null})
      ON CONFLICT ("userId", date, provider) DO UPDATE SET
        steps = EXCLUDED.steps, "activeEnergyKcal" = EXCLUDED."activeEnergyKcal", "totalEnergyKcal" = EXCLUDED."totalEnergyKcal",
        "sleepMinutes" = EXCLUDED."sleepMinutes", "sleepScore" = EXCLUDED."sleepScore", "readinessScore" = EXCLUDED."readinessScore", "activityScore" = EXCLUDED."activityScore"
    `;
  }
}
