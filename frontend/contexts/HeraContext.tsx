
import React, { createContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@/src/utils/async-storage';
import { getDailyAffirmation, getPersonalizedAffirmation } from '@/services/heraAI';
import {
  scheduleReminder, cancelReminder, refreshReminders,
  MORNING_NOTIF_ID, EVENING_NOTIF_ID,
} from '@/services/notificationService';
import {
  fullSync, pullAllData, pushJournal, pushVision, pushChat, pushUserData,
  deleteRemoteJournal, deleteRemoteVision, clearRemoteChat,
  type SyncStatus, type FullSyncResult,
} from '@/services/syncService';
import { getSupabaseClient } from '@/template';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: number;
  type: 'gratitude' | 'reflection' | 'wins' | 'daily';
}

export interface VisionItem {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  targetDate: string;
  progress: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'hera';
  content: string;
  timestamp: string;
}

export interface HeraUser {
  name: string;
  goals: string[];
  focusAreas: string[];
  onboardingComplete: boolean;
  streak: number;
}

export interface NotifSetting {
  enabled: boolean;
  hour: number;
  minute: number;
}

interface HeraContextType {
  user: HeraUser;
  updateUser: (u: Partial<HeraUser>) => void;
  journalEntries: JournalEntry[];
  addJournalEntry: (e: Omit<JournalEntry, 'id' | 'date'>) => void;
  deleteJournalEntry: (id: string) => void;
  visionItems: VisionItem[];
  addVisionItem: (v: Omit<VisionItem, 'id' | 'createdAt'>) => void;
  deleteVisionItem: (id: string) => void;
  chatHistory: ChatMessage[];
  addMessage: (m: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
  todayMood: number | null;
  setTodayMood: (m: number) => void;
  favoriteAffirmations: string[];
  toggleFavoriteAffirmation: (a: string) => void;
  dailyAffirmation: string;
  isLoading: boolean;
  notifMorning: NotifSetting;
  notifEvening: NotifSetting;
  updateNotifMorning: (s: NotifSetting) => Promise<void>;
  updateNotifEvening: (s: NotifSetting) => Promise<void>;
  // Cloud sync
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
  isAuthenticated: boolean;
  // Restore flow
  lockSync: () => void;
  triggerSync: (mode?: 'restore' | 'local_only' | 'merge') => Promise<void>;
}

export const HeraContext = createContext<HeraContextType | undefined>(undefined);

// ── Constants ─────────────────────────────────────────────────────────────────

const KEYS = {
  USER: '@hera_user',
  JOURNAL: '@hera_journal',
  VISION: '@hera_vision',
  CHAT: '@hera_chat',
  MOOD: '@hera_mood_today',
  FAVORITES: '@hera_favorites',
  LAST_OPEN: '@hera_last_open',
  NOTIF: '@hera_notif_settings',
  LAST_SYNC: '@hera_last_sync',
} as const;

const DEFAULT_MORNING: NotifSetting = { enabled: false, hour: 8, minute: 0 };
const DEFAULT_EVENING: NotifSetting = { enabled: false, hour: 20, minute: 0 };

const futureDate = (days: number) =>
  new Date(Date.now() + days * 864e5).toISOString().split('T')[0];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'hera',
  content: "Welcome, beautiful soul. I'm Hera — your guide on this journey of transformation. ✨\n\nI'm here to support your manifestation journey, help you build powerful habits, and walk with you as you become the highest version of yourself.\n\nWhat would you like to explore today?",
  timestamp: new Date().toISOString(),
};

