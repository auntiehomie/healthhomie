import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireUserId, AuthError } from '../../lib/server/auth';

type SurveyPayload = {
  heightCm?: number | null;
  weightCiphertext?: string | null;
  weightSalt?: string | null;
  weightIv?: string | null;
  movement?: string | null;
  goals?: string | null;
  notesHabit?: string | null;
  notesReviewFrequency?: string | null;
  notesSystem?: string | null;
  notesChallenge?: string | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = requireUserId(req);
    const sql = getSql();

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM survey_responses WHERE "userId" = ${userId}`;
      return res.status(200).json({ survey: rows[0] ?? null });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = (req.body ?? {}) as SurveyPayload;
      const now = new Date().toISOString();
      const rows = await sql`
        INSERT INTO survey_responses (
          "userId", "heightCm", "weightCiphertext", "weightSalt", "weightIv",
          movement, goals, "notesHabit", "notesReviewFrequency", "notesSystem", "notesChallenge",
          "createdAt", "updatedAt"
        ) VALUES (
          ${userId}, ${body.heightCm ?? null}, ${body.weightCiphertext ?? null}, ${body.weightSalt ?? null}, ${body.weightIv ?? null},
          ${body.movement ?? null}, ${body.goals ?? null}, ${body.notesHabit ?? null}, ${body.notesReviewFrequency ?? null},
          ${body.notesSystem ?? null}, ${body.notesChallenge ?? null}, ${now}, ${now}
        )
        ON CONFLICT ("userId") DO UPDATE SET
          "heightCm" = EXCLUDED."heightCm",
          "weightCiphertext" = EXCLUDED."weightCiphertext",
          "weightSalt" = EXCLUDED."weightSalt",
          "weightIv" = EXCLUDED."weightIv",
          movement = EXCLUDED.movement,
          goals = EXCLUDED.goals,
          "notesHabit" = EXCLUDED."notesHabit",
          "notesReviewFrequency" = EXCLUDED."notesReviewFrequency",
          "notesSystem" = EXCLUDED."notesSystem",
          "notesChallenge" = EXCLUDED."notesChallenge",
          "updatedAt" = EXCLUDED."updatedAt"
        RETURNING *
      `;
      return res.status(200).json({ survey: rows[0] });
    }

    res.setHeader('Allow', 'GET, POST, PUT');
    res.status(405).json({ error: 'GET, POST, or PUT only.' });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Survey request failed.' });
  }
}
