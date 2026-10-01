import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, fileSource, type Favorite, type Goal, type Session, type Stats } from "@/src/api";
import { useAuth } from "@/src/auth";
import { ErrorText, PressableScale, ScreenBg, tap } from "@/src/components/ui";
import { useTabBottomSpace } from "@/src/navigation";
import { makeStyles, radius, space, useTheme } from "@/src/theme";

const TRENDING = ["him obsessed with me", "$10k weeks", "Europe trip", "dream job", "glowing skin", "my soulmate"];

export default function Home() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBottomSpace();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [desire, setDesire] = useState("");
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats") });
  const today = useQuery({ queryKey: ["aff-today"], queryFn: () => api<{ text: string }>("/affirmations/today") });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => api<Session[]>("/sessions") });
  const favs = useQuery({ queryKey: ["favorites"], queryFn: () => api<Favorite[]>("/affirmations/favorites") });
  const goals = useQuery({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 2400, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) })),
      -1,
    );
  }, [pulse]);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const text = aiText ?? today.data?.text ?? "";
  const isFav = !!favs.data?.some((f) => f.text === text);
  const name = (user?.name ?? "").split(" ")[0];

  const askHera = (q: string) => {
    const t = q.trim();
    if (!t) return;
    tap();
    setDesire("");
    router.push({ pathname: "/coach", params: { q: `I want to manifest: ${t}` } });
  };
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
      setAiText((await api<{ text: string }>("/affirmations/generate", { method: "POST", body: { intention: "" } })).text);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const pinned = goals.data ?? [];

  return (
    <View style={styles.root} testID="today-screen">
      <ScreenBg />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: bottomSpace }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => qc.invalidateQueries()} tintColor={colors.brandPrimary} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>HERA</Text>
          <View style={{ flexDirection: "row", gap: space.md }}>
            <PressableScale testID="today-profile-button" onPress={() => router.push("/(tabs)/profile")} style={styles.headBtn}>
              <Feather name="heart" size={20} color={colors.brandSecondary} />
            </PressableScale>
            <PressableScale testID="home-history-button" onPress={() => router.push("/(tabs)/journal")} style={styles.headBtn}>
              <Feather name="clock" size={20} color={colors.brandSecondary} />
            </PressableScale>
          </View>
        </View>

        <Animated.View entering={FadeIn.duration(700)} style={styles.halo}>
          <Animated.View style={orbStyle}>
            <Image
              testID="home-hera-orb"
              source={scheme === "dark" ? require("../../assets/images/hera-orb.png") : require("../../assets/images/hera-orb-light.png")}
              style={styles.orb}
              contentFit="contain"
            />
          </Animated.View>
        </Animated.View>

        <Text style={styles.ask} testID="today-user-name">
          {name ? `${name}, ` : ""}what do you{"\n"}want to <Text style={styles.askAccent}>manifest?</Text>
        </Text>

        <View style={styles.inputPill}>
          <TextInput
            testID="home-desire-input"
            style={styles.input}
            value={desire}
            onChangeText={setDesire}
            placeholder="him obsessed with me..."
            placeholderTextColor={colors.muted}
            onSubmitEditing={() => askHera(desire)}
            returnKeyType="send"
          />
          <PressableScale testID="home-desire-send" onPress={() => askHera(desire)} style={styles.send}>
            <Feather name="arrow-up" size={22} color={colors.onAction} />
          </PressableScale>
        </View>

        <View style={styles.trendLabel}>
          <Text style={styles.emoji}>🔥</Text>
          <Text style={styles.trendText}>TRENDING MANIFESTATIONS</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendRow} keyboardShouldPersistTaps="handled">
          {TRENDING.map((t, i) => (
            <PressableScale key={t} testID={`home-trending-chip-${i}`} onPress={() => askHera(t)} style={styles.trendChip}>
              <Text style={styles.trendChipText}>{t}</Text>
            </PressableScale>
          ))}
        </ScrollView>

        <View style={styles.forYouRow}>
          <Text style={styles.forYou}>For you</Text>
          <PressableScale testID="home-add-desire-button" onPress={() => router.push("/goal-new")} style={styles.editBtn}>
            <Feather name="edit-2" size={15} color={colors.brandSecondary} />
            <Text style={styles.editText}>Edit desires</Text>
          </PressableScale>
        </View>

        <Animated.View entering={FadeInDown.duration(500)} style={styles.cardWrap} testID="today-affirmation-card">
          <LinearGradient colors={[colors.cardGradA, colors.cardGradB]} style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Text style={styles.emoji}>✨</Text>
              <Text style={styles.cardLabel}>{aiText ? "Written for you by Hera" : "Daily Affirmation"}</Text>
              <View style={{ flex: 1 }} />
              <View style={styles.streak} testID="today-streak-badge">
                <Feather name="zap" size={13} color={colors.gold} />
                <Text style={styles.streakText}>{stats.data?.streak ?? 0}-day streak</Text>
              </View>
            </View>
            {today.isLoading ? (
              <ActivityIndicator color={colors.brandPrimary} />
            ) : (
              <Animated.Text key={text} entering={FadeIn.duration(500)} style={styles.affText} testID="today-affirmation-text">
                {text}
              </Animated.Text>
            )}
            <View style={styles.affActions}>
              <PressableScale testID="today-affirm-button" onPress={affirm} haptic={null} style={styles.affirmBtn}>
                <LinearGradient colors={[colors.gradStart, colors.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fill} />
                <Feather name={stats.data?.affirmed_today ? "check" : "heart"} size={16} color={colors.onBrandPrimary} />
                <Text style={styles.affirmText}>{stats.data?.affirmed_today ? "Affirmed today" : "I affirm this"}</Text>
              </PressableScale>
              <PressableScale testID="today-favorite-button" onPress={toggleFav} style={styles.roundBtn}>
                <Feather name="bookmark" size={18} color={isFav ? colors.gold : colors.brandSecondary} />
              </PressableScale>
              <PressableScale testID="today-generate-button" onPress={generate} disabled={aiBusy} style={styles.roundBtn}>
                {aiBusy ? <ActivityIndicator size="small" color={colors.brandSecondary} /> : <Feather name="refresh-cw" size={18} color={colors.brandSecondary} />}
              </PressableScale>
            </View>
            <PressableScale testID="home-explore-more" onPress={() => router.push("/(tabs)/discover")} style={styles.explore}>
              <Text style={styles.exploreText}>Explore More</Text>
              <Feather name="arrow-right" size={15} color={colors.brandSecondary} />
            </PressableScale>
            <ErrorText msg={err} testID="today-error-text" />
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.cardWrap}>
          <PressableScale testID="home-vision-card" onPress={() => router.push("/vision")}>
            <LinearGradient colors={[colors.visionGradA, colors.visionGradB]} style={styles.card}>
              <View style={styles.cardLabelRow}>
                <Text style={styles.emoji}>🔮</Text>
                <Text style={styles.cardLabel}>Vision Board</Text>
              </View>
              <Text style={styles.visionTitle}>
                {pinned.length
                  ? `"${pinned[0].title}" — ${Math.round(((stats.data?.goals_achieved ?? 0) / pinned.length) * 100)}% manifested`
                  : "Pin your first dream"}
              </Text>
              <View style={styles.thumbs}>
                {pinned.slice(0, 3).map((g) => (
                  <View key={g.id} style={styles.thumb}>
                    {g.image_path || g.image_url ? (
                      <Image source={g.image_path ? fileSource(g.image_path) : { uri: g.image_url! }} style={styles.fill} contentFit="cover" />
                    ) : null}
                  </View>
                ))}
              </View>
              <View style={styles.explore}>
                <Text style={styles.exploreText}>View Board</Text>
                <Feather name="arrow-right" size={15} color={colors.brandSecondary} />
              </View>
            </LinearGradient>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(150)} style={styles.cardWrap}>
          <PressableScale testID="home-chat-card" onPress={() => router.push("/coach")}>
            <LinearGradient colors={[colors.cardGradA, colors.cardGradB]} style={styles.card}>
              <View style={styles.cardLabelRow}>
                <Text style={styles.emoji}>💜</Text>
                <Text style={styles.cardLabel}>Chat with Hera</Text>
              </View>
              <Text style={styles.visionTitle}>Your AI coach is ready. Share what you want to manifest today.</Text>
              <View style={styles.explore}>
                <Text style={styles.exploreText}>Start Chat</Text>
                <Feather name="arrow-right" size={15} color={colors.brandSecondary} />
              </View>
            </LinearGradient>
          </PressableScale>
        </Animated.View>

        <View style={styles.statsRow}>
          {[
            { k: "journal_count", label: "Entries" },
            { k: "goals_achieved", label: "Manifested" },
            { k: "sessions_done", label: "Sessions" },
          ].map((s) => (
            <View key={s.k} style={styles.stat} testID={`today-stat-${s.k}`}>
              <Text style={styles.statNum}>{(stats.data as any)?.[s.k] ?? 0}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

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
  emoji: { fontSize: 15 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.xl },
  logo: { fontSize: 26, fontWeight: "900", letterSpacing: 6, color: c.onSurface },
  headBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  halo: { alignSelf: "center", width: 220, height: 220, borderRadius: 110, backgroundColor: c.orbHalo, alignItems: "center", justifyContent: "center", marginTop: space.xl },
  orb: { width: 120, height: 120 },
  ask: { fontSize: 30, lineHeight: 40, fontWeight: "800", color: c.onSurface, textAlign: "center", marginTop: space.xl, paddingHorizontal: space.xl },
  askAccent: { fontStyle: "italic", color: c.accentText },
  inputPill: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: space.xl,
    marginTop: space.xl,
    height: 64,
    borderRadius: 32,
    paddingLeft: space.xl,
    paddingRight: 6,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  input: { flex: 1, fontSize: 16, color: c.onSurface, height: 60 },
  send: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.action, borderWidth: 1.5, borderColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  trendLabel: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, marginTop: space.xl },
  trendText: { fontSize: 12, fontWeight: "700", letterSpacing: 2.5, color: c.muted },
  trendRow: { paddingHorizontal: space.xl, gap: space.sm, paddingTop: space.md, height: 56 },
  trendChip: { height: 44, paddingHorizontal: space.xl, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, justifyContent: "center", flexShrink: 0 },
  trendChipText: { fontSize: 15, color: c.onSurfaceTertiary, fontWeight: "500" },
  forYouRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.xl, marginTop: space.xxl, marginBottom: space.lg },
  forYou: { fontSize: 30, fontWeight: "800", color: c.onSurface },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  editText: { fontSize: 14, fontWeight: "600", color: c.brandSecondary },
  cardWrap: { marginHorizontal: space.xl, marginBottom: space.lg, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: c.border },
  card: { padding: space.xl },
  cardLabelRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.md },
  cardLabel: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5, color: c.brandSecondary },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.sm, height: 26, borderRadius: radius.pill, backgroundColor: c.brandTertiary },
  streakText: { fontSize: 12, fontWeight: "700", color: c.gold },
  affText: { fontSize: 21, lineHeight: 30, fontWeight: "600", color: c.onSurface },
  affActions: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xl },
  affirmBtn: { flex: 1, height: 48, borderRadius: radius.pill, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
  affirmText: { fontSize: 15, fontWeight: "700", color: c.onBrandPrimary },
  roundBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
  visionTitle: { fontSize: 19, fontWeight: "700", color: c.onSurface },
  thumbs: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  thumb: { width: 64, height: 80, borderRadius: radius.md, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  explore: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.lg },
  exploreText: { fontSize: 14, fontWeight: "600", color: c.brandSecondary },
  statsRow: { flexDirection: "row", gap: space.md, paddingHorizontal: space.xl, marginTop: space.sm },
  stat: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: 18, padding: space.md, alignItems: "center", borderWidth: 1, borderColor: c.border },
  statNum: { fontSize: 24, fontWeight: "800", color: c.onSurface },
  statLabel: { fontSize: 12, color: c.muted, marginTop: 2 },
  section: { fontSize: 22, fontWeight: "800", color: c.onSurface, paddingHorizontal: space.xl, marginTop: space.xxl, marginBottom: space.md },
  sessionRow: { paddingHorizontal: space.xl, gap: space.md },
  sessionCard: { width: 200, height: 240, borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  sessionInner: { flex: 1, justifyContent: "flex-end", padding: space.lg },
  sessionMeta: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: c.onSurfaceInverse, opacity: 0.8 },
  sessionTitle: { fontSize: 20, fontWeight: "700", color: c.onSurfaceInverse, marginTop: space.xs },
}));