const INITIAL_VISION: VisionItem[] = [
  { id: 'v1', title: "Dream Home", description: "A beautiful sanctuary filled with light, love, and abundance", category: "Lifestyle", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80", targetDate: futureDate(500), progress: 25, createdAt: new Date().toISOString() },
  { id: 'v2', title: "Financial Freedom", description: "7-figure wealth that creates freedom and true impact", category: "Wealth", imageUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&q=80", targetDate: futureDate(700), progress: 30, createdAt: new Date().toISOString() },
  { id: 'v3', title: "Vibrant Health", description: "Boundless energy, strength, and vitality every single day", category: "Health", imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80", targetDate: futureDate(180), progress: 55, createdAt: new Date().toISOString() },
  { id: 'v4', title: "Dream Travel", description: "Experiencing the world's most beautiful places with joy", category: "Lifestyle", imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=80", targetDate: futureDate(365), progress: 40, createdAt: new Date().toISOString() },
];

const INITIAL_JOURNAL: JournalEntry[] = [
  { id: 'j1', date: new Date(Date.now() - 864e5).toISOString(), title: "Morning Gratitude", content: "Today I am so grateful for the opportunity to grow, for my health, for the people who love me, and for this journey of self-discovery.", mood: 4, type: 'gratitude' },
  { id: 'j2', date: new Date(Date.now() - 2 * 864e5).toISOString(), title: "Weekly Reflection", content: "This week taught me that consistency beats motivation. I showed up even when I did not feel like it, and I am proud of that.", mood: 3, type: 'reflection' },
];

const DEFAULT_USER: HeraUser = { name: '', goals: [], focusAreas: [], onboardingComplete: false, streak: 1 };

// ── Merge helpers ─────────────────────────────────────────────────────────────

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item); // Remote wins on conflict
  return Array.from(map.values());
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function HeraProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<HeraUser>(DEFAULT_USER);
  const [notifMorning, setNotifMorning] = useState<NotifSetting>(DEFAULT_MORNING);
  const [notifEvening, setNotifEvening] = useState<NotifSetting>(DEFAULT_EVENING);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(INITIAL_JOURNAL);
  const [visionItems, setVisionItems] = useState<VisionItem[]>(INITIAL_VISION);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [todayMood, setTodayMoodState] = useState<number | null>(null);
  const [favoriteAffirmations, setFavoriteAffirmations] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Sync lock — set synchronously before OTP login to prevent auto-sync
  // during the restore-choice UI, cleared by triggerSync
  const syncLockRef = useRef(false);

  // Refs to read current state inside async operations without stale closures
  const journalRef = useRef(journalEntries);
  const visionRef = useRef(visionItems);
  const chatRef = useRef(chatHistory);
  const userRef = useRef(user);
  journalRef.current = journalEntries;
  visionRef.current = visionItems;
  chatRef.current = chatHistory;
  userRef.current = user;

  // ─── Auth state listener ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session?.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ─── Initial load from AsyncStorage ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [userStr, journalStr, visionStr, chatStr, moodStr, favStr, lastOpenStr, notifStr, lastSyncStr] =
          await Promise.all([
            AsyncStorage.getItem(KEYS.USER),
            AsyncStorage.getItem(KEYS.JOURNAL),
            AsyncStorage.getItem(KEYS.VISION),
            AsyncStorage.getItem(KEYS.CHAT),
            AsyncStorage.getItem(KEYS.MOOD),
            AsyncStorage.getItem(KEYS.FAVORITES),
            AsyncStorage.getItem(KEYS.LAST_OPEN),
            AsyncStorage.getItem(KEYS.NOTIF),
            AsyncStorage.getItem(KEYS.LAST_SYNC),
          ]);

        if (lastSyncStr) setLastSyncedAt(lastSyncStr);

        // User + streak
        let loadedUser: HeraUser = { ...DEFAULT_USER };
        if (userStr) loadedUser = { ...loadedUser, ...JSON.parse(userStr) };

        const today = new Date().toDateString();
        await AsyncStorage.setItem(KEYS.LAST_OPEN, today);

        if (lastOpenStr && lastOpenStr !== today) {
          const diffDays = Math.round(
            (new Date(today).getTime() - new Date(lastOpenStr).getTime()) / 864e5
          );
          if (diffDays === 1) loadedUser = { ...loadedUser, streak: (loadedUser.streak || 1) + 1 };
          else if (diffDays > 1) loadedUser = { ...loadedUser, streak: 1 };
        } else if (!lastOpenStr) {
          loadedUser = { ...loadedUser, streak: 1 };
        }

        setUser(loadedUser);

        if (journalStr) { const p = JSON.parse(journalStr); if (Array.isArray(p) && p.length > 0) setJournalEntries(p); }
        if (visionStr) { const p = JSON.parse(visionStr); if (Array.isArray(p) && p.length > 0) setVisionItems(p); }
        if (chatStr) { const p = JSON.parse(chatStr); if (Array.isArray(p) && p.length > 0) setChatHistory(p); }
        if (moodStr) { const md = JSON.parse(moodStr); if (md.date === today) setTodayMoodState(md.value); }
        if (favStr) { const p = JSON.parse(favStr); if (Array.isArray(p)) setFavoriteAffirmations(p); }

        let loadedMorning = DEFAULT_MORNING;
        let loadedEvening = DEFAULT_EVENING;
        if (notifStr) {
          const parsed = JSON.parse(notifStr);
          if (parsed.morning) loadedMorning = parsed.morning;
          if (parsed.evening) loadedEvening = parsed.evening;
        }
        setNotifMorning(loadedMorning);
        setNotifEvening(loadedEvening);

        const u = loadedUser;
        refreshReminders(loadedMorning, loadedEvening, u.focusAreas, u.goals).catch(() => {});
      } catch {
        // Silent — defaults remain
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ─── Persist to AsyncStorage on changes ────────────────────────────────
  useEffect(() => { if (!isLoading) AsyncStorage.setItem(KEYS.USER, JSON.stringify(user)).catch(() => {}); }, [user, isLoading]);
  useEffect(() => { if (!isLoading) AsyncStorage.setItem(KEYS.JOURNAL, JSON.stringify(journalEntries)).catch(() => {}); }, [journalEntries, isLoading]);
  useEffect(() => { if (!isLoading) AsyncStorage.setItem(KEYS.VISION, JSON.stringify(visionItems)).catch(() => {}); }, [visionItems, isLoading]);
  useEffect(() => { if (!isLoading) AsyncStorage.setItem(KEYS.CHAT, JSON.stringify(chatHistory)).catch(() => {}); }, [chatHistory, isLoading]);
  useEffect(() => { if (!isLoading) AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(favoriteAffirmations)).catch(() => {}); }, [favoriteAffirmations, isLoading]);
  useEffect(() => {
    if (!isLoading) AsyncStorage.setItem(KEYS.NOTIF, JSON.stringify({ morning: notifMorning, evening: notifEvening })).catch(() => {});
  }, [notifMorning, notifEvening, isLoading]);

  // ─── Cloud sync ───────────────────────────────────────────────────────

  // Overwrite local state with remote data (restore mode — no merge, remote wins entirely)
  const applyRemoteDataOverwrite = useCallback((result: FullSyncResult) => {
    try {
      if (Array.isArray(result.journal) && result.journal.length > 0) {
        const sorted = [...result.journal].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setJournalEntries(sorted);
      }
      if (Array.isArray(result.vision) && result.vision.length > 0) {
        setVisionItems(result.vision);
      }
      if (Array.isArray(result.chat)) {
        const filtered = result.chat.filter(m => m && m.id !== 'welcome');
        if (filtered.length > 0) {
          const sorted = [...filtered].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setChatHistory([WELCOME_MESSAGE, ...sorted]);
        }
      }
      if (result.userData && typeof result.userData === 'object' && Object.keys(result.userData).length > 0) {
        setUser(prev => ({
          ...prev,
          name: result.userData!.name || prev.name,
          goals: result.userData!.goals?.length ? result.userData!.goals : prev.goals,
          focusAreas: result.userData!.focusAreas?.length ? result.userData!.focusAreas : prev.focusAreas,
          streak: result.userData!.streak ?? prev.streak,
        }));
      }
    } catch (e) {
      console.warn('[HeraContext] applyRemoteDataOverwrite error:', e);
    }
  }, []);

  // Merge remote data into local state (default sync — deduplicates by id)
  const applyRemoteData = useCallback((result: Awaited<ReturnType<typeof fullSync>>) => {
    if (result.journal) {
      const merged = mergeById(journalRef.current, result.journal);
      const sorted = [...merged].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setJournalEntries(sorted);
    }
    if (result.vision) {
      const merged = mergeById(visionRef.current, result.vision);
      setVisionItems(merged);
    }
    if (result.chat) {
      const nonWelcome = chatRef.current.filter(m => m.id !== 'welcome');
      const merged = mergeById(nonWelcome, result.chat);
      const sorted = [...merged].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setChatHistory([WELCOME_MESSAGE, ...sorted.filter(m => m.id !== 'welcome')]);
    }
    if (result.userData && Object.keys(result.userData).length > 0) {
      setUser(prev => ({
        ...prev,
        name: result.userData!.name || prev.name,
        goals: result.userData!.goals?.length ? result.userData!.goals : prev.goals,
        focusAreas: result.userData!.focusAreas?.length ? result.userData!.focusAreas : prev.focusAreas,
        streak: Math.max(prev.streak, result.userData!.streak ?? 0),
      }));
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    try {
      const result = await fullSync({
        journalEntries: journalRef.current,
        visionItems: visionRef.current,
        chatHistory: chatRef.current,
        user: userRef.current,
      });
      applyRemoteData(result);
      const now = new Date().toISOString();
      setLastSyncedAt(now);
      await AsyncStorage.setItem(KEYS.LAST_SYNC, now);
      setSyncStatus(result.errors.length > 0 ? 'error' : 'success');
    } catch {
      setSyncStatus('error');
    }
  }, [syncStatus, applyRemoteData]);

  // Auto-sync when auth state changes to authenticated.
  // Blocked when syncLockRef is true — login screen calls lockSync() before OTP verify
  // and then calls triggerSync(mode) after the user makes their restore choice.
  useEffect(() => {
    if (isAuthenticated && !isLoading && !syncLockRef.current) {
      syncNow();
    }
  }, [isAuthenticated, isLoading, syncNow]);

  // Lock sync — call synchronously before verifyOTPAndLogin to block auto-sync
  const lockSync = useCallback(() => {
    syncLockRef.current = true;
  }, []);

  // Unlock and sync with a specific strategy, called after user makes restore choice
  const triggerSync = useCallback(async (mode: 'restore' | 'local_only' | 'merge' = 'merge') => {
    syncLockRef.current = false;

    if (mode === 'restore') {
      setSyncStatus('syncing');
      try {
        const result = await pullAllData();
        if (result) applyRemoteDataOverwrite(result);
        const now = new Date().toISOString();
        setLastSyncedAt(now);
        await AsyncStorage.setItem(KEYS.LAST_SYNC, now).catch(() => {});
        setSyncStatus((result?.errors?.length ?? 0) > 0 ? 'error' : 'success');
      } catch (e) {
        console.warn('[HeraContext] triggerSync restore error:', e);
        setSyncStatus('error');
      }
    } else if (mode === 'local_only') {
      setSyncStatus('syncing');
      try {
        const journal = journalRef.current ?? [];
        const vision  = visionRef.current  ?? [];
        const chat    = chatRef.current    ?? [];
        const u       = userRef.current    ?? DEFAULT_USER;
        await Promise.all([
          pushJournal(journal),
          pushVision(vision),
          pushChat(chat),
          pushUserData(u),
        ]);
        const now = new Date().toISOString();
        setLastSyncedAt(now);
        await AsyncStorage.setItem(KEYS.LAST_SYNC, now).catch(() => {});
        setSyncStatus('success');
      } catch (e) {
        console.warn('[HeraContext] triggerSync local_only error:', e);
        setSyncStatus('error');
      }
    } else {
      await syncNow();
    }
  }, [applyRemoteDataOverwrite, syncNow]);

  // ─── Actions ──────────────────────────────────────────────────────────
  const updateUser = useCallback((u: Partial<HeraUser>) => {
    setUser(p => {
      const next = { ...p, ...u };
      if (isAuthenticated) pushUserData(next).catch(() => {});
      return next;
    });
  }, [isAuthenticated]);

  const addJournalEntry = useCallback((e: Omit<JournalEntry, 'id' | 'date'>) => {
    const newEntry: JournalEntry = { ...e, id: `j${Date.now()}`, date: new Date().toISOString() };
    setJournalEntries(p => {
      const next = [newEntry, ...p];
      if (isAuthenticated) pushJournal([newEntry]).catch(() => {});
      return next;
    });
  }, [isAuthenticated]);

  const deleteJournalEntry = useCallback((id: string) => {
    setJournalEntries(p => p.filter(e => e.id !== id));
    if (isAuthenticated) deleteRemoteJournal(id).catch(() => {});
  }, [isAuthenticated]);

  const addVisionItem = useCallback((v: Omit<VisionItem, 'id' | 'createdAt'>) => {
    const newItem: VisionItem = { ...v, id: `v${Date.now()}`, createdAt: new Date().toISOString() };
    setVisionItems(p => {
      const next = [...p, newItem];
      if (isAuthenticated) pushVision([newItem]).catch(() => {});
      return next;
    });
  }, [isAuthenticated]);

  const deleteVisionItem = useCallback((id: string) => {
    setVisionItems(p => p.filter(v => v.id !== id));
    if (isAuthenticated) deleteRemoteVision(id).catch(() => {});
  }, [isAuthenticated]);

  const addMessage = useCallback((m: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = { ...m, id: `msg${Date.now()}`, timestamp: new Date().toISOString() };
    setChatHistory(p => {
      const next = [...p, newMsg];
      if (isAuthenticated) pushChat([newMsg]).catch(() => {});
      return next;
    });
  }, [isAuthenticated]);

  const clearChat = useCallback(async () => {
    setChatHistory([WELCOME_MESSAGE]);
    if (isAuthenticated) {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) clearRemoteChat(data.user.id).catch(() => {});
    }
  }, [isAuthenticated]);

  const setTodayMood = useCallback((m: number) => {
    setTodayMoodState(m);
    AsyncStorage.setItem(KEYS.MOOD, JSON.stringify({ value: m, date: new Date().toDateString() })).catch(() => {});
  }, []);

  const toggleFavoriteAffirmation = useCallback((a: string) => {
    setFavoriteAffirmations(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
  }, []);

  const updateNotifMorning = useCallback(async (s: NotifSetting) => {
    setNotifMorning(s);
    if (s.enabled) await scheduleReminder(MORNING_NOTIF_ID, '✨ Your Morning Affirmation', s.hour, s.minute, user.focusAreas, user.goals);
    else await cancelReminder(MORNING_NOTIF_ID);
  }, [user.focusAreas, user.goals]);

  const updateNotifEvening = useCallback(async (s: NotifSetting) => {
    setNotifEvening(s);
    if (s.enabled) await scheduleReminder(EVENING_NOTIF_ID, '🌙 Evening Reflection with Hera', s.hour, s.minute, user.focusAreas, user.goals);
    else await cancelReminder(EVENING_NOTIF_ID);
  }, [user.focusAreas, user.goals]);

  return (
    <HeraContext.Provider value={{
      user, updateUser,
      journalEntries, addJournalEntry, deleteJournalEntry,
      visionItems, addVisionItem, deleteVisionItem,
      chatHistory, addMessage, clearChat,
      todayMood, setTodayMood,
      favoriteAffirmations, toggleFavoriteAffirmation,
      dailyAffirmation: user.goals?.length || user.focusAreas?.length
        ? getPersonalizedAffirmation(user.goals, user.focusAreas, todayMood, user.name)
        : getDailyAffirmation(),
      isLoading,
      notifMorning, updateNotifMorning,
      notifEvening, updateNotifEvening,
      syncStatus, lastSyncedAt, syncNow, isAuthenticated,
      lockSync, triggerSync,
    }}>
      {children}
    </HeraContext.Provider>
  );
}
