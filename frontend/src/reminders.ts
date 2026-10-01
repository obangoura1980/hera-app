import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "@/src/api";
import { storage } from "@/src/utils/storage";

export type ReminderType = "morning" | "evening";
export type ReminderSetting = { enabled: boolean; hour: number; minute: number };

const IDS: Record<ReminderType, string> = { morning: "hera-morning-reminder", evening: "hera-evening-reminder" };
const TITLES: Record<ReminderType, string> = {
  morning: "✨ Your Morning Affirmation",
  evening: "🌙 Evening Reflection with Hera",
};
export const DEFAULTS: Record<ReminderType, ReminderSetting> = {
  morning: { enabled: false, hour: 8, minute: 0 },
  evening: { enabled: false, hour: 21, minute: 0 },
};
const CHANNEL_ID = "hera-reminders";
export const remindersSupported = Platform.OS !== "web";

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function loadReminder(type: ReminderType): Promise<ReminderSetting> {
  return (await storage.getItem<ReminderSetting>(`hera_reminder_${type}`, DEFAULTS[type])) ?? DEFAULTS[type];
}

export function formatTime(hour: number, minute: number) {
  const period = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minute).padStart(2, "0")} ${period}`;
}

export async function getPermission() {
  return Notifications.getPermissionsAsync();
}

export async function requestPermission() {
  return Notifications.requestPermissionsAsync();
}

export async function saveReminder(type: ReminderType, setting: ReminderSetting) {
  await storage.setItem(`hera_reminder_${type}`, setting);
  if (!remindersSupported) return;
  await Notifications.cancelScheduledNotificationAsync(IDS[type]).catch(() => {});
  if (!setting.enabled) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Hera Daily Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let body = "Take a breath. Your dream life is unfolding.";
  try {
    const { items } = await api<{ items: string[] }>("/affirmations/list");
    if (items.length) body = items[Math.floor(Math.random() * items.length)];
  } catch {
    // keep the default body when offline
  }
  await Notifications.scheduleNotificationAsync({
    identifier: IDS[type],
    content: { title: TITLES[type], body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: setting.hour,
      minute: setting.minute,
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

export async function cancelAllReminders() {
  for (const t of ["morning", "evening"] as ReminderType[]) {
    await storage.setItem(`hera_reminder_${t}`, DEFAULTS[t]);
  }
  if (remindersSupported) await Notifications.cancelAllScheduledNotificationsAsync();
}
