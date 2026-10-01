import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type JournalEntry, type Stats } from "@/src/api";
import { Chip, EmptyState, PressableScale, ScreenBg, tap } from "@/src/components/ui";
import { useTabBottomSpace } from "@/src/navigation";
import { makeStyles, radius, space, useTheme } from "@/src/theme";

const KIND_LABEL = { gratitude: "Gratitude", intention: "Intention", reflection: "Reflection" };
export const MOOD_EMOJI = ["😔", "😕", "🙂", "😊", "😁"];
const FILTERS = [
  { k: "all", label: "📋  All" },
  { k: "gratitude", label: "🙏  Gratitude" },
  { k: "intention", label: "✨  Intention" },
  { k: "reflection", label: "🌀  Reflect" },
] as const;

export default function JournalTab() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBottomSpace();
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["k"]>("all");

  const journal = useQuery({ queryKey: ["journal"], queryFn: () => api<JournalEntry[]>("/journal") });
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats") });
  const entries = useMemo(() => journal.data ?? [], [journal.data]);
  const shown = filter === "all" ? entries : entries.filter((e) => e.kind === filter);
  const avgMood = useMemo(
    () => (entries.length ? Math.round(entries.reduce((s, e) => s + e.mood, 0) / entries.length) : 0),
    [entries],
  );

  const delEntry = async (id: string) => {
    tap("medium");
    await api(`/journal/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["journal"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const tagStyle = (k: JournalEntry["kind"]) =>
    k === "gratitude"
      ? { bg: colors.brandTertiary, fg: colors.success }
      : k === "intention"
        ? { bg: colors.brandTertiary, fg: colors.gold }
        : { bg: colors.brandTertiary, fg: colors.brandSecondary };

  return (
    <View style={styles.root} testID="journal-screen">
      <ScreenBg />
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Journal</Text>
          <Text style={styles.sub}>Your sacred space for reflection</Text>
        </View>
        <PressableScale testID="journal-add-entry-fab" onPress={() => router.push("/journal-new")} style={styles.fab}>
          <LinearGradient colors={[colors.gradStart, colors.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
          <Feather name="plus" size={26} color={colors.onBrandPrimary} />
        </PressableScale>
      </View>

      <View style={styles.statsCard} testID="journal-stats-card">
        {[
          { v: String(entries.length), l: "Entries" },
          { v: avgMood ? MOOD_EMOJI[avgMood - 1] : "–", l: "Avg Mood" },
          { v: String(entries.filter((e) => e.kind === "gratitude").length), l: "Gratitude" },
          { v: String(stats.data?.goals_achieved ?? 0), l: "Wins" },
        ].map((s, i) => (
          <View key={s.l} style={[styles.statCell, i > 0 && styles.statDivider]}>
            <Text style={styles.statNum}>{s.v}</Text>
            <Text style={styles.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      <View style={styles.chipRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Chip key={f.k} testID={`journal-filter-${f.k}`} label={f.label} selected={filter === f.k} onPress={() => setFilter(f.k)} />
          ))}
        </ScrollView>
      </View>

      {journal.isLoading ? (
        <ActivityIndicator style={{ marginTop: space.xxxl }} color={colors.brandPrimary} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: bottomSpace, gap: space.md }}
          refreshControl={<RefreshControl refreshing={journal.isRefetching} onRefresh={journal.refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <EmptyState testID="journal-empty-state" icon="book-open" title="Your first page awaits" body="Write what you're grateful for, or an intention you're calling in." />
          }
          renderItem={({ item, index }) => {
            const t = tagStyle(item.kind);
            return (
              <Animated.View entering={FadeInDown.duration(400).delay(Math.min(index, 6) * 60)} style={styles.entry} testID={`journal-entry-${item.id}`}>
                <View style={styles.entryTop}>
                  <View style={[styles.tag, { backgroundColor: t.bg }]}>
                    <Text style={[styles.tagText, { color: t.fg }]}>{KIND_LABEL[item.kind]}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.mood}>{MOOD_EMOJI[item.mood - 1]}</Text>
                  <Pressable testID={`journal-delete-${item.id}`} hitSlop={12} onPress={() => delEntry(item.id)} style={styles.trash}>
                    <Feather name="trash-2" size={18} color={colors.muted} />
                  </Pressable>
                </View>
                <Text style={styles.entryTitle}>{item.title || KIND_LABEL[item.kind]}</Text>
                <Text style={styles.entryBody} numberOfLines={2}>
                  {item.content}
                </Text>
                <View style={styles.entryFoot}>
                  <Text style={styles.entryDate}>{format(new Date(item.created_at), "MMM d, yyyy")}</Text>
                  <Feather name="chevron-right" size={18} color={colors.muted} />
                </View>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.xl, paddingBottom: space.lg },
  title: { fontSize: 34, fontWeight: "800", color: c.onSurface },
  sub: { fontSize: 15, color: c.onSurfaceTertiary, marginTop: 2 },
  fab: { width: 56, height: 56, borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  statsCard: {
    flexDirection: "row",
    marginHorizontal: space.xl,
    paddingVertical: space.lg,
    borderRadius: 24,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  statCell: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: c.divider },
  statNum: { fontSize: 24, fontWeight: "800", color: c.onSurface },
  statLabel: { fontSize: 13, color: c.onSurfaceTertiary },
  chipRow: { height: 56, justifyContent: "center", marginTop: space.sm },
  chips: { paddingHorizontal: space.xl, gap: space.sm, alignItems: "center" },
  entry: { backgroundColor: c.surfaceSecondary, borderRadius: 24, padding: space.lg, borderWidth: 1, borderColor: c.border },
  entryTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  tag: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill },
  tagText: { fontSize: 13, fontWeight: "700" },
  mood: { fontSize: 22 },
  trash: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  entryTitle: { fontSize: 19, fontWeight: "700", color: c.onSurface, marginTop: space.md },
  entryBody: { fontSize: 15, lineHeight: 22, color: c.onSurfaceTertiary, marginTop: space.sm },
  entryFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.md },
  entryDate: { fontSize: 13, color: c.muted },
}));
