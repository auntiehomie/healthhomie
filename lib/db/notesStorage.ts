import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl, getToken } from '@/lib/services/authClient';
import type { Note } from '@/types/healthhomie';

export type { Note };

const LEGACY_STORAGE_KEY = 'homie_notes_v1';
const MIGRATION_FLAG_KEY = 'homie_notes_migrated_v1';
const SAVE_DEBOUNCE_MS = 600;

export function genNoteId(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('') + String(Math.floor(Math.random() * 100)).padStart(2, '0');
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  if (!token) throw new Error('Not logged in.');
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { ...(options.headers ?? {}), authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed (${response.status}).`);
  }
  return response;
}

// Notes used to live only in device-local AsyncStorage, so a phone and an iPad on the same
// account each had their own independent set. On first load after this shipped, upload whatever
// is sitting in local storage to the server - every device does this once, so the server ends up
// with the union of every device's notes instead of one device silently overwriting another.
let migrationPromise: Promise<void> | null = null;
function ensureLegacyNotesMigrated(): Promise<void> {
  if (!migrationPromise) migrationPromise = migrateLegacyNotes();
  return migrationPromise;
}
async function migrateLegacyNotes(): Promise<void> {
  const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
  if (alreadyMigrated) return;
  try {
    const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    const legacyNotes: Note[] = raw ? JSON.parse(raw) : [];
    // Parallel, not sequential - a device with a couple dozen legacy notes uploading one at a
    // time (each a full cold-start network round trip) could take the better part of a minute
    // and block the Home screen's loading state that whole time.
    await Promise.all(legacyNotes.map((note) => apiFetch('/api/data/notes', { method: 'POST', body: JSON.stringify(note) })));
  } catch (err) {
    console.warn('Failed to migrate local notes to the server - will retry next load:', err);
    return; // leave the flag unset so this device retries rather than silently losing local notes
  }
  await AsyncStorage.setItem(MIGRATION_FLAG_KEY, '1');
}

export async function loadNotes(): Promise<Note[]> {
  await ensureLegacyNotesMigrated();
  const response = await apiFetch('/api/data/notes');
  const payload = await response.json();
  return payload.notes;
}

export async function getNoteById(id: string): Promise<Note | null> {
  const notes = await loadNotes();
  return notes.find((n) => n.id === id) ?? null;
}

/** Immediate write - use for deliberate, infrequent actions (create/delete/link) where the
 * change should go out right away. */
export async function upsertNote(note: Note): Promise<void> {
  await apiFetch('/api/data/notes', { method: 'POST', body: JSON.stringify(note) });
}

export async function removeNote(id: string): Promise<void> {
  await apiFetch(`/api/data/notes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

const pendingSaves = new Map<string, { note: Note; timer: ReturnType<typeof setTimeout> }>();

/** Debounced write, keyed per note id - use for keystroke-driven edits so typing doesn't fire a
 * network request per character. Callers MUST call flushPendingNoteSaves() before navigating away
 * from the editor (e.g. on back/unmount), otherwise an edit still mid-debounce when the screen
 * changes would be silently dropped. */
export function upsertNoteDebounced(note: Note): void {
  const existing = pendingSaves.get(note.id);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pendingSaves.delete(note.id);
    void upsertNote(note).catch((err) => console.warn('Failed to save note:', err));
  }, SAVE_DEBOUNCE_MS);
  pendingSaves.set(note.id, { note, timer });
}

export async function flushPendingNoteSaves(): Promise<void> {
  const pending = Array.from(pendingSaves.values());
  pendingSaves.clear();
  await Promise.all(pending.map(({ note, timer }) => { clearTimeout(timer); return upsertNote(note); }));
}

export async function createNote(fields: { title: string; content: string; tags?: string[] }): Promise<Note> {
  const now = new Date().toISOString();
  const note: Note = { id: genNoteId(), title: fields.title, content: fields.content, tags: fields.tags ?? [], createdAt: now, updatedAt: now };
  await upsertNote(note);
  return note;
}
