import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Favorite, type Stats } from "@/src/api";
import { useAuth } from "@/src/auth";
import { IconButton, PressableScale } from "@/src/components/ui";
import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const GOLD = "https://images.unsplash.com/photo-1733935156769-fe0c2a600d6c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function Profile() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, logout } = useAuth();
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats") });
  const favs = useQuery({ queryKey: ["favorites"], queryFn: () => api<Favorite[]>("/affirmations/favorites") });

  const removeFav = async (id: string) => {
    await api(`/affirmations/favorites/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["favorites"] });
  };

  return (
    <View style={styles.root} testID="profile-screen">
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <IconButton testID="profile-back-button" name="arrow-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xl }}>
        <View style={styles.me}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name ?? "H").slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} testID="profile-name">
              {user?.name}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          {user?.is_premium ? (
            <View style={styles.proBadge} testID="profile-premium-badge">
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          {[
            ["streak", "Day streak"],
            ["journal_count", "Entries"],
            ["goals_count", "Visions"],
            ["sessions_done", "Sessions"],
          ].map(([k, l]) => (
            <View key={k} style={styles.stat}>
              <Text style={styles.statNum}>{(stats.data as any)?.[k] ?? 0}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {!user?.is_premium ? (
          <PressableScale testID="profile-premium-card" onPress={() => router.push("/premium")} style={styles.pro}>
            <Image source={{ uri: GOLD }} style={styles.fill} contentFit="cover" />
            <LinearGradient colors={[colors.scrimClear, colors.scrim]} style={styles.fill} />
            <View style={{ padding: space.xl }}>
              <Text style={styles.proLabel}>HERA PRO</Text>
              <Text style={styles.proTitle}>Unlock unlimited coaching & every visualization</Text>
              <View style={styles.proCta}>
                <Text style={styles.proCtaText}>Try 7 days free</Text>
                <Feather name="arrow-right" size={16} color={colors.onSurface} />
              </View>
            </View>
          </PressableScale>
        ) : null}

        <Text style={styles.section}>Saved affirmations</Text>
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

        <Text style={styles.section}>Settings</Text>
        <View style={styles.rows}>
          <Pressable
            testID="profile-replay-onboarding-button"
            style={styles.row}
            onPress={async () => {
              await storage.setItem("hera_onboarded", false);
              router.push("/onboarding");
            }}
          >
            <View style={styles.rowIcon}>
              <Feather name="book" size={18} color={colors.onBrandTertiary} />
            </View>
            <Text style={styles.rowText}>Replay introduction</Text>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
          <Pressable
            testID="profile-logout-button"
            style={styles.row}
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
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingBottom: space.sm },
  headerTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  me: { flexDirection: "row", alignItems: "center", gap: space.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.display, fontSize: 26, color: c.onBrandTertiary },
  name: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface },
  email: { fontFamily: fonts.text, fontSize: 14, color: c.muted },
  proBadge: { backgroundColor: c.gold, paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill },
  proBadgeText: { fontFamily: fonts.text, fontWeight: "800", fontSize: 12, color: c.onWarning },
  statsRow: { flexDirection: "row", gap: space.sm, marginTop: space.xl },
  stat: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, paddingVertical: space.md, alignItems: "center", borderWidth: 1, borderColor: c.border },
  statNum: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface },
  statLabel: { fontFamily: fonts.text, fontSize: 11, color: c.muted },
  pro: { marginTop: space.xl, borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceInverse },
  proLabel: { fontFamily: fonts.text, fontSize: 12, fontWeight: "800", letterSpacing: 1.5, color: c.onSurfaceInverse },
  proTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 29, color: c.onSurfaceInverse, marginTop: space.sm },
  proCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    alignSelf: "flex-start",
    backgroundColor: c.surface,
    paddingHorizontal: space.lg,
    height: 40,
    borderRadius: radius.pill,
    marginTop: space.lg,
  },
  proCtaText: { fontFamily: fonts.text, fontWeight: "700", fontSize: 14, color: c.onSurface },
  section: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface, marginTop: space.xxl, marginBottom: space.md },
  muted: { fontFamily: fonts.text, fontSize: 14, color: c.muted },
  fav: { flexDirection: "row", gap: space.md, alignItems: "flex-start", padding: space.lg, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, marginBottom: space.sm },
  favText: { flex: 1, fontFamily: fonts.display, fontSize: 16, lineHeight: 23, color: c.onSurfaceSecondary },
  rows: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, minHeight: 56 },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontFamily: fonts.text, fontSize: 16, fontWeight: "600", color: c.onSurface },
}));
