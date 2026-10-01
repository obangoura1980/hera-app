import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, fileSource, type Goal } from "@/src/api";
import { EmptyState, IconButton, PressableScale, ScreenBg, tap } from "@/src/components/ui";
import { makeStyles, radius, space, useTheme } from "@/src/theme";

export default function VisionBoard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const goals = useQuery({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });

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

  return (
    <View style={styles.root} testID="vision-screen">
      <ScreenBg />
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <IconButton testID="vision-back-button" name="arrow-left" onPress={() => router.back()} />
        <Text style={styles.title}>Vision Board</Text>
        <View style={{ width: 44 }} />
      </View>
      {goals.isLoading ? (
        <ActivityIndicator style={{ marginTop: space.xxxl }} color={colors.brandPrimary} />
      ) : (
        <FlatList
          data={goals.data ?? []}
          numColumns={2}
          keyExtractor={(g) => g.id}
          columnWrapperStyle={{ gap: space.lg }}
          contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + 96, gap: space.lg }}
          refreshControl={<RefreshControl refreshing={goals.isRefetching} onRefresh={goals.refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={<EmptyState testID="vision-empty-state" icon="image" title="Pin your first vision" body="Add the places, feelings and milestones you're manifesting." />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(400).delay(Math.min(index, 6) * 60)} style={styles.card}>
              <PressableScale testID={`vision-goal-${item.id}`} onPress={() => toggleGoal(item)} haptic={null}>
                <View style={styles.photo}>
                  {item.image_path || item.image_url ? (
                    <Image source={item.image_path ? fileSource(item.image_path) : { uri: item.image_url! }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
                  ) : (
                    <Feather name="star" size={28} color={colors.brandSecondary} />
                  )}
                  {item.achieved ? (
                    <View style={styles.achieved} testID={`vision-achieved-${item.id}`}>
                      <Feather name="check" size={14} color={colors.onBrandPrimary} />
                      <Text style={styles.achievedText}>Manifested</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.caption, item.achieved && { color: colors.muted }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.foot}>
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
      <PressableScale testID="vision-add-goal-fab" onPress={() => router.push("/goal-new")} style={[styles.fab, { bottom: insets.bottom + 16 }]}>
        <Feather name="plus" size={20} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>Add vision</Text>
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingBottom: space.sm },
  title: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  card: { flex: 1, maxWidth: "48%", backgroundColor: c.surfaceSecondary, padding: space.sm, paddingBottom: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border },
  photo: { aspectRatio: 0.85, backgroundColor: c.surfaceTertiary, borderRadius: radius.md, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  achieved: { position: "absolute", top: space.sm, left: space.sm, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.brandPrimary, paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill },
  achievedText: { fontSize: 11, fontWeight: "800", color: c.onBrandPrimary },
  caption: { fontSize: 15, fontWeight: "700", color: c.onSurface, marginTop: space.sm, minHeight: 40 },
  foot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space.xs },
  cat: { fontSize: 12, color: c.muted },
  fab: { position: "absolute", right: space.xl, height: 52, paddingHorizontal: space.xl, borderRadius: radius.pill, backgroundColor: c.brandPrimary, flexDirection: "row", alignItems: "center", gap: space.sm },
  fabText: { fontSize: 15, fontWeight: "700", color: c.onBrandPrimary },
}));
