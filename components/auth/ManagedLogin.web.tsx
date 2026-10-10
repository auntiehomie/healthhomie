import { SignIn, SignUp, useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Linking, ScrollView, Text } from "react-native";
import { getToken } from "@/lib/services/authClient";
import { useTheme } from "@/lib/theme/ThemeContext";

export default function ManagedLogin({
  register = false,
}: {
  register?: boolean;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { colors } = useTheme();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    getToken()
      .then((token) => {
        if (active && token)
          router.replace(register ? "/onboarding" : "/(tabs)");
      })
      .catch(() => {
        if (active)
          setError(
            "We could not connect your account. Please try again or contact support.",
          );
      });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, register, retry]);
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 24,
        gap: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
        Howdy Morning ☀️
      </Text>
      <Text style={{ color: colors.textMuted, textAlign: "center" }}>
        Use email or a connected social account. Already have saved data? Use
        the same verified email to keep it.
      </Text>
      {isSignedIn ? (
        <>
          <Text style={{ color: colors.text }}>
            {error || "Connecting your account…"}
          </Text>
          {!!error && (
            <Text
              accessibilityRole="button"
              onPress={() => {
                setError("");
                setRetry(retry + 1);
              }}
              style={{ color: colors.primary }}
            >
              Try again
            </Text>
          )}
        </>
      ) : register ? (
        <SignUp
          routing="hash"
          signInUrl="/login"
          forceRedirectUrl="/register"
        />
      ) : (
        <SignIn
          routing="hash"
          signUpUrl="/register"
          forceRedirectUrl="/login"
          signUpForceRedirectUrl="/register"
        />
      )}
      <Text
        accessibilityRole="link"
        style={{ color: colors.primary }}
        onPress={() => router.push("/support")}
      >
        Need help signing in?
      </Text>
      <Text
        accessibilityRole="link"
        style={{ color: colors.primary }}
        onPress={() => void Linking.openURL("mailto:thehomiehelps@gmail.com")}
      >
        Contact support
      </Text>
    </ScrollView>
  );
}
