import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Simple in-memory rate limiter for Vercel serverless functions.
 * Uses a sliding window per IP address. Each function instance keeps its own
 * map, so this is a best-effort throttle (sufficient for brute-force protection
 * on auth endpoints). For stricter limits, upgrade to Vercel KV or Upstash.
 */

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

interface RateLimitOptions {
  /** Max requests allowed within the window. */
  max: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

/**
 * Returns true if the request should be rate-limited (429).
 * Call this at the top of a handler before doing any work.
 */
export function rateLimit(
  req: VercelRequest,
  res: VercelResponse,
  options: RateLimitOptions,
): boolean {
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string | undefined) ||
    'unknown';

  const key = `${req.url || req.method}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return false;
  }

  bucket.count++;
  if (bucket.count > options.max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return true;
  }

  return false;
}

// Auth-specific presets
export function authRateLimit(req: VercelRequest, res: VercelResponse): boolean {
  // 10 attempts per 15 minutes per IP — tight enough to block brute-force,
  // loose enough for legitimate retries after typos.
  return rateLimit(req, res, { max: 10, windowMs: 15 * 60 * 1000 });
}

// Password reset is stricter — 3 per hour per IP
export function passwordResetRateLimit(req: VercelRequest, res: VercelResponse): boolean {
  return rateLimit(req, res, { max: 3, windowMs: 60 * 60 * 1000 });
}
