import Feather from "@react-native-vector-icons/feather";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, Switch, Text, TextInput, View } from "react-native";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Sheet } from "@/src/components/sheet";
import { Button, ErrorText, tap } from "@/src/components/ui";
import {
  cancelAllReminders,
  formatTime,
  getPermission,
  loadReminder,
  remindersSupported,
  requestPermission,
  saveReminder,
  type ReminderSetting,
  type ReminderType,
} from "@/src/reminders";
import { makeStyles, radius, space, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const REMINDER_META: Record<ReminderType, { emoji: string; label: string; desc: string }> = {
  morning: { emoji: "☀️", label: "Morning Affirmation", desc: "Daily uplift to start your day" },
  evening: { emoji: "🌙", label: "Evening Reflection", desc: "Wind down with intention" },
};

export function RemindersSection() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [settings, setSettings] = useState<Record<ReminderType, ReminderSetting> | null>(null);
  const [picker, setPicker] = useState<ReminderType | null>(null);
  const [draft, setDraft] = useState({ hour: 8, minute: 0 });
  const [permSheet, setPermSheet] = useState<"explain" | "blocked" | null>(null);
  const [pendingType, setPendingType] = useState<ReminderType | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadReminder("morning"), loadReminder("evening")]).then(([morning, evening]) => setSettings({ morning, evening }));
  }, []);

  const openPicker = (type: ReminderType) => {
    if (!settings) return;
    setDraft({ hour: settings[type].hour, minute: settings[type].minute });
    setPicker(type);
  };

  const onToggle = async (type: ReminderType, value: boolean) => {
    if (!settings) return;
    tap();
    if (!value) {
      const next = { ...settings[type], enabled: false };
      setSettings({ ...settings, [type]: next });
      await saveReminder(type, next);
      return;
    }
    if (!remindersSupported) {
      setNote("Reminders work in the Hera app on your phone.");
      return;
    }
    const perm = await getPermission();
    if (perm.granted) return openPicker(type);
    setPendingType(type);
    setPermSheet(perm.canAskAgain ? "explain" : "blocked");
  };

  const askPermission = async () => {
    const res = await requestPermission();
    if (res.granted && pendingType) {
      setPermSheet(null);
      openPicker(pendingType);
    } else {
      setPermSheet(res.canAskAgain ? null : "blocked");
    }
  };

  const confirmTime = async () => {
    if (!picker || !settings) return;
    const next = { enabled: true, ...draft };
    setSettings({ ...settings, [picker]: next });
    setPicker(null);
    await saveReminder(picker, next);
    tap("success");
    setNote(`Your ${picker} reminder is set for ${formatTime(next.hour, next.minute)} every day.`);
  };

  const stepHour = (d: number) => setDraft((x) => ({ ...x, hour: (x.hour + d + 24) % 24 }));
  const stepMin = (d: number) => setDraft((x) => ({ ...x, minute: (x.minute + d + 60) % 60 }));

  return (
    <>
      <Text style={styles.section}>DAILY REMINDERS</Text>
      <View style={styles.rows}>
        {(["morning", "evening"] as ReminderType[]).map((t, i) => (
          <View key={t} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={styles.rowIcon}>
              <Text style={{ fontSize: 18 }}>{REMINDER_META[t].emoji}</Text>
            </View>
            <Pressable style={{ flex: 1 }} onPress={() => settings?.[t].enabled && openPicker(t)} testID={`reminder-${t}-time`}>
              <Text style={styles.rowText}>{REMINDER_META[t].label}</Text>
              <Text style={styles.rowSub}>
                {settings?.[t].enabled ? `Every day at ${formatTime(settings[t].hour, settings[t].minute)}` : REMINDER_META[t].desc}
              </Text>
            </Pressable>
            <Switch
              testID={`reminder-${t}-switch`}
              value={!!settings?.[t].enabled}
              onValueChange={(v) => onToggle(t, v)}
              trackColor={{ false: colors.surfaceTertiary, true: colors.brandPrimary }}
              thumbColor={colors.onBrandPrimary}
            />
          </View>
        ))}
      </View>
      {note ? (
        <Text style={styles.note} testID="reminder-note">
          {note}
        </Text>
      ) : null}

      <Sheet visible={!!picker} onClose={() => setPicker(null)} title={picker === "morning" ? "☀️ Morning Reminder" : "🌙 Evening Reminder"} testID="reminder-time-sheet">
        <Text style={styles.sheetBody}>Choose your daily reminder time</Text>
        <View style={styles.timeRow}>
          {[
            { v: String(draft.hour % 12 === 0 ? 12 : draft.hour % 12), up: () => stepHour(1), down: () => stepHour(-1), id: "hour" },
            { v: String(draft.minute).padStart(2, "0"), up: () => stepMin(15), down: () => stepMin(-15), id: "minute" },
          ].map((c) => (
            <View key={c.id} style={styles.stepper}>
              <Pressable testID={`reminder-${c.id}-up`} onPress={c.up} style={styles.stepBtn}>
                <Feather name="chevron-up" size={22} color={colors.brandSecondary} />
              </Pressable>
              <Text style={styles.timeNum}>{c.v}</Text>
              <Pressable testID={`reminder-${c.id}-down`} onPress={c.down} style={styles.stepBtn}>
                <Feather name="chevron-down" size={22} color={colors.brandSecondary} />
              </Pressable>
            </View>
          ))}
          <Pressable testID="reminder-ampm" onPress={() => stepHour(12)} style={styles.ampm}>
            <Text style={styles.ampmText}>{draft.hour < 12 ? "AM" : "PM"}</Text>
          </Pressable>
        </View>
        <Button testID="reminder-set-button" title="Set Reminder" icon="bell" onPress={confirmTime} />
      </Sheet>

      <Sheet visible={!!permSheet} onClose={() => setPermSheet(null)} title="Gentle daily nudges" testID="reminder-permission-sheet">
        <Text style={styles.sheetBody}>
          {permSheet === "blocked"
            ? "Notifications are turned off for Hera. Turn them on in Settings to receive your daily affirmations."
            : "Allow notifications so Hera can send your affirmation each morning and a reflection prompt each evening."}
        </Text>
        {permSheet === "blocked" ? (
          <Button testID="reminder-open-settings-button" title="Open Settings" icon="settings" onPress={() => Linking.openSettings()} />
        ) : (
          <Button testID="reminder-allow-button" title="Allow notifications" icon="bell" onPress={askPermission} />
        )}
      </Sheet>
    </>
  );
}

