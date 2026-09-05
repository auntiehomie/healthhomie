import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  buildFitbitAuthorizeUrl,
  exchangeFitbitCode,
  refreshFitbitToken,
  fetchFitbitDailyMetrics,
  FITBIT_AUTHORIZE_URL,
  FITBIT_SCOPES,
} from '../lib/services/fitbitApi';

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('buildFitbitAuthorizeUrl', () => {
  it('builds a correct OAuth authorize URL with required params', () => {
    const url = buildFitbitAuthorizeUrl({
      clientId: 'test_client_id',
      redirectUri: 'https://example.com/api/fitbit/callback',
      state: 'signed_state_token',
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(FITBIT_AUTHORIZE_URL);
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('client_id')).toBe('test_client_id');
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://example.com/api/fitbit/callback');
    expect(parsed.searchParams.get('scope')).toBe(FITBIT_SCOPES);
    expect(parsed.searchParams.get('state')).toBe('signed_state_token');
  });
});

describe('exchangeFitbitCode', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('exchanges authorization code for access token', async () => {
    const tokenResponse = {
      access_token: 'access123',
      refresh_token: 'refresh456',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'activity heartrate sleep',
      user_id: 'fitbit_user_789',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
      text: async () => JSON.stringify(tokenResponse),
    } as any);

    const result = await exchangeFitbitCode({
      code: 'auth_code',
      clientId: 'client_id',
      clientSecret: 'client_secret',
      redirectUri: 'https://example.com/callback',
    });

    expect(result.access_token).toBe('access123');
    expect(result.refresh_token).toBe('refresh456');
    expect(result.expires_in).toBe(3600);

    // Verify fetch was called with correct auth header (Basic)
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.fitbit.com/oauth2/token');
    expect((init as any).method).toBe('POST');
    const authHeader = (init as any).headers.authorization;
    expect(authHeader).toContain('Basic ');
    const decoded = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
    expect(decoded).toBe('client_id:client_secret');
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'invalid_grant',
      json: async () => ({}),
    } as any);

    await expect(
      exchangeFitbitCode({
        code: 'bad_code',
        clientId: 'client_id',
        clientSecret: 'client_secret',
        redirectUri: 'https://example.com/callback',
      }),
    ).rejects.toThrow('Fitbit token request failed: 400');
  });
});

describe('refreshFitbitToken', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('refreshes an expired token', async () => {
    const tokenResponse = {
      access_token: 'new_access',
      refresh_token: 'new_refresh',
      expires_in: 3600,
      token_type: 'Bearer',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
      text: async () => JSON.stringify(tokenResponse),
    } as any);

    const result = await refreshFitbitToken({
      refreshToken: 'old_refresh',
      clientId: 'client_id',
      clientSecret: 'client_secret',
    });

    expect(result.access_token).toBe('new_access');
    expect(result.refresh_token).toBe('new_refresh');

    const body = (mockFetch.mock.calls[0][1] as any).body.toString();
    expect(body).toContain('grant_type=refresh_token');
    expect(body).toContain('refresh_token=old_refresh');
  });

  it('throws when refresh fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'invalid_grant',
      json: async () => ({}),
    } as any);

    await expect(
      refreshFitbitToken({
        refreshToken: 'expired_token',
        clientId: 'client_id',
        clientSecret: 'client_secret',
      }),
    ).rejects.toThrow('Fitbit token request failed: 401');
  });
});

describe('fetchFitbitDailyMetrics', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('fetches and normalizes steps, calories, and sleep data', async () => {
    // Mock 3 API calls: steps, activityCalories, sleep
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          'activities-steps': [
            { dateTime: '2026-08-29', value: '8500' },
            { dateTime: '2026-08-30', value: '10200' },
          ],
        }),
        text: async () => '',
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          'activities-activityCalories': [
            { dateTime: '2026-08-29', value: '450' },
            { dateTime: '2026-08-30', value: '520' },
          ],
        }),
        text: async () => '',
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sleep: [
            { dateOfSleep: '2026-08-29', minutesAsleep: 420, isMainSleep: true },
            { dateOfSleep: '2026-08-30', minutesAsleep: 390, isMainSleep: true },
            { dateOfSleep: '2026-08-30', minutesAsleep: 22, isMainSleep: false }, // nap — should be filtered
          ],
        }),
        text: async () => '',
      } as any);

    const metrics = await fetchFitbitDailyMetrics({
      accessToken: 'test_token',
      start: '2026-08-29',
      end: '2026-08-30',
    });

    expect(metrics).toHaveLength(2);

    // Sorted desc by date
    expect(metrics[0].date).toBe('2026-08-30');
    expect(metrics[0].steps).toBe(10200);
    expect(metrics[0].activeEnergyKcal).toBe(520);
    expect(metrics[0].sleepMinutes).toBe(390); // nap excluded

    expect(metrics[1].date).toBe('2026-08-29');
    expect(metrics[1].steps).toBe(8500);
    expect(metrics[1].activeEnergyKcal).toBe(450);
    expect(metrics[1].sleepMinutes).toBe(420);
    expect(metrics[1].provider).toBe('fitbit');
  });

  it('handles empty data gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ 'activities-steps': [] }), text: async () => '' } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ 'activities-activityCalories': [] }), text: async () => '' } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sleep: [] }), text: async () => '' } as any);

    const metrics = await fetchFitbitDailyMetrics({
      accessToken: 'test_token',
      start: '2026-08-29',
      end: '2026-08-30',
    });

    expect(metrics).toHaveLength(0);
  });

  it('throws when steps endpoint fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized', json: async () => ({}) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ 'activities-activityCalories': [] }), text: async () => '' } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sleep: [] }), text: async () => '' } as any);

    await expect(
      fetchFitbitDailyMetrics({
        accessToken: 'expired_token',
        start: '2026-08-29',
        end: '2026-08-30',
      }),
    ).rejects.toThrow('Fitbit steps request failed: 401');
  });

  it('handles non-numeric values in time series gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          'activities-steps': [
            { dateTime: '2026-08-29', value: 'NaN' },
            { dateTime: '2026-08-30', value: '5000' },
          ],
        }),
        text: async () => '',
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 'activities-activityCalories': [] }),
        text: async () => '',
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sleep: [] }),
        text: async () => '',
      } as any);

    const metrics = await fetchFitbitDailyMetrics({
      accessToken: 'test_token',
      start: '2026-08-29',
      end: '2026-08-30',
    });

    // NaN value should be skipped, only the 5000 entry should have steps
    expect(metrics).toHaveLength(1);
    expect(metrics[0].steps).toBe(5000);
  });
});
