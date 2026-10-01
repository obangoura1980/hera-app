import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Button, Chip, ErrorText, IconButton, tap } from "@/src/components/ui";
import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";

const KINDS = [
  { k: "gratitude", label: "Gratitude", prompt: "Today I'm grateful for…" },
  { k: "intention", label: "Intention", prompt: "I am calling in…" },
  { k: "reflection", label: "Reflection", prompt: "What I noticed today…" },
] as const;
const MOODS = ["Heavy", "Low", "Okay", "Light", "Radiant"];

export default function JournalNew() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [kind, setKind] = useState<(typeof KINDS)[number]["k"]>("gratitude");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(4);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!content.trim()) return setErr("Write a few words first");
    setBusy(true);
    setErr(null);
    try {
      await api("/journal", { method: "POST", body: { kind, title: title.trim(), content: content.trim(), mood } });
      tap("success");
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      router.back();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root} testID="journal-new-screen">
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <IconButton testID="journal-new-close-button" name="x" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>New entry</Text>
        <View style={{ width: 44 }} />
      </View>
      <KeyboardAwareScrollView bottomOffset={96} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
          {KINDS.map((k) => (
            <Chip key={k.k} testID={`journal-kind-${k.k}`} label={k.label} selected={kind === k.k} onPress={() => setKind(k.k)} />
          ))}
        </ScrollView>
        <TextInput
          testID="journal-title-input"
          style={styles.title}
          placeholder="Give it a title (optional)"
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />
        <TextInput
          testID="journal-content-input"
          style={styles.content}
          placeholder={KINDS.find((k) => k.k === kind)!.prompt}
          placeholderTextColor={colors.muted}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          maxLength={5000}
        />
        <Text style={styles.label}>How do you feel?</Text>
        <View style={styles.moods}>
          {MOODS.map((m, i) => (
            <Pressable
              key={m}
              testID={`journal-mood-${i + 1}`}
              onPress={() => {
                tap();
                setMood(i + 1);
              }}
              style={[styles.mood, mood === i + 1 && styles.moodOn]}
            >
              <View style={[styles.moodDot, { opacity: 0.3 + i * 0.17 }]} />
              <Text style={styles.moodText}>{m}</Text>
            </Pressable>
          ))}
        </View>
        <ErrorText msg={err} testID="journal-new-error-text" />
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          <Button testID="journal-save-button" title="Save entry" icon="check" onPress={save} loading={busy} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingBottom: space.sm },
  headerTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  chips: { gap: space.sm, paddingVertical: space.md },
  title: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  content: {
    fontFamily: fonts.text,
    fontSize: 17,
    lineHeight: 27,
    color: c.onSurfaceSecondary,
    minHeight: 220,
    paddingVertical: space.lg,
  },
  label: { fontFamily: fonts.text, fontSize: 14, fontWeight: "700", color: c.muted, marginTop: space.lg, marginBottom: space.md },
  moods: { flexDirection: "row", gap: space.sm },
  mood: { flex: 1, alignItems: "center", gap: 6, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  moodOn: { borderColor: c.brandPrimary, backgroundColor: c.brandTertiary },
  moodDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: c.error },
  moodText: { fontFamily: fonts.text, fontSize: 11, fontWeight: "700", color: c.onSurfaceTertiary },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.divider },
}));
