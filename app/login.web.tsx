import ManagedLogin from "@/components/auth/ManagedLogin.web";
import LegacyLogin from "@/components/auth/LegacyLogin";
export default function Login() {
  return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <ManagedLogin />
  ) : (
    <LegacyLogin />
  );
}
