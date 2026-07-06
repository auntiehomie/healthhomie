import { Platform } from 'react-native';

const TOKEN_KEY = 'healthhomie_auth_token';

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
}

export async function register(email: string, password: string, signupSecret: string): Promise<void> {
  const response = await fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, signupSecret }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Registration failed.');
  await setToken(payload.token);
}

export async function logout(): Promise<void> {
  await clearToken();
}

export function apiUrl(path: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}${path}`;
  const base = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!base) throw new Error('EXPO_PUBLIC_API_BASE_URL is required for native builds.');
  return `${base}${path}`;
}
