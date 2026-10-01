import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Favorite, type Session, type Stats } from "@/src/api";
import { useAuth } from "@/src/auth";
import { ErrorText, PressableScale, tap } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";

const AFF_BG = "https://images.unsplash.com/photo-1619331603973-492406a358b7?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Today() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats") });
  const today = useQuery({ queryKey: ["aff-today"], queryFn: () => api<{ text: string }>("/affirmations/today") });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => api<Session[]>("/sessions") });
  const favs = useQuery({ queryKey: ["favorites"], queryFn: () => api<Favorite[]>("/affirmations/favorites") });

  const text = aiText ?? today.data?.text ?? "";
  const isFav = !!favs.data?.some((f) => f.text === text);

  const affirm = async () => {
    tap("success");
    await api("/affirmations/affirm", { method: "POST" });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };
  const toggleFav = async () => {
    const f = favs.data?.find((x) => x.text === text);
    if (f) await api(`/affirmations/favorites/${f.id}`, { method: "DELETE" });
    else await api("/affirmations/favorites", { method: "POST", body: { text } });
    qc.invalidateQueries({ queryKey: ["favorites"] });
  };
  const generate = async () => {
    setErr(null);
    setAiBusy(true);
    try {
      const r = await api<{ text: string }>("/affirmations/generate", { method: "POST", body: { intention: "" } });
      setAiText(r.text);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const refresh = () => qc.invalidateQueries();

  return (
    <View style={styles.root} testID="today-screen">
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greet}>{greeting()},</Text>
          <Text style={styles.name} testID="today-user-name" numberOfLines={1}>
            {user?.name}
          </Text>
        </View>
        <View style={styles.streak} testID="today-streak-badge">
          <Feather name="sun" size={16} color={colors.warning} />
          <Text style={styles.streakText}>{stats.data?.streak ?? 0} day streak</Text>
        </View>
        <PressableScale testID="today-profile-button" onPress={() => router.push("/profile")} style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name ?? "H").slice(0, 1).toUpperCase()}</Text>
        </PressableScale>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomChrome + space.xl }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.brandPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.affCard} testID="today-affirmation-card">
          <Image source={{ uri: AFF_BG }} style={styles.fill} contentFit="cover" transition={300} />
          <LinearGradient colors={[colors.scrimClear, colors.scrim, colors.surfaceInverse]} locations={[0, 0.6, 1]} style={styles.fill} />
          <View style={styles.affInner}>
            <Text style={styles.affLabel}>{aiText ? "WRITTEN FOR YOU BY HERA" : "TODAY'S AFFIRMATION"}</Text>
            {today.isLoading ? (
              <ActivityIndicator color={colors.onSurfaceInverse} />
            ) : (
              <Animated.Text key={text} entering={FadeIn.duration(500)} style={styles.affText} testID="today-affirmation-text">
                {text}
              </Animated.Text>
            )}
            <View style={styles.affActions}>
              <PressableScale
                testID="today-affirm-button"
                onPress={affirm}
                haptic={null}
                style={[styles.affirmBtn, stats.data?.affirmed_today ? styles.affirmBtnDone : {}]}
              >
                <Feather name={stats.data?.affirmed_today ? "check" : "heart"} size={16} color={colors.onBrandTertiary} />
                <Text style={styles.affirmText}>{stats.data?.affirmed_today ? "Affirmed today" : "I affirm this"}</Text>
              </PressableScale>
              <PressableScale testID="today-favorite-button" onPress={toggleFav} style={styles.roundBtn}>
                <Feather name="bookmark" size={18} color={isFav ? colors.warning : colors.onSurfaceInverse} />
              </PressableScale>
              <PressableScale testID="today-generate-button" onPress={generate} disabled={aiBusy} style={styles.roundBtn}>
                {aiBusy ? (
                  <ActivityIndicator size="small" color={colors.onSurfaceInverse} />
                ) : (
                  <Feather name="feather" size={18} color={colors.onSurfaceInverse} />
                )}
              </PressableScale>
            </View>
          </View>
        </Animated.View>
        <View style={{ paddingHorizontal: space.xl }}>
          <ErrorText msg={err} testID="today-error-text" />
        </View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.statsRow}>
          {[
            { k: "journal_count", label: "Entries", icon: "edit-3" },
            { k: "goals_achieved", label: "Manifested", icon: "star" },
            { k: "sessions_done", label: "Sessions", icon: "wind" },
          ].map((s) => (
            <View key={s.k} style={styles.stat} testID={`today-stat-${s.k}`}>
              <Feather name={s.icon as any} size={16} color={colors.brandPrimary} />
              <Text style={styles.statNum}>{(stats.data as any)?.[s.k] ?? 0}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Text style={styles.section}>Your practice</Text>
        <Animated.View entering={FadeInDown.duration(500).delay(180)} style={styles.actions}>
          {[
            { id: "journal", icon: "edit-3", title: "Write in your journal", body: "Gratitude, intentions, reflections", go: "/journal-new" },
            { id: "vision", icon: "image", title: "Pin a vision", body: "Add a dream to your board", go: "/goal-new" },
            { id: "coach", icon: "message-circle", title: "Talk with Hera", body: "Your AI manifestation coach", go: "/(tabs)/coach" },
          ].map((a) => (
            <PressableScale key={a.id} testID={`today-action-${a.id}`} onPress={() => router.push(a.go as any)} style={styles.actionRow}>
              <View style={styles.actionIcon}>
                <Feather name={a.icon as any} size={20} color={colors.onBrandTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>{a.title}</Text>
                <Text style={styles.actionBody}>{a.body}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.muted} />
            </PressableScale>
          ))}
        </Animated.View>

        <Text style={styles.section}>Guided visualizations</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionRow}>
          {(sessions.data ?? []).map((s) => (
            <PressableScale
              key={s.id}
              testID={`today-session-${s.id}`}
              onPress={() => router.push({ pathname: "/visualization", params: { id: s.id } })}
              style={styles.sessionCard}
            >
              <Image source={{ uri: s.image }} style={styles.fill} contentFit="cover" />
              <LinearGradient colors={[colors.scrimClear, colors.scrim]} style={styles.fill} />
              <View style={styles.sessionInner}>
                <Text style={styles.sessionMeta}>
                  {s.minutes} MIN · {s.category.toUpperCase()}
                </Text>
                <Text style={styles.sessionTitle}>{s.title}</Text>
              </View>
            </PressableScale>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
    gap: space.sm,
    backgroundColor: c.surface,
  },
  greet: { fontFamily: fonts.text, fontSize: 15, color: c.muted },
  name: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  streakText: { fontFamily: fonts.text, fontSize: 13, fontWeight: "700", color: c.onSurfaceSecondary },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.display, fontSize: 18, color: c.onBrandTertiary },
  affCard: {
    marginHorizontal: space.xl,
    marginTop: space.sm,
    height: 400,
    borderRadius: 28,
    borderTopLeftRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: c.surfaceInverse,
  },
  affInner: { flex: 1, justifyContent: "flex-end", padding: space.xl },
  affLabel: { fontFamily: fonts.text, fontSize: 12, fontWeight: "800", letterSpacing: 1.5, color: c.brandTertiary, marginBottom: space.md },
  affText: { fontFamily: fonts.display, fontSize: 26, lineHeight: 34, color: c.onSurfaceInverse },
  affActions: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xl },
  affirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: c.brandTertiary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  affirmBtnDone: { opacity: 0.85 },
  affirmText: { fontFamily: fonts.text, fontSize: 15, fontWeight: "700", color: c.onBrandTertiary },
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(253,251,247,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: space.md, paddingHorizontal: space.xl, marginTop: space.xl },
  stat: {
    flex: 1,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
    borderWidth: 1,
    borderColor: c.border,
  },
  statNum: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface, marginTop: space.xs },
  statLabel: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  section: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface, paddingHorizontal: space.xl, marginTop: space.xxl, marginBottom: space.md },
  actions: {
    marginHorizontal: space.xl,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, minHeight: 64 },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { fontFamily: fonts.text, fontSize: 16, fontWeight: "700", color: c.onSurface },
  actionBody: { fontFamily: fonts.text, fontSize: 13, color: c.muted, marginTop: 2 },
  sessionRow: { paddingHorizontal: space.xl, gap: space.md },
  sessionCard: { width: 200, height: 240, borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  sessionInner: { flex: 1, justifyContent: "flex-end", padding: space.lg },
  sessionMeta: { fontFamily: fonts.text, fontSize: 11, fontWeight: "800", letterSpacing: 1, color: c.brandTertiary },
  sessionTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onSurfaceInverse, marginTop: space.xs },
}));
