import { LegalDocument } from '@/components/legal/LegalDocument';
import { TERMS_OF_SERVICE_TEXT } from '@/lib/legal/termsOfService';

export default function TermsOfServiceScreen() {
  return <LegalDocument text={TERMS_OF_SERVICE_TEXT} />;
}
