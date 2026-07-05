import type { HealthMetricsDaily } from '@/types/healthhomie';

export const OURA_AUTHORIZE_URL = 'https://cloud.ouraring.com/oauth/authorize';
export const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';
export const OURA_API_BASE = 'https://api.ouraring.com/v2/usercollection';
export const OURA_SCOPES = 'personal daily heartrate workout';

export type OuraTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

export function buildOuraAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string }): string {
  const url = new URL(OURA_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', OURA_SCOPES);
  url.searchParams.set('state', params.state);
  return url.toString();
}

export async function exchangeOuraCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<OuraTokenResponse> {
  return requestOuraToken({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
}

export async function refreshOuraToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<OuraTokenResponse> {
  return requestOuraToken({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
}

async function requestOuraToken(body: Record<string, string>): Promise<OuraTokenResponse> {
  const response = await fetch(OURA_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  if (!response.ok) throw new Error(`Oura token request failed: ${response.status} ${await response.text()}`);
  return response.json();
}

type OuraDailyActivity = { day: string; steps?: number; active_calories?: number; total_calories?: number };
type OuraDailySleep = { day: string; score?: number };
type OuraDailyReadiness = { day: string; score?: number };

/**
 * Pulls the three most stable Oura v2 daily endpoints. Resting heart rate / HRV / SpO2 live on
 * other endpoints with contributor sub-objects whose exact shape needs verifying against a real
 * token before wiring up — left out of normalization for now rather than guessing field names.
 */
export async function fetchOuraDailyMetrics(params: {
  accessToken: string;
  start: string;
  end: string;
}): Promise<HealthMetricsDaily[]> {
  const [activity, sleep, readiness] = await Promise.all([
    fetchOuraCollection<OuraDailyActivity>('daily_activity', params),
    fetchOuraCollection<OuraDailySleep>('daily_sleep', params),
    fetchOuraCollection<OuraDailyReadiness>('daily_readiness', params),
  ]);

  const byDate = new Map<string, HealthMetricsDaily>();
  const get = (day: string) => {
    const existing = byDate.get(day);
    if (existing) return existing;
    const created: HealthMetricsDaily = { date: day, provider: 'oura' };
    byDate.set(day, created);
    return created;
  };

  for (const entry of activity) {
    const metric = get(entry.day);
    metric.steps = entry.steps;
    metric.activeEnergyKcal = entry.active_calories;
    metric.totalEnergyKcal = entry.total_calories;
  }
  for (const entry of sleep) get(entry.day).sleepScore = entry.score;
  for (const entry of readiness) get(entry.day).readinessScore = entry.score;

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

async function fetchOuraCollection<T>(resource: string, params: { accessToken: string; start: string; end: string }): Promise<T[]> {
  const url = new URL(`${OURA_API_BASE}/${resource}`);
  url.searchParams.set('start_date', params.start);
  url.searchParams.set('end_date', params.end);
  const response = await fetch(url, { headers: { authorization: `Bearer ${params.accessToken}` } });
  if (!response.ok) throw new Error(`Oura ${resource} request failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  return payload.data ?? [];
}
