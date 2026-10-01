import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, fileSource, type Goal, type JournalEntry } from "@/src/api";
import { EmptyState, PressableScale, tap } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";

const KIND_LABEL = { gratitude: "Gratitude", intention: "Intention", reflection: "Reflection" };

export default function JournalTab() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const router = useRouter();
  const qc = useQueryClient();
  const [seg, setSeg] = useState<"journal" | "vision">("journal");

  const journal = useQuery({ queryKey: ["journal"], queryFn: () => api<JournalEntry[]>("/journal") });
  const goals = useQuery({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });

  const delEntry = async (id: string) => {
    tap("medium");
    await api(`/journal/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["journal"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };
  const toggleGoal = async (g: Goal) => {
    tap(g.achieved ? "light" : "success");
    qc.setQueryData<Goal[]>(["goals"], (old) => old?.map((x) => (x.id === g.id ? { ...x, achieved: !x.achieved } : x)));
    await api(`/goals/${g.id}`, { method: "PATCH", body: { achieved: !g.achieved } });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };
  const delGoal = async (id: string) => {
    tap("medium");
    await api(`/goals/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["goals"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const active = seg === "journal" ? journal : goals;

  return (
    <View style={styles.root} testID="journal-screen">
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <Text style={styles.title}>{seg === "journal" ? "Journal" : "Vision Board"}</Text>
        <View style={styles.seg}>
          {(["journal", "vision"] as const).map((s) => (
            <Pressable
              key={s}
              testID={`journal-segment-${s}`}
              onPress={() => {
                tap();
                setSeg(s);
              }}
              style={[styles.segBtn, seg === s && styles.segBtnOn]}
            >
              <Text style={[styles.segText, seg === s && styles.segTextOn]}>{s === "journal" ? "Journal" : "Vision Board"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {active.isLoading ? (
        <ActivityIndicator style={{ marginTop: space.xxxl }} color={colors.brandPrimary} />
      ) : seg === "journal" ? (
        <FlatList
          key="journal"
          data={journal.data ?? []}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: space.xl, paddingBottom: bottomChrome + 96, gap: space.md }}
          refreshControl={<RefreshControl refreshing={journal.isRefetching} onRefresh={journal.refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <EmptyState testID="journal-empty-state" icon="book-open" title="Your first page awaits" body="Write what you're grateful for, or an intention you're calling in." />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(400).delay(Math.min(index, 6) * 60)} style={styles.entry} testID={`journal-entry-${item.id}`}>
              <View style={styles.entryTop}>
                <View style={[styles.kindTag, item.kind === "intention" && { backgroundColor: c_warnTint(colors) }]}>
                  <Text style={styles.kindText}>{KIND_LABEL[item.kind]}</Text>
                </View>
                <Text style={styles.entryDate}>{format(new Date(item.created_at), "EEE, MMM d")}</Text>
                <View style={{ flex: 1 }} />
                <View style={styles.moodRow}>
                  {[1, 2, 3, 4, 5].map((m) => (
                    <View key={m} style={[styles.moodDot, m <= item.mood && styles.moodDotOn]} />
                  ))}
                </View>
                <Pressable testID={`journal-delete-${item.id}`} hitSlop={12} onPress={() => delEntry(item.id)} style={styles.trash}>
                  <Feather name="trash-2" size={16} color={colors.muted} />
                </Pressable>
              </View>
              {item.title ? <Text style={styles.entryTitle}>{item.title}</Text> : null}
              <Text style={styles.entryBody} numberOfLines={5}>
                {item.content}
              </Text>
            </Animated.View>
          )}
        />
      ) : (
        <FlatList
          key="vision"
          data={goals.data ?? []}
          numColumns={2}
          keyExtractor={(g) => g.id}
          columnWrapperStyle={{ gap: space.lg }}
          contentContainerStyle={{ padding: space.xl, paddingBottom: bottomChrome + 96, gap: space.lg }}
          refreshControl={<RefreshControl refreshing={goals.isRefetching} onRefresh={goals.refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <EmptyState testID="vision-empty-state" icon="image" title="Pin your first vision" body="Add the places, feelings and milestones you're manifesting." />
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.duration(400).delay(Math.min(index, 6) * 60)}
              style={[styles.polaroid, { transform: [{ rotate: index % 2 ? "1.2deg" : "-1.2deg" }] }]}
            >
              <PressableScale testID={`vision-goal-${item.id}`} onPress={() => toggleGoal(item)} haptic={null}>
                <View style={styles.photo}>
                  {item.image_path || item.image_url ? (
                    <Image
                      source={item.image_path ? fileSource(item.image_path) : { uri: item.image_url! }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <Feather name="star" size={28} color={colors.brandSecondary} />
                  )}
                  {item.achieved ? (
                    <View style={styles.achieved} testID={`vision-achieved-${item.id}`}>
                      <Feather name="check" size={14} color={colors.onSuccess} />
                      <Text style={styles.achievedText}>Manifested</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.caption, item.achieved && styles.captionDone]} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.polaroidFoot}>
                  <Text style={styles.cat}>{item.category}</Text>
                  <Pressable testID={`vision-delete-${item.id}`} hitSlop={12} onPress={() => delGoal(item.id)}>
                    <Feather name="x" size={16} color={colors.muted} />
                  </Pressable>
                </View>
              </PressableScale>
            </Animated.View>
          )}
        />
      )}

      <PressableScale
        testID={seg === "journal" ? "journal-add-entry-fab" : "vision-add-goal-fab"}
        onPress={() => router.push(seg === "journal" ? "/journal-new" : "/goal-new")}
        style={[styles.fab, { bottom: bottomChrome + 16 }]}
      >
        <Feather name="plus" size={20} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>{seg === "journal" ? "New entry" : "Add vision"}</Text>
      </PressableScale>
    </View>
  );
}

function c_warnTint(colors: { surfaceTertiary: string }) {
  return colors.surfaceTertiary;
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: space.xl, paddingBottom: space.md, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.divider },
  title: { fontFamily: fonts.display, fontSize: 32, color: c.onSurface, marginBottom: space.md },
  seg: { flexDirection: "row", backgroundColor: c.surfaceTertiary, borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segBtnOn: { backgroundColor: c.surface },
  segText: { fontFamily: fonts.text, fontSize: 14, fontWeight: "700", color: c.muted },
  segTextOn: { color: c.onSurface },
  entry: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderTopRightRadius: radius.sm, padding: space.lg, borderWidth: 1, borderColor: c.border },
  entryTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  kindTag: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: c.brandTertiary },
  kindText: { fontFamily: fonts.text, fontSize: 12, fontWeight: "700", color: c.onBrandTertiary },
  entryDate: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  moodRow: { flexDirection: "row", gap: 3 },
  moodDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border },
  moodDotOn: { backgroundColor: c.error },
  trash: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  entryTitle: { fontFamily: fonts.display, fontSize: 19, color: c.onSurface, marginTop: space.md },
  entryBody: { fontFamily: fonts.text, fontSize: 15, lineHeight: 23, color: c.onSurfaceSecondary, marginTop: space.sm },
  polaroid: { flex: 1, maxWidth: "48%", backgroundColor: c.surface, padding: space.sm, paddingBottom: space.md, borderRadius: radius.sm, borderWidth: 1, borderColor: c.border },
  photo: { aspectRatio: 0.85, backgroundColor: c.surfaceTertiary, borderRadius: 4, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  achieved: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.success,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  achievedText: { fontFamily: fonts.text, fontSize: 11, fontWeight: "800", color: c.onSuccess },
  caption: { fontFamily: fonts.display, fontSize: 16, color: c.onSurface, marginTop: space.sm, minHeight: 40 },
  captionDone: { color: c.muted },
  polaroidFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space.xs },
  cat: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  fab: {
    position: "absolute",
    right: space.xl,
    height: 52,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    backgroundColor: c.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  fabText: { fontFamily: fonts.text, fontSize: 15, fontWeight: "700", color: c.onBrandPrimary },
}));
