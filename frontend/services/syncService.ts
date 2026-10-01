/**
 * syncService.ts
 * Offline-first cloud sync layer for Hera.
 * All operations are non-throwing — errors are returned, never propagated.
 */
import { getSupabaseClient } from '@/template';
import type { JournalEntry, VisionItem, ChatMessage, HeraUser } from '@/contexts/HeraContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncResult<T> {
  data: T | null;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function supabase() {
  return getSupabaseClient();
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase().auth.getUser();
  return data?.user?.id ?? null;
}

// ── Journal ───────────────────────────────────────────────────────────────────

export async function pushJournal(entries: JournalEntry[]): Promise<SyncResult<null>> {
  try {
    const uid = await getUserId();
    if (!uid) return { data: null, error: 'Not authenticated' };
    if (entries.length === 0) return { data: null, error: null };

    const rows = entries.map(e => ({
      id: e.id,
      user_id: uid,
      date: e.date,
      title: e.title,
      content: e.content,
      mood: e.mood,
      type: e.type,
    }));

    const { error } = await supabase()
      .from('hera_journal_entries')
      .upsert(rows, { onConflict: 'id,user_id' });

    return { data: null, error: error?.message ?? null };
  } catch (e: any) {
    return { data: null, error: e.message ?? 'Push journal failed' };
  }
}

export async function pullJournal(): Promise<SyncResult<JournalEntry[]>> {
  try {
    const uid = await getUserId();
    if (!uid) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase()
      .from('hera_journal_entries')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false });

    if (error) return { data: null, error: error.message };

    const entries: JournalEntry[] = (data ?? []).map((r: any) => ({
      id: r.id,
      date: r.date,
      title: r.title,
      content: r.content,
      mood: r.mood,
      type: r.type as JournalEntry['type'],
    }));

    return { data: entries, error: null };
  } catch (e: any) {
    return { data: null, error: e.message ?? 'Pull journal failed' };
  }
}

