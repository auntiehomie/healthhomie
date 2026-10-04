import { ClerkProvider, useAuth } from "@clerk/react";
import {
  useLayoutEffect,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import {
  configureManagedAuth,
  subscribeManagedAuth,
  isManagedAuthReady,
} from "@/lib/services/managedAuth";

function SessionBridge({ children }: PropsWithChildren) {
  const { isLoaded, getToken, signOut, userId } = useAuth();
  const ready = useSyncExternalStore(
    subscribeManagedAuth,
    isManagedAuthReady,
    () => false,
  );
  useLayoutEffect(() => {
    if (!isLoaded) return;
    let cached: { token: string; expires: number } | null = null;
    let pending: Promise<string | null> | null = null;
    const cleanup = configureManagedAuth(
      async () => {
        if (!userId) return null;
        if (cached && cached.expires > Date.now()) return cached.token;
        if (pending) return pending;
        pending = (async () => {
          const sessionToken = await getToken();
          if (!sessionToken) return null;
          const response = await fetch("/api/auth/clerk-session", {
            method: "POST",
            headers: { authorization: `Bearer ${sessionToken}` },
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Unable to connect your account.");
          cached = { token: data.token, expires: Date.now() + 4 * 60 * 1000 };
          return data.token as string;
        })().finally(() => {
          pending = null;
        });
        return pending;
      },
      async () => {
        cached = null;
        await signOut();
      },
    );
    return cleanup;
  }, [isLoaded, getToken, signOut, userId]);
  return ready ? children : null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return children;
  return (
    <ClerkProvider
      publishableKey={key}
      signInUrl="/login"
      signUpUrl="/register"
    >
      <SessionBridge>{children}</SessionBridge>
    </ClerkProvider>
  );
}
