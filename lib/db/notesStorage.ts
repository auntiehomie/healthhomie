import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'homie_notes_v1';

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

export async function loadNotes(): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch { return []; }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch {}
}

export async function getNoteById(id: string): Promise<Note | null> {
  const notes = await loadNotes();
  return notes.find((n) => n.id === id) ?? null;
}

export async function createNote(fields: { title: string; content: string; tags?: string[] }): Promise<Note> {
  const notes = await loadNotes();
  const now = new Date().toISOString();
  const note: Note = { id: genNoteId(), title: fields.title, content: fields.content, tags: fields.tags ?? [], createdAt: now, updatedAt: now };
  await saveNotes([note, ...notes]);
  return note;
}
