import { Redirect } from "expo-router";
import LegacyForgotPassword from "@/components/auth/LegacyForgotPassword";
export default function ForgotPassword() {
  // Clerk's sign-in screen owns verification-code password recovery.
  return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <Redirect href="/login" />
  ) : (
    <LegacyForgotPassword />
  );
}
