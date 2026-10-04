import ManagedLogin from "@/components/auth/ManagedLogin.web";
import LegacyLogin from "@/components/auth/LegacyLogin";
export default function Register() {
  return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <ManagedLogin register />
  ) : (
    <LegacyLogin initialMode="register" />
  );
}
