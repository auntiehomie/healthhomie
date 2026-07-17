import { apiUrl, getToken } from '@/lib/services/authClient';

export type SurveyResponse = {
  userId: string;
  heightCm: number | null;
  weightCiphertext: string | null;
  weightSalt: string | null;
  weightIv: string | null;
  movement: string | null;
  goals: string | null;
  notesHabit: string | null;
  notesReviewFrequency: string | null;
  notesSystem: string | null;
  notesChallenge: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SurveyInput = Partial<
  Pick<
    SurveyResponse,
    | 'heightCm'
    | 'weightCiphertext'
    | 'weightSalt'
    | 'weightIv'
    | 'movement'
    | 'goals'
    | 'notesHabit'
    | 'notesReviewFrequency'
    | 'notesSystem'
    | 'notesChallenge'
  >
>;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Log in first.');
  return { authorization: `Bearer ${token}` };
}

export async function getSurvey(): Promise<SurveyResponse | null> {
  const response = await fetch(apiUrl('/api/data/survey'), { headers: await authHeaders() });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Failed to load survey.');
  return payload.survey;
}

export async function saveSurvey(input: SurveyInput): Promise<SurveyResponse> {
  const response = await fetch(apiUrl('/api/data/survey'), {
    method: 'PUT',
    headers: { ...(await authHeaders()), 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Failed to save survey.');
  return payload.survey;
}
