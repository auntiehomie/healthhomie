import { getSql } from './db';
import type { Note } from '../../types/healthhomie';

function toNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    tags: (row.tags as string[] | null) ?? [],
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export async function listNotes(userId: string): Promise<Note[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM notes WHERE "userId" = ${userId} ORDER BY "updatedAt" DESC`;
  return rows.map(toNote);
}

export async function upsertNote(userId: string, note: Note): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO notes (id, "userId", title, content, tags, "createdAt", "updatedAt")
    VALUES (${note.id}, ${userId}, ${note.title}, ${note.content}, ${note.tags}, ${note.createdAt}, ${note.updatedAt})
    ON CONFLICT ("userId", id) DO UPDATE SET
      title = EXCLUDED.title, content = EXCLUDED.content, tags = EXCLUDED.tags, "updatedAt" = EXCLUDED."updatedAt"
  `;
}

export async function deleteNote(userId: string, id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`DELETE FROM notes WHERE "userId" = ${userId} AND id = ${id} RETURNING id`;
  return rows.length > 0;
}
