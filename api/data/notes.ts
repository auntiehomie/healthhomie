import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId, AuthError } from '../../lib/server/auth';
import { deleteNote, listNotes, upsertNote } from '../../lib/server/notesStore';
import { DatabaseNotConfiguredError } from '../../lib/server/db';
import type { Note } from '../../types/healthhomie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = requireUserId(req);

    if (req.method === 'GET') {
      const notes = await listNotes(userId);
      return res.status(200).json({ notes });
    }

    if (req.method === 'POST') {
      const note = (req.body ?? {}) as Partial<Note>;
      if (!note.id || !note.title?.trim()) return res.status(400).json({ error: 'id and title are required.' });
      const now = new Date().toISOString();
      await upsertNote(userId, {
        id: note.id,
        title: note.title,
        content: note.content ?? '',
        tags: Array.isArray(note.tags) ? note.tags : [],
        createdAt: note.createdAt ?? now,
        updatedAt: note.updatedAt ?? now,
      });
      return res.status(204).end();
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : undefined;
      if (!id) return res.status(400).json({ error: 'id query param required.' });
      const deleted = await deleteNote(userId, id);
      if (!deleted) return res.status(404).json({ error: 'Note not found.' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    res.status(405).json({ error: 'GET, POST, or DELETE only.' });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error.' });
  }
}
