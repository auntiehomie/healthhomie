import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;

/** Lazy so a missing DATABASE_URL surfaces as a clean 503 from the route's own try/catch, not a cold-start crash. */
export function getSql(): NeonQueryFunction<false, false> {
  if (client) return client;
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new DatabaseNotConfiguredError();
  }
  client = neon(connectionString);
  return client;
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL (or POSTGRES_URL) is not configured. Add a Postgres store in the Vercel dashboard.');
  }
}
