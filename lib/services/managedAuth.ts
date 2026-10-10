// Providers register a session reader; managed tokens are never persisted to localStorage.
const listeners = new Set<() => void>();
export function subscribeManagedAuth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const isManagedAuthReady = () => reader !== null;
function notify() {
  listeners.forEach((listener) => listener());
}
let reader: (() => Promise<string | null>) | null = null;
let signOut: (() => Promise<void>) | null = null;
export function configureManagedAuth(
  read: () => Promise<string | null>,
  exit: () => Promise<void>,
) {
  reader = read;
  signOut = exit;
  notify();
  return () => {
    reader = null;
    signOut = null;
    notify();
  };
}
export const managedAuthEnabled = () =>
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  typeof window !== "undefined";
export const getManagedToken = () =>
  reader ? reader() : Promise.resolve(null);
export const signOutManaged = () => (signOut ? signOut() : Promise.resolve());
