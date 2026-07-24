import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { genNoteId, loadNotes, saveNotes, type Note } from '@/lib/db/notesStorage';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { cardShadow } from '@/lib/theme/shadow';

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getBacklinks(notes: Note[], target: Note): Note[] {
  return notes.filter(n => n.id !== target.id && n.content.includes(`[[${target.title}]]`));
}

function extractWikilinks(content: string): string[] {
  const titles = new Set<string>();
  for (const match of content.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const title = match[1].trim();
    if (title) titles.add(title);
  }
  return Array.from(titles);
}

// ── Component ──────────────────────────────────────────────────────────────────
type Screen = 'list' | 'edit';

export default function NotesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [screen, setScreen] = useState<Screen>('list');
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [forcedSelection, setForcedSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const contentCursorRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  useEffect(() => {
    loadNotes().then(n => { setNotes(n); setLoaded(true); });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setNotes(await loadNotes());
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Both scan every note's content - cheap at a handful of notes, but scale with total note
  // count, and backlinks/wikilinks recompute on every keystroke via persistNote/setEditContent,
  // so they're memoized rather than left to rerun on renders that don't actually change them.
  const backlinks = useMemo(
    () => (activeNote ? getBacklinks(notes, activeNote) : []),
    [notes, activeNote]
  );
  const wikilinks = useMemo(() => extractWikilinks(editContent), [editContent]);

  const updateNotes = useCallback((next: Note[]) => {
    setNotes(next); void saveNotes(next);
  }, []);

  function openNote(note: Note) {
    setActiveNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTags(note.tags.join(', '));
    setScreen('edit');
  }

  function newNote() {
    const note: Note = {
      id: genNoteId(),
      title: 'Untitled',
      content: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [note, ...notes];
    updateNotes(next);
    openNote(note);
  }

  // Saves on every keystroke rather than on blur — onBlur never fires reliably for every way a
  // user can leave a field (tapping the drawer's hamburger icon, switching tabs, etc.), which was
  // silently dropping edits with zero feedback that anything had gone wrong.
  function persistNote(fields: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) {
    if (!activeNote) return;
    const updated: Note = { ...activeNote, ...fields, updatedAt: new Date().toISOString() };
    setActiveNote(updated);
    updateNotes(notes.map(n => (n.id === updated.id ? updated : n)));
  }

  function updateTitle(value: string) {
    setEditTitle(value);
    persistNote({ title: value });
  }

  function updateTags(value: string) {
    setEditTags(value);
    persistNote({ tags: value.split(',').map(t => t.trim()).filter(Boolean) });
  }

  function updateContent(value: string) {
    setEditContent(value);
    persistNote({ content: value });
  }

  // Roam/Obsidian-style bracket pairing: typing "[" auto-inserts the matching "]" with the
  // cursor left between them, and typing "]" right before one already there skips over it
  // instead of duplicating. The insertion point comes from the tracked cursor position
  // (contentCursorRef), not from diffing prev/value — a run of identical "]" characters makes
  // diffing ambiguous (inserting mid-run is textually indistinguishable from appending at the
  // end), so only the real, known cursor position can tell them apart.
  function handleContentChange(value: string) {
    const prev = editContent;
    const cursor = contentCursorRef.current.start;
    const isSingleInsert = value.length === prev.length + 1 && cursor >= 0 && cursor <= prev.length;

    if (isSingleInsert) {
      const inserted = value[cursor];
      if (inserted === '[') {
        const next = `${value.slice(0, cursor + 1)}]${value.slice(cursor + 1)}`;
        contentCursorRef.current = { start: cursor + 1, end: cursor + 1 };
        setForcedSelection(contentCursorRef.current);
        updateContent(next);
        return;
      }
      if (inserted === ']' && prev[cursor] === ']') {
        contentCursorRef.current = { start: cursor + 1, end: cursor + 1 };
        setForcedSelection(contentCursorRef.current);
        return; // leave content as-is; the controlled `value` prop reverts the native duplicate
      }
      contentCursorRef.current = { start: cursor + 1, end: cursor + 1 };
      updateContent(value);
      return;
    }

    contentCursorRef.current = { start: value.length, end: value.length };
    updateContent(value);
  }

  function handleContentSelectionChange(e: { nativeEvent: { selection: { start: number; end: number } } }) {
    contentCursorRef.current = e.nativeEvent.selection;
    if (forcedSelection) setForcedSelection(undefined);
  }

  function openOrCreateLinkedNote(title: string) {
    const existing = notes.find(n => n.title.toLowerCase() === title.toLowerCase());
    if (existing) { openNote(existing); return; }
    const note: Note = {
      id: genNoteId(),
      title,
      content: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateNotes([note, ...notes]);
    openNote(note);
  }

  function deleteNote() {
    if (!activeNote) return;
    Alert.alert('Delete note', `"${activeNote.title}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          updateNotes(notes.filter(n => n.id !== activeNote.id));
          setScreen('list'); setActiveNote(null);
        },
      },
    ]);
  }

  function back() {
    if (activeNote && !activeNote.title.trim()) persistNote({ title: 'Untitled' });
    setScreen('list'); setActiveNote(null);
  }

  const filtered = useMemo(() => notes.filter(n =>
    !search ||
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  ), [notes, search]);

  if (!loaded) return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>zettelkasten</Text>
          <Text style={styles.title}>Your notes</Text>
        </View>
      </View>
      <View style={styles.listScroll}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.noteCard}>
            <Skeleton style={{ height: 17, width: '60%' }} />
            <Skeleton style={{ height: 14, width: '90%' }} />
            <Skeleton style={{ height: 12, width: '30%' }} />
          </View>
        ))}
      </View>
    </View>
  );

  // ── Edit screen ──
  if (screen === 'edit' && activeNote) {
    return (
      <View style={styles.editContainer}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <Pressable onPress={back} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Notes</Text>
          </Pressable>
          <Text style={styles.savedLabel} numberOfLines={1}>Saved automatically</Text>
          <Pressable onPress={deleteNote} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.fill} contentContainerStyle={styles.editScroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.titleInput}
            value={editTitle}
            onChangeText={updateTitle}
            placeholder="Note title…"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TextInput
            style={styles.tagsInput}
            value={editTags}
            onChangeText={updateTags}
            placeholder="Tags (comma separated)…"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.contentInput}
            value={editContent}
            onChangeText={handleContentChange}
            selection={forcedSelection}
            onSelectionChange={handleContentSelectionChange}
            multiline
            textAlignVertical="top"
            placeholder={'Write in plain text or markdown…\n\nLink to other notes with [[Note Title]]'}
            placeholderTextColor={colors.textMuted}
          />

          {/* Outgoing wikilinks */}
          {wikilinks.length > 0 && (
            <View style={styles.backlinkPanel}>
              <Text style={styles.backlinkTitle}>🔗 Links to</Text>
              {wikilinks.map(title => {
                const exists = notes.some(n => n.title.toLowerCase() === title.toLowerCase() && n.id !== activeNote.id);
                return (
                  <Pressable key={title} onPress={() => openOrCreateLinkedNote(title)}>
                    <Text style={styles.backlinkItem}>{exists ? '→' : '+ create'} {title}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Backlinks */}
          {backlinks.length > 0 && (
            <View style={styles.backlinkPanel}>
              <Text style={styles.backlinkTitle}>🔗 Linked from</Text>
              {backlinks.map(n => (
                <Pressable key={n.id} onPress={() => openNote(n)}>
                  <Text style={styles.backlinkItem}>← {n.title}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── List screen ──
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.listHeader}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>zettelkasten</Text>
          <Text style={styles.title}>Your notes</Text>
        </View>
        <Pressable style={styles.newBtn} onPress={newNote}>
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search notes, tags…"
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.listScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyTitle}>{search ? 'No notes match your search' : 'No notes yet'}</Text>
            <Text style={styles.muted}>Tap + New to create your first note. Link notes with {'[[Title]]'}</Text>
          </View>
        )}
        {filtered.map(note => (
          <Pressable key={note.id} style={styles.noteCard} onPress={() => openNote(note)}>
            <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
            <Text style={styles.notePreview} numberOfLines={2}>{note.content || '(empty)'}</Text>
            <View style={styles.noteMeta}>
              <Text style={styles.noteDate}>{fmtDate(note.updatedAt)}</Text>
              {note.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {note.tags.slice(0, 3).map(t => (
                    <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
                  ))}
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container:         { flex: 1, backgroundColor: colors.background },
    fill:              { flex: 1 },
    listHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 20, paddingBottom: 12 },
    hero:              { gap: 2 },
    eyebrow:           { color: colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
    title:             { ...typography.display2, color: colors.text },
    newBtn:            { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
    newBtnText:        { color: colors.onPrimary, fontWeight: '800', fontSize: 14 },
    searchInput:       { marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    listScroll:        { padding: 20, paddingTop: 4, gap: 10, paddingBottom: 40 },
    noteCard:          { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 8, ...cardShadow },
    noteTitle:         { fontSize: 17, fontWeight: '800', color: colors.text },
    notePreview:       { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    noteMeta:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    noteDate:          { fontSize: 12, color: colors.textMuted },
    tagRow:            { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    tag:               { backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    tagText:           { fontSize: 11, color: colors.primary, fontWeight: '700' },
    emptyState:        { alignItems: 'center', padding: 40, gap: 12 },
    emptyEmoji:        { fontSize: 48 },
    emptyTitle:        { fontSize: 18, fontWeight: '800', color: colors.text },
    muted:             { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
    // Edit screen
    editContainer:     { flex: 1, backgroundColor: colors.background },
    toolbar:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, gap: 10 },
    backBtn:           { paddingVertical: 4, paddingHorizontal: 2 },
    backBtnText:       { color: colors.primary, fontWeight: '700', fontSize: 15 },
    savedLabel:        { flex: 1, fontSize: 12, color: colors.textMuted, textAlign: 'center', fontWeight: '600' },
    deleteButton:      { paddingVertical: 4, paddingHorizontal: 2 },
    deleteButtonText:  { color: colors.danger, fontWeight: '700', fontSize: 14 },
    editScroll:        { padding: 20, gap: 14, paddingBottom: 60 },
    titleInput:        { fontSize: 24, fontWeight: '900', color: colors.text, borderBottomWidth: 2, borderBottomColor: colors.border, paddingVertical: 8 },
    tagsInput:         { fontSize: 13, color: colors.textMuted, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
    contentInput:      { fontSize: 16, color: colors.text, lineHeight: 26, minHeight: 320, backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
    backlinkPanel:     { backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 14, gap: 8 },
    backlinkTitle:     { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    backlinkItem:      { fontSize: 14, color: colors.primary, paddingVertical: 2 },
  });
