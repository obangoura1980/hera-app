import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Favorite, type Stats } from "@/src/api";
import { useAuth } from "@/src/auth";
import { PressableScale, ScreenBg, tap } from "@/src/components/ui";
import { useTabBottomSpace } from "@/src/navigation";
import { makeStyles, radius, setThemeOverride, space, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

export default function Profile() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBottomSpace();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, logout } = useAuth();
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats") });
  const favs = useQuery({ queryKey: ["favorites"], queryFn: () => api<Favorite[]>("/affirmations/favorites") });

  const toggleTheme = async () => {
    tap();
    const next = scheme === "dark" ? "light" : "dark";
    setThemeOverride(next);
    await storage.setItem("hera_theme", next);
  };
  const removeFav = async (id: string) => {
    await api(`/affirmations/favorites/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["favorites"] });
  };

  return (
    <View style={styles.root} testID="profile-screen">
      <ScreenBg />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: space.xl, paddingBottom: bottomSpace }}>
        <Text style={styles.headerTitle}>Settings</Text>

        <LinearGradient colors={[colors.cardGradA, colors.cardGradB]} style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <LinearGradient colors={[colors.gradStart, colors.brandPrimary]} style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name ?? "H").slice(0, 1).toUpperCase()}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.name} testID="profile-name">
            {user?.name}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.streak}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>{stats.data?.streak ?? 0}-day streak</Text>
          </View>
          {user?.is_premium ? (
            <View style={styles.proBadge} testID="profile-premium-badge">
              <Text style={styles.proBadgeText}>HERA PRO</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.statsGrid}>
          {[
            [String(stats.data?.journal_count ?? 0), "Journal Entries"],
            [String(stats.data?.goals_count ?? 0), "Vision Items"],
            [String(favs.data?.length ?? 0), "Saved Affirmations"],
            [String(stats.data?.streak ?? 0), "Day Streak"],
          ].map(([v, l]) => (
            <View key={l} style={styles.stat}>
              <Text style={styles.statNum}>{v}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>ACHIEVEMENTS</Text>
        <View style={styles.achGrid}>
          {[
            ["⭐", "First Steps", (stats.data?.journal_count ?? 0) >= 1],
            ["🔥", "Week Warrior", (stats.data?.streak ?? 0) >= 7],
            ["💜", "Soul Writer", (stats.data?.journal_count ?? 0) >= 10],
            ["🔮", "Vision Keeper", (stats.data?.goals_count ?? 0) >= 1],
            ["✨", "Affirmer", (favs.data?.length ?? 0) >= 5],
            ["🦋", "Transformer", (stats.data?.sessions_done ?? 0) >= 5],
            ["👑", "Manifestor", (stats.data?.goals_achieved ?? 0) >= 1],
            ["🌙", "Dreamer", (stats.data?.sessions_done ?? 0) >= 1],
          ].map(([e, l, on]) => (
            <View key={l as string} style={[styles.ach, !on && styles.achLocked]} testID={`profile-achievement-${(l as string).toLowerCase().replace(" ", "-")}`}>
              <Text style={styles.achEmoji}>{e as string}</Text>
              <Text style={styles.achLabel} numberOfLines={2}>
                {l as string}
              </Text>
            </View>
          ))}
        </View>

        {!user?.is_premium ? (
          <>
            <Text style={styles.section}>YOUR PLAN</Text>
            <View style={styles.planCard} testID="profile-premium-card">
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>Start Your Free Trial ✨</Text>
                <Text style={styles.planBody}>Unlock unlimited AI coaching, visualizations, and more</Text>
                <View style={styles.planPills}>
                  <Text style={styles.planPill}>No payment today</Text>
                  <Text style={styles.planPill}>Cancel anytime</Text>
                </View>
              </View>
              <PressableScale testID="profile-try-free-button" onPress={() => router.push("/premium")} style={styles.tryBtn}>
                <LinearGradient colors={[colors.gradEnd, colors.gradStart]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
                <Text style={styles.tryText}>Try Free</Text>
              </PressableScale>
            </View>
          </>
        ) : null}

        <Text style={styles.section}>SAVED AFFIRMATIONS</Text>
        {(favs.data ?? []).length === 0 ? (
          <Text style={styles.muted}>Tap the bookmark on any affirmation to keep it here.</Text>
        ) : (
          favs.data!.map((f) => (
            <View key={f.id} style={styles.fav} testID={`profile-favorite-${f.id}`}>
              <Text style={styles.favText}>{f.text}</Text>
              <Pressable hitSlop={12} onPress={() => removeFav(f.id)} testID={`profile-favorite-remove-${f.id}`}>
                <Feather name="x" size={16} color={colors.muted} />
              </Pressable>
            </View>
          ))
        )}

        <Text style={styles.section}>APPEARANCE</Text>
        <View style={styles.rows}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Feather name={scheme === "dark" ? "moon" : "sun"} size={18} color={colors.brandSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{scheme === "dark" ? "Dark Mode" : "Light Mode"}</Text>
              <Text style={styles.rowSub}>{scheme === "dark" ? "Ethereal deep space" : "Warm airy feel"}</Text>
            </View>
            <Switch
              testID="profile-theme-toggle"
              value={scheme === "dark"}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.surfaceTertiary, true: colors.brandPrimary }}
              thumbColor={colors.onBrandPrimary}
            />
          </View>
        </View>

        <Text style={styles.section}>ACCOUNT</Text>
        <View style={styles.rows}>
          <Pressable testID="profile-premium-row" style={styles.row} onPress={() => router.push("/premium")}>
            <View style={styles.rowIcon}>
              <Feather name="award" size={18} color={colors.gradEnd} />
            </View>
            <Text style={styles.rowText}>Hera Premium</Text>
            <Text style={[styles.rowValue, { color: colors.gradEnd }]}>{user?.is_premium ? "Active" : "Upgrade"}</Text>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
          <Pressable
            testID="profile-replay-onboarding-button"
            style={[styles.row, styles.rowBorder]}
            onPress={async () => {
              await storage.setItem("hera_onboarded", false);
              router.push("/onboarding");
            }}
          >
            <View style={styles.rowIcon}>
              <Feather name="book" size={18} color={colors.brandSecondary} />
            </View>
            <Text style={styles.rowText}>Replay introduction</Text>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
          <Pressable
            testID="profile-logout-button"
            style={[styles.row, styles.rowBorder]}
            onPress={async () => {
              await logout();
              router.replace("/auth");
            }}
          >
            <View style={styles.rowIcon}>
              <Feather name="log-out" size={18} color={colors.error} />
            </View>
            <Text style={[styles.rowText, { color: colors.error }]}>Log out</Text>
          </Pressable>
        </View>
        <Text style={styles.version}>Hera v1.0.0 • Made with love</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: c.onSurface, textAlign: "center", marginBottom: space.xl },
  profileCard: { alignItems: "center", padding: space.xl, borderRadius: 28, borderWidth: 1, borderColor: c.border },
  avatarRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: c.gradEnd, overflow: "hidden" },
  avatar: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 38, fontWeight: "900", color: c.gold },
  name: { fontSize: 28, fontWeight: "800", color: c.onSurface, marginTop: space.lg },
  email: { fontSize: 14, color: c.muted, marginTop: 2 },
  streak: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: space.xl, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, marginTop: space.lg },
  streakEmoji: { fontSize: 18 },
  streakText: { fontSize: 16, fontWeight: "700", color: c.gold },
  proBadge: { marginTop: space.md, backgroundColor: c.brandTertiary, paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill },
  proBadgeText: { fontWeight: "800", fontSize: 12, letterSpacing: 1, color: c.brandSecondary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.md, marginTop: space.lg },
  stat: { width: "48%", backgroundColor: c.surfaceSecondary, borderRadius: 24, paddingVertical: space.xl, alignItems: "center", borderWidth: 1, borderColor: c.border },
  statNum: { fontSize: 30, fontWeight: "800", color: c.gradEnd },
  statLabel: { fontSize: 14, color: c.onSurfaceTertiary, marginTop: 4, textAlign: "center" },
  achGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.md },
  ach: { width: "23%", aspectRatio: 0.95, borderRadius: radius.lg, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", padding: 4 },
  achLocked: { opacity: 0.35 },
  achEmoji: { fontSize: 26 },
  achLabel: { fontSize: 11, color: c.onSurfaceSecondary, textAlign: "center", marginTop: 4 },
  version: { fontSize: 12, color: c.muted, textAlign: "center", marginTop: space.xl },
  rowSub: { fontSize: 13, color: c.onSurfaceTertiary, marginTop: 2 },
  section: { fontSize: 14, fontWeight: "700", letterSpacing: 2.5, color: c.muted, marginTop: space.xxl, marginBottom: space.md },
  planCard: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.xl, borderRadius: 28, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  planTitle: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  planBody: { fontSize: 14, lineHeight: 20, color: c.onSurfaceTertiary, marginTop: space.xs },
  planPills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
  planPill: { fontSize: 12, color: c.muted, borderWidth: 1, borderColor: c.border, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4 },
  tryBtn: { height: 48, paddingHorizontal: space.xl, borderRadius: radius.pill, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  tryText: { fontSize: 16, fontWeight: "800", color: c.onBrandPrimary },
  muted: { fontSize: 14, color: c.muted },
  fav: { flexDirection: "row", gap: space.md, alignItems: "flex-start", padding: space.lg, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, marginBottom: space.sm, borderWidth: 1, borderColor: c.border },
  favText: { flex: 1, fontSize: 15, lineHeight: 22, fontStyle: "italic", color: c.onSurfaceSecondary },
  rows: { backgroundColor: c.surfaceSecondary, borderRadius: 24, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, minHeight: 60 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontSize: 16, fontWeight: "600", color: c.onSurface },
  rowValue: { fontSize: 14, color: c.brandSecondary, fontWeight: "600" },
}));