export async function deleteRemoteJournal(id: string): Promise<SyncResult<null>> {
  try {
    const uid = await getUserId();
    if (!uid) return { data: null, error: 'Not authenticated' };

    const { error } = await supabase()
      .from('hera_journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', uid);

    return { data: null, error: error?.message ?? null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

// ── Vision ────────────────────────────────────────────────────────────────────

export async function pushVision(items: VisionItem[]): Promise<SyncResult<null>> {
  try {
    const uid = await getUserId();
    if (!uid) return { data: null, error: 'Not authenticated' };
    if (items.length === 0) return { data: null, error: null };

    const rows = items.map(v => ({
      id: v.id,
      user_id: uid,
      title: v.title,
      description: v.description,
      category: v.category,
      image_url: v.imageUrl,
      target_date: v.targetDate,
      progress: v.progress,
      created_at: v.createdAt,
    }));

    const { error } = await supabase()
      .from('hera_vision_items')
      .upsert(rows, { onConflict: 'id,user_id' });

    return { data: null, error: error?.message ?? null };
  } catch (e: any) {
    return { data: null, error: e.message ?? 'Push vision failed' };
  }
}

export async function pullVision(): Promise<SyncResult<VisionItem[]>> {
  try {
    const uid = await getUserId();
    if (!uid) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase()
      .from('hera_vision_items')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    if (error) return { data: null, error: error.message };

    const items: VisionItem[] = (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      imageUrl: r.image_url,
      targetDate: r.target_date,
      progress: r.progress,
      createdAt: r.created_at,
    }));

    return { data: items, error: null };
  } catch (e: any) {
    return { data: null, error: e.message ?? 'Pull vision failed' };
  }
}

export async function deleteRemoteVision(id: string): Promise<SyncResult<null>> {
  try {
    const uid = await getUserId();
    if (!uid) return { data: null, error: 'Not authenticated' };

    const { error } = await supabase()
      .from('hera_vision_items')
      .delete()
      .eq('id', id)
      .eq('user_id', uid);

    return { data: null, error: error?.message ?? null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function pushChat(messages: ChatMessage[]): Promise<SyncResult<null>> {
  try {
    const uid = await getUserId();
    if (!uid) return { data: null, error: 'Not authenticated' };

    // Only sync non-welcome messages, limit to last 120
    const toSync = messages
      .filter(m => m.id !== 'welcome')
      .slice(-120);

    if (toSync.length === 0) return { data: null, error: null };

    const rows = toSync.map(m => ({
      id: m.id,
      user_id: uid,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));

    const { error } = await supabase()
      .from('hera_chat_messages')
      .upsert(rows, { onConflict: 'id,user_id' });

    return { data: null, error: error?.message ?? null };
  } catch (e: any) {
    return { data: null, error: e.message ?? 'Push chat failed' };
  }
}

export async function pullChat(): Promise<SyncResult<ChatMessage[]>> {
  try {
    const uid = await getUserId();
    if (!uid) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase()
      .from('hera_chat_messages')
      .select('*')
      .eq('user_id', uid)
      .order('timestamp', { ascending: true })
      .limit(120);

    if (error) return { data: null, error: error.message };

    const messages: ChatMessage[] = (data ?? []).map((r: any) => ({
      id: r.id,
      role: r.role as 'user' | 'hera',
      content: r.content,
      timestamp: r.timestamp,
    }));

    return { data: messages, error: null };
  } catch (e: any) {
    return { data: null, error: e.message ?? 'Pull chat failed' };
  }
}

export async function clearRemoteChat(userId: string): Promise<SyncResult<null>> {
  try {
    const { error } = await supabase()
      .from('hera_chat_messages')
      .delete()
      .eq('user_id', userId);

    return { data: null, error: error?.message ?? null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

// ── User data ─────────────────────────────────────────────────────────────────

export async function pushUserData(user: HeraUser): Promise<SyncResult<null>> {
  try {
    const uid = await getUserId();
    if (!uid) return { data: null, error: 'Not authenticated' };

    const { error } = await supabase()
      .from('hera_user_data')
      .upsert({
        user_id: uid,
        name: user.name,
        goals: user.goals,
        focus_areas: user.focusAreas,
        streak: user.streak,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    return { data: null, error: error?.message ?? null };
  } catch (e: any) {
    return { data: null, error: e.message ?? 'Push user data failed' };
  }
}

export async function pullUserData(): Promise<SyncResult<Partial<HeraUser>>> {
  try {
    const uid = await getUserId();
    if (!uid) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase()
      .from('hera_user_data')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: {}, error: null }; // No row = first sync
      return { data: null, error: error.message };
    }

    return {
      data: {
        name: data.name,
        goals: data.goals ?? [],
        focusAreas: data.focus_areas ?? [],
        streak: data.streak ?? 1,
      },
      error: null,
    };
  } catch (e: any) {
    return { data: null, error: e.message ?? 'Pull user data failed' };
  }
}

// ── Full sync ─────────────────────────────────────────────────────────────────

export interface FullSyncPayload {
  journalEntries: JournalEntry[];
  visionItems: VisionItem[];
  chatHistory: ChatMessage[];
  user: HeraUser;
}

export interface FullSyncResult {
  journal: JournalEntry[] | null;
  vision: VisionItem[] | null;
  chat: ChatMessage[] | null;
  userData: Partial<HeraUser> | null;
  errors: string[];
}

/**
 * Push all local data then pull latest from server.
 * Returns merged remote state for each entity.
 */
export async function fullSync(local: FullSyncPayload): Promise<FullSyncResult> {
  const errors: string[] = [];

  // Push all local data up first
  const [pushJ, pushV, pushC, pushU] = await Promise.all([
    pushJournal(local.journalEntries),
    pushVision(local.visionItems),
    pushChat(local.chatHistory),
    pushUserData(local.user),
  ]);

  if (pushJ.error) errors.push(`Journal push: ${pushJ.error}`);
  if (pushV.error) errors.push(`Vision push: ${pushV.error}`);
  if (pushC.error) errors.push(`Chat push: ${pushC.error}`);
  if (pushU.error) errors.push(`User push: ${pushU.error}`);

  // Pull latest from server
  const [pullJ, pullV, pullC, pullU] = await Promise.all([
    pullJournal(),
    pullVision(),
    pullChat(),
    pullUserData(),
  ]);

  if (pullJ.error) errors.push(`Journal pull: ${pullJ.error}`);
  if (pullV.error) errors.push(`Vision pull: ${pullV.error}`);
  if (pullC.error) errors.push(`Chat pull: ${pullC.error}`);
  if (pullU.error) errors.push(`User pull: ${pullU.error}`);

  return {
    journal: pullJ.data,
    vision: pullV.data,
    chat: pullC.data,
    userData: pullU.data,
    errors,
  };
}

/**
 * Light pull-only sync — fetches latest remote state without pushing.
 */
export async function pullAllData(): Promise<FullSyncResult> {
  const errors: string[] = [];
  const [pullJ, pullV, pullC, pullU] = await Promise.all([
    pullJournal(),
    pullVision(),
    pullChat(),
    pullUserData(),
  ]);

  if (pullJ.error) errors.push(pullJ.error);
  if (pullV.error) errors.push(pullV.error);
  if (pullC.error) errors.push(pullC.error);
  if (pullU.error) errors.push(pullU.error);

  return {
    journal: pullJ.data,
    vision: pullV.data,
    chat: pullC.data,
    userData: pullU.data,
    errors,
  };
}
