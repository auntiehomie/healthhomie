import { Platform } from 'react-native';

const TOKEN_KEY = 'healthhomie_auth_token';
const REFRESH_TOKEN_KEY = 'healthhomie_refresh_token';

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') return typeof window !== 'undefined' ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Login failed.');
  await setToken(payload.token);
  if (payload.refreshToken) await setRefreshToken(payload.refreshToken);
}

export async function register(email: string, password: string, code: string): Promise<void> {
  const response = await fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, code }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Registration failed.');
  await setToken(payload.token);
  if (payload.refreshToken) await setRefreshToken(payload.refreshToken);
}

export async function logout(): Promise<void> {
  await clearToken();
  await clearRefreshToken();
}

/**
 * Attempts to refresh the access token using the stored refresh token.
 * Returns the new access token on success, or null if refresh failed.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    await setToken(payload.token);
    return payload.token as string;
  } catch {
    return null;
  }
}

/**
 * Permanently deletes the authenticated user's account and all associated
 * data (food journal, health connections, notes, etc.). GDPR/CCPA-compliant.
 * Requires the user's email address as confirmation to prevent accidents.
 */
export async function deleteAccount(email: string): Promise<string> {
  let response: Response;
  try {
    response = await authedFetch(apiUrl('/api/data/delete-account'), {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: email }),
    });
  } catch (e) {
    if (e instanceof AuthExpiredError) throw e;
    throw new Error('Failed to delete account.');
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Failed to delete account.');
  await clearToken();
  await clearRefreshToken();
  return payload.message as string;
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await fetch(apiUrl('/api/auth/forgot-password'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Failed to send reset email.');
  return payload.message as string;
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const response = await fetch(apiUrl('/api/auth/reset-password'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Failed to reset password.');
}

/**
 * Wrapper around fetch that automatically attaches the auth bearer token
 * and attempts a single token refresh on 401 responses.
 *
 * Usage: replace `fetch(url, { headers: { authorization: \`Bearer ${token}\` } })`
 * with `authedFetch(url, { ... })`.
 *
 * On a 401 it will try refreshAccessToken() once, retry the original request
 * with the new token, and return that response. If refresh fails it throws
 * an AuthExpiredError so the caller can redirect to login.
 */
export class AuthExpiredError extends Error {
  constructor(message = 'Session expired. Please log in again.') {
    super(message);
    this.name = 'AuthExpiredError';
  }
}

export async function authedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  if (!token) throw new AuthExpiredError('Not logged in.');

  const authedInit: RequestInit = {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${token}`,
    },
  };

  const response = await fetch(input, authedInit);

  if (response.status !== 401) return response;

  // 401 — attempt one silent refresh, then retry the original request
  const newToken = await refreshAccessToken();
  if (!newToken) {
    await clearToken();
    await clearRefreshToken();
    throw new AuthExpiredError();
  }

  const retriedInit: RequestInit = {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${newToken}`,
    },
  };
  return fetch(input, retriedInit);
}

export function apiUrl(path: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}${path}`;
  const base = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!base) throw new Error('EXPO_PUBLIC_API_BASE_URL is required for native builds.');
  return `${base}${path}`;
}
