import { LegalDocument } from '@/components/legal/LegalDocument';
import { PRIVACY_POLICY_TEXT } from '@/lib/legal/privacyPolicy';

export default function PrivacyPolicyScreen() {
  return <LegalDocument text={PRIVACY_POLICY_TEXT} />;
}
