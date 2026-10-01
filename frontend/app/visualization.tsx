import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Session } from "@/src/api";
import { Button, PressableScale, tap } from "@/src/components/ui";
import { fonts, makeStyles, space, useTheme } from "@/src/theme";

export default function Visualization() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ["session", id], queryFn: () => api<Session>(`/sessions/${id}`) });

  const total = (q.data?.minutes ?? 1) * 60;
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scale = useSharedValue(0.7);

  useEffect(() => {
    if (playing) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.7, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
      timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      cancelAnimation(scale);
      if (timer.current) clearInterval(timer.current);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, scale]);

  useEffect(() => {
    if (q.data && elapsed >= total && !done) {
      setPlaying(false);
      setDone(true);
      tap("success");
      api("/sessions/complete", { method: "POST", body: { session_id: id } }).then(() => qc.invalidateQueries({ queryKey: ["stats"] }));
    }
  }, [elapsed, total, done, q.data, id, qc]);

  const circle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const steps = q.data?.steps ?? [];
  const stepIdx = Math.min(steps.length - 1, Math.floor((elapsed / total) * steps.length));
  const remaining = Math.max(0, total - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const breathIn = Math.floor(elapsed / 4) % 2 === 0;

  return (
    <View style={styles.root} testID="visualization-screen">
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1635776062360-af423602aff3?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200" }}
        style={styles.fill}
        contentFit="cover"
      />
      <LinearGradient colors={[colors.scrim, colors.scrimClear, colors.scrim]} style={styles.fill} />
      {!q.data ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.onSurfaceInverse} />
      ) : (
        <View style={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl }]}>
          <View style={styles.top}>
            <PressableScale testID="visualization-close-button" onPress={() => router.back()} style={styles.close}>
              <Feather name="x" size={22} color={colors.onSurfaceInverse} />
            </PressableScale>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{q.data.title}</Text>
              <Text style={styles.sub}>{q.data.subtitle}</Text>
            </View>
          </View>

          <View style={styles.center}>
            <Animated.View style={[styles.circleOuter, circle]}>
              <View style={styles.circleInner} />
            </Animated.View>
            <View style={styles.centerText}>
              <Text style={styles.timer} testID="visualization-timer">
                {done ? "✓" : `${mm}:${ss}`}
              </Text>
              {playing ? <Text style={styles.breath}>{breathIn ? "breathe in" : "breathe out"}</Text> : null}
            </View>
          </View>

          <Animated.Text key={done ? "done" : stepIdx} entering={FadeIn.duration(800)} style={styles.step} testID="visualization-step-text">
            {done ? "Beautiful. Carry this feeling with you today." : elapsed === 0 && !playing ? "Find a comfortable seat. Press play when you're ready." : steps[stepIdx]}
          </Animated.Text>

          {done ? (
            <Button testID="visualization-finish-button" title="Return to my day" onPress={() => router.back()} variant="secondary" />
          ) : (
            <View style={styles.controls}>
              <PressableScale
                testID="visualization-play-button"
                onPress={() => setPlaying((p) => !p)}
                haptic="medium"
                style={styles.play}
              >
                <Feather name={playing ? "pause" : "play"} size={28} color={colors.onBrandTertiary} />
              </PressableScale>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  content: { flex: 1, paddingHorizontal: space.xl },
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" },
  title: { fontFamily: fonts.display, fontSize: 22, color: c.onSurfaceInverse },
  sub: { fontFamily: fonts.text, fontSize: 14, color: c.onSurfaceInverse, opacity: 0.8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  circleOuter: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(220,227,219,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleInner: { width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(220,227,219,0.35)" },
  centerText: { position: "absolute", alignItems: "center" },
  timer: { fontFamily: fonts.display, fontSize: 48, color: c.onSurfaceInverse },
  breath: { fontFamily: fonts.text, fontSize: 14, letterSpacing: 2, color: c.onSurfaceInverse, opacity: 0.85, marginTop: space.xs },
  step: { fontFamily: fonts.display, fontSize: 22, lineHeight: 31, color: c.onSurfaceInverse, textAlign: "center", minHeight: 96, marginBottom: space.xl },
  controls: { alignItems: "center" },
  play: { width: 76, height: 76, borderRadius: 38, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
}));
