import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireUserId, AuthError } from '../../lib/server/auth';
import type { UserProfile } from '../../types/healthhomie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = requireUserId(req);
    const sql = getSql();

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM user_profile WHERE "userId" = ${userId}`;
      if (rows[0]) return res.status(200).json(toProfile(userId, rows[0]));

      const now = new Date().toISOString();
      const starter: UserProfile = { id: userId, goalType: 'improve-consistency', activityMultiplier: 1.2, createdAt: now, updatedAt: now };
      await upsertProfile(userId, starter);
      return res.status(200).json(starter);
    }

    if (req.method === 'PUT') {
      const profile = (req.body ?? {}) as UserProfile;
      if (!profile.goalType) return res.status(400).json({ error: 'goalType is required.' });
      await upsertProfile(userId, profile);
      return res.status(204).end();
    }

    res.status(405).json({ error: 'GET or PUT only.' });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error.' });
  }
}

async function upsertProfile(userId: string, profile: UserProfile) {
  const sql = getSql();
  await sql`
    INSERT INTO user_profile ("userId", age, sex, "heightCm", "currentWeightKg", "targetWeightKg", "goalType", "activityMultiplier", "createdAt", "updatedAt")
    VALUES (${userId}, ${profile.age ?? null}, ${profile.sex ?? null}, ${profile.heightCm ?? null}, ${profile.currentWeightKg ?? null}, ${profile.targetWeightKg ?? null}, ${profile.goalType}, ${profile.activityMultiplier}, ${profile.createdAt}, ${profile.updatedAt})
    ON CONFLICT ("userId") DO UPDATE SET
      age = EXCLUDED.age, sex = EXCLUDED.sex, "heightCm" = EXCLUDED."heightCm",
      "currentWeightKg" = EXCLUDED."currentWeightKg", "targetWeightKg" = EXCLUDED."targetWeightKg",
      "goalType" = EXCLUDED."goalType", "activityMultiplier" = EXCLUDED."activityMultiplier", "updatedAt" = EXCLUDED."updatedAt"
  `;
}

function toProfile(userId: string, row: Record<string, unknown>): UserProfile {
  return { ...row, id: userId } as unknown as UserProfile;
}
