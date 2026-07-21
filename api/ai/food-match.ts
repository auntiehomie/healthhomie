import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { requireUserId, AuthError } from '../../lib/server/auth';

const MODEL = 'claude-haiku-4-5';

type Candidate = { id: number; title: string; restaurantChain: string };
type MatchResult = { bestMatchId: number | null; note: string };

// Haiku occasionally wraps its answer in a markdown code fence or adds a stray sentence despite
// being told not to - strip fences and fall back to grabbing the first {...} object before
// giving up, rather than failing on the first strict JSON.parse attempt.
function parseFoodMatchResponse(text: string): MatchResult | null {
  const candidates = [text, text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()];
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) candidates.push(braceMatch[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && (typeof parsed.bestMatchId === 'number' || parsed.bestMatchId === null) && typeof parsed.note === 'string') {
        return { bestMatchId: parsed.bestMatchId, note: parsed.note };
      }
    } catch {
      // try the next candidate shape
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    requireUserId(req);

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'POST only.' });
    }

    const { query, candidates } = (req.body ?? {}) as { query?: string; candidates?: Candidate[] };
    if (!query || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: 'query and a non-empty candidates array are required.' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured.' });

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system:
        'You match a food journal search query against a list of real restaurant menu items and pick the single closest match, if any. ' +
        'Only ever choose an id from the given list of candidates - never invent an item or estimate nutrition yourself. ' +
        'Respond with ONLY a JSON object, no other text and no markdown code fences: {"bestMatchId": <id number or null>, "note": "<one short, friendly sentence>"}. ' +
        "If nothing in the list is a reasonable match for what the person is looking for, set bestMatchId to null and say so briefly and kindly in note.",
      messages: [{ role: 'user', content: JSON.stringify({ query, candidates }) }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    const parsed = parseFoodMatchResponse(text);
    if (!parsed) {
      console.error(`AI food-match returned unparsable text for query "${query}":`, text.slice(0, 500));
      return res.status(502).json({ error: 'AI returned an unexpected response. Try again.' });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error.' });
  }
}