const PRIVACY = [
  "Your journal entries, vision board, saved affirmations and chats with Hera are stored securely in your account and are only visible to you.",
  "Vision board photos are stored privately and can only be opened while you are signed in.",
  "Messages you send to Hera are processed by an AI model to write your replies. They are not used to advertise to you.",
  "You can erase your journey at any time with Reset Journey, or permanently remove everything with Delete Account.",
];
const HELP = [
  "Hera replies slowly or not at all? Check your connection and try again; long replies can take a few seconds.",
  "Reminders not arriving? Make sure notifications are allowed for Hera in your phone's Settings.",
  "Want a fresh start? Reset Journey clears your entries but keeps your account and plan.",
];

export function AccountSection() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { logout, user } = useAuth();
  const [sheet, setSheet] = useState<"privacy" | "help" | "reset" | "delete" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const close = () => {
    setSheet(null);
    setConfirmText("");
    setErr(null);
  };

  const reset = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("/account/reset", { method: "POST" });
      await cancelAllReminders();
      await storage.setItem("hera_onboarded", false);
      qc.invalidateQueries();
      tap("success");
      close();
      router.replace("/onboarding");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("/account", { method: "DELETE" });
      await cancelAllReminders();
      await storage.setItem("hera_onboarded", false);
      close();
      await logout();
      router.replace("/");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    { id: "privacy", icon: "shield", label: "Privacy & Data" },
    { id: "help", icon: "help-circle", label: "Help & Support" },
  ] as const;

  return (
    <>
      <View style={styles.rows}>
        {rows.map((r, i) => (
          <Pressable key={r.id} testID={`profile-${r.id}-row`} style={[styles.row, i > 0 && styles.rowBorder]} onPress={() => setSheet(r.id)}>
            <View style={styles.rowIcon}>
              <Feather name={r.icon} size={18} color={colors.brandSecondary} />
            </View>
            <Text style={styles.rowText}>{r.label}</Text>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <Pressable testID="profile-reset-journey-button" style={styles.resetBtn} onPress={() => setSheet("reset")}>
        <Text style={styles.resetText}>Reset Journey</Text>
      </Pressable>
      <Pressable testID="profile-delete-account-button" style={styles.deleteBtn} onPress={() => setSheet("delete")}>
        <Feather name="trash-2" size={16} color={colors.error} />
        <Text style={styles.deleteText}>Delete Account</Text>
      </Pressable>

      <Sheet visible={sheet === "privacy" || sheet === "help"} onClose={close} title={sheet === "help" ? "Help & Support" : "Privacy & Data"} testID="profile-info-sheet">
        {(sheet === "help" ? HELP : PRIVACY).map((p) => (
          <View key={p} style={styles.bullet}>
            <Feather name="check-circle" size={16} color={colors.brandSecondary} />
            <Text style={styles.bulletText}>{p}</Text>
          </View>
        ))}
        {sheet === "help" ? (
          <Button
            testID="profile-contact-support-button"
            title="Email support"
            icon="mail"
            variant="secondary"
            onPress={() => Linking.openURL(`mailto:support@hera.app?subject=Hera%20support&body=Account:%20${encodeURIComponent(user?.email ?? "")}`)}
            style={{ marginTop: space.md }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={sheet === "reset"} onClose={close} title="Reset Journey" testID="profile-reset-sheet">
        <Text style={styles.sheetBody}>
          This clears your journal, vision board, saved affirmations, Hera chats and streak, then restarts your introduction. Your account and plan stay.
        </Text>
        <ErrorText msg={err} />
        <Button testID="profile-reset-confirm-button" title="Reset my journey" onPress={reset} loading={busy} style={{ marginTop: space.md }} />
        <Button testID="profile-reset-cancel-button" title="Keep everything" variant="ghost" onPress={close} />
      </Sheet>

      <Sheet visible={sheet === "delete"} onClose={close} title="Delete Account" testID="profile-delete-sheet">
        <Text style={styles.sheetBody}>This permanently deletes your account and everything in it. This cannot be undone. Type DELETE to confirm.</Text>
        <TextInput
          testID="profile-delete-confirm-input"
          style={styles.input}
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          placeholder="DELETE"
          placeholderTextColor={colors.muted}
        />
        <ErrorText msg={err} />
        <Pressable
          testID="profile-delete-confirm-button"
          disabled={confirmText !== "DELETE" || busy}
          onPress={del}
          style={[styles.dangerBtn, (confirmText !== "DELETE" || busy) && { opacity: 0.4 }]}
        >
          <Text style={styles.dangerText}>{busy ? "Deleting…" : "Delete forever"}</Text>
        </Pressable>
        <Button testID="profile-delete-cancel-button" title="Cancel" variant="ghost" onPress={close} />
      </Sheet>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontSize: 14, fontWeight: "700", letterSpacing: 2.5, color: c.muted, marginTop: space.xxl, marginBottom: space.md },
  rows: { backgroundColor: c.surfaceSecondary, borderRadius: 24, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, minHeight: 60 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontSize: 16, fontWeight: "600", color: c.onSurface },
  rowSub: { fontSize: 13, color: c.onSurfaceTertiary, marginTop: 2 },
  note: { fontSize: 13, color: c.brandSecondary, marginTop: space.sm, textAlign: "center" },
  sheetBody: { fontSize: 15, lineHeight: 22, color: c.onSurfaceTertiary, textAlign: "center", marginBottom: space.lg },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.lg, marginBottom: space.xl },
  stepper: { alignItems: "center" },
  stepBtn: { width: 48, height: 44, alignItems: "center", justifyContent: "center" },
  timeNum: { fontSize: 40, fontWeight: "800", color: c.onSurface, minWidth: 64, textAlign: "center" },
  ampm: { height: 48, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: c.brandTertiary, justifyContent: "center" },
  ampmText: { fontSize: 16, fontWeight: "800", color: c.onBrandTertiary },
  bullet: { flexDirection: "row", gap: space.md, marginBottom: space.md, alignItems: "flex-start" },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22, color: c.onSurfaceSecondary },
  resetBtn: { alignItems: "center", justifyContent: "center", minHeight: 52, marginTop: space.xl, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border },
  resetText: { fontSize: 15, fontWeight: "700", color: c.onSurfaceTertiary },
  deleteBtn: { flexDirection: "row", gap: space.sm, alignItems: "center", justifyContent: "center", minHeight: 48, marginTop: space.sm },
  deleteText: { fontSize: 15, fontWeight: "700", color: c.error },
  input: { height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: space.lg, fontSize: 16, color: c.onSurface, textAlign: "center", letterSpacing: 4 },
  dangerBtn: { minHeight: 52, borderRadius: radius.pill, backgroundColor: c.error, alignItems: "center", justifyContent: "center", marginTop: space.md },
  dangerText: { fontSize: 16, fontWeight: "800", color: c.onError },
}));
