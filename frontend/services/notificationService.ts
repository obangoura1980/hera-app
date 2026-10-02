import { Platform } from 'react-native';
import { AFFIRMATIONS_BY_CATEGORY, DAILY_AFFIRMATIONS } from './heraAI';

// expo-notifications throws at import time inside Expo Go on Android (SDK 53+
// removed remote push there). Load it lazily so the whole app doesn't crash in
// Expo Go; reminders simply report themselves unavailable until a real build.
let Notifications: typeof import('expo-notifications') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

export const MORNING_NOTIF_ID = 'hera-morning-reminder';
export const EVENING_NOTIF_ID = 'hera-evening-reminder';

const CHANNEL_ID = 'hera-reminders';

// Map user focus areas / goals → affirmation categories
const AREA_TO_CATEGORY: Record<string, string> = {
  manifestation: 'wealth',
  mindset: 'confidence',
  journaling: 'happiness',
  affirmations: 'confidence',
  visualization: 'career',
  confidence: 'confidence',
  abundance: 'wealth',
  love: 'love',
  health: 'health',
  career: 'career',
  happiness: 'happiness',
  family: 'family',
  freedom: 'productivity',
  business: 'business',
  purpose: 'career',
};

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Call once at app startup (inside useEffect). */
export async function initNotifications(): Promise<boolean> {
  const n = Notifications;
  if (!n) return false;
  if (Platform.OS === 'android') {
    await n.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Hera Daily Reminders',
      importance: n.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4AF37',
    });
  }
  const { status } = await n.getPermissionsAsync();
  return status === 'granted';
}

/** Check, then request permission. 'blocked' means the OS won't show the prompt again.
 *  'unavailable' means notifications can't run here at all (Expo Go preview). */
export async function requestNotificationPermissions(): Promise<'granted' | 'denied' | 'blocked' | 'unavailable'> {
  const n = Notifications;
  if (!n) return 'unavailable';
  let perm = await n.getPermissionsAsync();
  if (perm.granted) return 'granted';
  if (perm.canAskAgain) perm = await n.requestPermissionsAsync();
  if (perm.granted) return 'granted';
  return perm.canAskAgain ? 'denied' : 'blocked';
}

/** Schedule (or reschedule) a daily affirmation reminder. */
export async function scheduleReminder(
  identifier: typeof MORNING_NOTIF_ID | typeof EVENING_NOTIF_ID,
  title: string,
  hour: number,
  minute: number,
  focusAreas: string[],
  goals: string[],
): Promise<void> {
  // Always cancel the old one first
  const n = Notifications;
  if (!n) return;
  await n.cancelScheduledNotificationAsync(identifier).catch(() => {});

  const body = pickAffirmation([...focusAreas, ...goals]);

  await n.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as any, // cross-version compatible
  });
}

/** Cancel a scheduled reminder. */
export async function cancelReminder(
  identifier: typeof MORNING_NOTIF_ID | typeof EVENING_NOTIF_ID,
): Promise<void> {
  await Notifications?.cancelScheduledNotificationAsync(identifier).catch(() => {});
}

/** Re-schedule ALL active reminders with fresh affirmations (call on each app open). */
export async function refreshReminders(
  morning: { enabled: boolean; hour: number; minute: number },
  evening: { enabled: boolean; hour: number; minute: number },
  focusAreas: string[],
  goals: string[],
): Promise<void> {
  if (!Notifications) return;
  if (morning.enabled) {
    await scheduleReminder(MORNING_NOTIF_ID, '✨ Your Morning Affirmation', morning.hour, morning.minute, focusAreas, goals);
  }
  if (evening.enabled) {
    await scheduleReminder(EVENING_NOTIF_ID, '🌙 Evening Reflection with Hera', evening.hour, evening.minute, focusAreas, goals);
  }
}

function pickAffirmation(areas: string[]): string {
  const cats = areas.map(a => AREA_TO_CATEGORY[a.toLowerCase()]).filter(Boolean);
  if (cats.length === 0) {
    return DAILY_AFFIRMATIONS[Math.floor(Math.random() * DAILY_AFFIRMATIONS.length)];
  }
  const cat = cats[Math.floor(Math.random() * cats.length)];
  const pool = AFFIRMATIONS_BY_CATEGORY[cat] ?? DAILY_AFFIRMATIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Format hour + minute into a readable string (e.g. "8:30 AM"). */
export function formatTime(hour: number, minute: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}
