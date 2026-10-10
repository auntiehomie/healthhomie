import { Linking, ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/lib/theme/ThemeContext";
export default function Support() {
  const { colors } = useTheme();
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 24,
        gap: 20,
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
        Account support
      </Text>
      <Text style={{ color: colors.text }}>
        Forgot your password? Use “Forgot password” on the sign-in screen. If
        you previously used this app, register or sign in with the same verified
        email to retain your saved data when using the new sign-in system.
      </Text>
      <Text style={{ color: colors.text }}>
        For help, include your account email, what you tried, and the time of
        the error. Never send passwords, verification codes, reset links, or
        health records.
      </Text>
      <Text
        accessibilityRole="link"
        style={{ color: colors.primary }}
        onPress={() =>
          void Linking.openURL(
            "mailto:thehomiehelps@gmail.com?subject=Howdy%20Morning%20account%20support",
          )
        }
      >
        Email support: thehomiehelps@gmail.com
      </Text>
      <Text
        accessibilityRole="link"
        style={{ color: colors.primary }}
        onPress={() => router.replace("/login")}
      >
        Back to sign in
      </Text>
    </ScrollView>
  );
}
