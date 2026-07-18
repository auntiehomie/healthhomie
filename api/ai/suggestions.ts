import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireUserId, AuthError } from '../../lib/server/auth';

const MODEL = 'claude-opus-4-8';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = requireUserId(req);
    const sql = getSql();
    const date = todayKey();

    if (req.method === 'GET') {
      const rows = await sql`SELECT suggestion, "createdAt" FROM ai_suggestions_daily WHERE "userId" = ${userId} AND date = ${date}`;
      return res.status(200).json(rows[0] ? { suggestion: rows[0].suggestion, createdAt: rows[0].createdAt } : { suggestion: null, createdAt: null });
    }

    if (req.method === 'POST') {
      const forceRefresh = !!(req.body ?? {}).forceRefresh;

      if (!forceRefresh) {
        const rows = await sql`SELECT suggestion, "createdAt" FROM ai_suggestions_daily WHERE "userId" = ${userId} AND date = ${date}`;
        if (rows[0]) return res.status(200).json({ suggestion: rows[0].suggestion, createdAt: rows[0].createdAt });
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured.' });

      const [profileRows, healthRows, surveyRows] = await Promise.all([
        sql`SELECT * FROM user_profile WHERE "userId" = ${userId}`,
        sql`SELECT * FROM health_metrics_daily WHERE "userId" = ${userId} ORDER BY date DESC LIMIT 1`,
        sql`SELECT movement, goals FROM survey_responses WHERE "userId" = ${userId}`,
      ]);

      const profile = profileRows[0];
      const health = healthRows[0];
      const survey = surveyRows[0];

      const context = {
        goalType: profile?.goalType ?? 'not set',
        currentWeightKg: profile?.currentWeightKg ?? null,
        targetWeightKg: profile?.targetWeightKg ?? null,
        movementLevel: survey?.movement ?? 'unknown',
        statedGoals: survey?.goals ?? null,
        readinessScore: health?.readinessScore ?? null,
        sleepScore: health?.sleepScore ?? null,
        activityScore: health?.activityScore ?? null,
        metricsDate: health?.date ?? null,
      };

      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        system:
          "You are the AI coach inside Howdy Morning, a health and productivity app. Given a user's latest Oura ring scores and their stated goals, suggest: (1) the best window today for deep focused work, (2) a good time to exercise today, (3) one specific activity suggestion aligned with their goal. Be warm, concise, and specific — use short markdown headers (###) for each of the 3 sections with 1-2 sentences underneath. Keep the whole response under 130 words. If data is missing, give sensible general guidance instead of mentioning the missing data.",
        messages: [{ role: 'user', content: JSON.stringify(context) }],
      });

      const suggestion = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      const createdAt = new Date().toISOString();
      await sql`
        INSERT INTO ai_suggestions_daily ("userId", date, suggestion, "createdAt")
        VALUES (${userId}, ${date}, ${suggestion}, ${createdAt})
        ON CONFLICT ("userId", date) DO UPDATE SET suggestion = EXCLUDED.suggestion, "createdAt" = EXCLUDED."createdAt"
      `;

      return res.status(200).json({ suggestion, createdAt });
    }

    res.status(405).json({ error: 'GET or POST only.' });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    if (error instanceof Anthropic.APIError) return res.status(502).json({ error: `AI suggestion failed: ${error.message}` });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error.' });
  }
}
