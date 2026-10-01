import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, streamCoach, type ChatMsg } from "@/src/api";
import { Chip, IconButton, tap } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";

const PROMPTS = [
  "Help me write an affirmation",
  "I feel stuck on my goals",
  "Guide me through scripting",
  "How do I release doubt?",
];

export default function Coach() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 49 + insets.bottom;
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const kbOffset = usesNativeTabs ? insets.bottom : Platform.OS === "ios" ? tabBarHeight : 0;
  const qc = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const history = useQuery({ queryKey: ["coach"], queryFn: () => api<ChatMsg[]>("/coach/messages") });
  useEffect(() => {
    if (history.data && !streaming) setMsgs(history.data);
  }, [history.data, streaming]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || streaming) return;
    tap();
    setErr(null);
    setInput("");
    const aid = `a-${Date.now()}`;
    setMsgs((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: t }, { id: aid, role: "assistant", text: "" }]);
    setStreaming(true);
    try {
      await streamCoach(t, (d) => setMsgs((m) => m.map((x) => (x.id === aid ? { ...x, text: x.text + d } : x))));
    } catch (e: any) {
      setErr(e.message);
      setMsgs((m) => m.filter((x) => !(x.id === aid && !x.text)));
    } finally {
      setStreaming(false);
      qc.invalidateQueries({ queryKey: ["coach"] });
    }
  };

  const clear = async () => {
    await api("/coach/messages", { method: "DELETE" });
    setMsgs([]);
    qc.invalidateQueries({ queryKey: ["coach"] });
  };

  return (
    <View style={styles.root} testID="coach-screen">
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={styles.heraAvatar}>
          <Feather name="feather" size={18} color={colors.onBrandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Hera</Text>
          <Text style={styles.sub}>{streaming ? "writing to you…" : "Your manifestation coach"}</Text>
        </View>
        {msgs.length ? <IconButton testID="coach-clear-button" name="rotate-ccw" onPress={clear} /> : null}
      </View>

      <KeyboardAvoidingView behavior="translate-with-padding" keyboardVerticalOffset={kbOffset} style={{ flex: 1 }}>
        {history.isLoading ? (
          <ActivityIndicator style={{ marginTop: space.xxxl }} color={colors.brandPrimary} />
        ) : (
          <FlatList
            ref={listRef}
            data={msgs}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty} testID="coach-empty-state">
                <View style={styles.emptyAvatar}>
                  <Feather name="feather" size={30} color={colors.onBrandTertiary} />
                </View>
                <Text style={styles.emptyTitle}>{"Hello, I'm Hera."}</Text>
                <Text style={styles.emptyBody}>
                  {"Tell me what you're calling into your life. I'll help you shape it into words, feelings and gentle next steps."}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Animated.View
                entering={FadeInUp.duration(300)}
                style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}
                testID={`coach-message-${item.role}`}
              >
                {item.text ? (
                  <Text style={[styles.msgText, item.role === "user" && styles.userText]}>{item.text}</Text>
                ) : (
                  <ActivityIndicator size="small" color={colors.brandPrimary} testID="coach-typing-indicator" />
                )}
              </Animated.View>
            )}
          />
        )}

        {err ? (
          <Text style={styles.err} testID="coach-error-text">
            {err}
          </Text>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow} keyboardShouldPersistTaps="handled">
          {PROMPTS.map((p, i) => (
            <Chip key={p} testID={`coach-prompt-chip-${i}`} label={p} onPress={() => send(p)} />
          ))}
        </ScrollView>
        <View style={[styles.inputBar, { paddingBottom: bottomChrome + space.md }]}>
          <TextInput
            testID="coach-message-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Share what you're manifesting…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={2000}
          />
          <Pressable
            testID="coach-send-button"
            onPress={() => send(input)}
            disabled={!input.trim() || streaming}
            style={[styles.send, (!input.trim() || streaming) && { opacity: 0.4 }]}
          >
            <Feather name="arrow-up" size={20} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    backgroundColor: c.surface,
  },
  heraAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 13, color: c.muted },
  list: { padding: space.lg, gap: space.md, flexGrow: 1 },
  empty: { alignItems: "center", paddingTop: space.xxxl, paddingHorizontal: space.xl },
  emptyAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface, marginTop: space.lg },
  emptyBody: { fontFamily: fonts.text, fontSize: 15, lineHeight: 23, color: c.muted, textAlign: "center", marginTop: space.sm },
  bubble: { maxWidth: "86%", paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg },
  userBubble: { alignSelf: "flex-end", backgroundColor: c.brandTertiary, borderBottomRightRadius: radius.sm },
  aiBubble: { alignSelf: "flex-start", backgroundColor: c.surfaceSecondary, borderBottomLeftRadius: radius.sm, borderWidth: 1, borderColor: c.border },
  msgText: { fontFamily: fonts.text, fontSize: 15, lineHeight: 23, color: c.onSurfaceSecondary },
  userText: { color: c.onBrandTertiary },
  err: { fontFamily: fonts.text, color: c.error, paddingHorizontal: space.xl, paddingBottom: space.sm },
  chipRow: { flexGrow: 0, height: 56 },
  chips: { paddingHorizontal: space.lg, gap: space.sm, alignItems: "center" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.xs, backgroundColor: c.surface },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: radius.lg,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: space.lg,
    paddingTop: 13,
    paddingBottom: 13,
    fontFamily: fonts.text,
    fontSize: 15,
    color: c.onSurface,
  },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
}));
