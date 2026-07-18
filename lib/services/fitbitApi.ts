import type { HealthMetricsDaily } from '@/types/healthhomie';

export const FITBIT_AUTHORIZE_URL = 'https://www.fitbit.com/oauth2/authorize';
export const FITBIT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token';
export const FITBIT_API_BASE = 'https://api.fitbit.com';
export const FITBIT_SCOPES = 'activity heartrate sleep';

export type FitbitTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  user_id?: string;
};

export function buildFitbitAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string }): string {
  const url = new URL(FITBIT_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', FITBIT_SCOPES);
  url.searchParams.set('state', params.state);
  return url.toString();
}

export async function exchangeFitbitCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<FitbitTokenResponse> {
  return requestFitbitToken(params.clientId, params.clientSecret, {
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
  });
}

export async function refreshFitbitToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<FitbitTokenResponse> {
  return requestFitbitToken(params.clientId, params.clientSecret, {
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
  });
}

/** Fitbit's token endpoint authenticates the client via HTTP Basic (base64 client_id:client_secret), not a body param. */
async function requestFitbitToken(clientId: string, clientSecret: string, body: Record<string, string>): Promise<FitbitTokenResponse> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(FITBIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams(body),
  });
  if (!response.ok) throw new Error(`Fitbit token request failed: ${response.status} ${await response.text()}`);
  return response.json();
}

type FitbitTimeSeriesEntry = { dateTime: string; value: string };
type FitbitSleepLog = { dateOfSleep: string; minutesAsleep: number; isMainSleep?: boolean };

/**
 * Steps and active calories come from Fitbit's per-metric time-series endpoints (one ranged
 * request each, rather than looping per day); sleep has its own ranged endpoint. Fitbit's public
 * API doesn't expose the normalized 0-100 readiness/sleep/activity scores Oura provides (those
 * are gated behind Fitbit's own premium "Daily Readiness" feature) — left out rather than
 * approximating something misleading.
 */
export async function fetchFitbitDailyMetrics(params: { accessToken: string; start: string; end: string }): Promise<HealthMetricsDaily[]> {
  const [steps, activityCalories, sleep] = await Promise.all([
    fetchFitbitTimeSeries('steps', params),
    fetchFitbitTimeSeries('activityCalories', params),
    fetchFitbitSleepRange(params),
  ]);

  const byDate = new Map<string, HealthMetricsDaily>();
  const get = (day: string) => {
    const existing = byDate.get(day);
    if (existing) return existing;
    const created: HealthMetricsDaily = { date: day, provider: 'fitbit' };
    byDate.set(day, created);
    return created;
  };

  for (const entry of steps) {
    const value = Number(entry.value);
    if (Number.isFinite(value)) get(entry.dateTime).steps = value;
  }
  for (const entry of activityCalories) {
    const value = Number(entry.value);
    if (Number.isFinite(value)) get(entry.dateTime).activeEnergyKcal = value;
  }
  for (const entry of sleep) get(entry.dateOfSleep).sleepMinutes = entry.minutesAsleep;

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

async function fetchFitbitTimeSeries(resource: string, params: { accessToken: string; start: string; end: string }): Promise<FitbitTimeSeriesEntry[]> {
  const url = `${FITBIT_API_BASE}/1/user/-/activities/${resource}/date/${params.start}/${params.end}.json`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${params.accessToken}` } });
  if (!response.ok) throw new Error(`Fitbit ${resource} request failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  return payload[`activities-${resource}`] ?? [];
}

async function fetchFitbitSleepRange(params: { accessToken: string; start: string; end: string }): Promise<FitbitSleepLog[]> {
  const url = `${FITBIT_API_BASE}/1.2/user/-/sleep/date/${params.start}/${params.end}.json`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${params.accessToken}` } });
  if (!response.ok) throw new Error(`Fitbit sleep request failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  return (payload.sleep ?? []).filter((log: FitbitSleepLog) => log.isMainSleep !== false);
}
