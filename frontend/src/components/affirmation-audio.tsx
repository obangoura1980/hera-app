import Feather from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import * as Speech from "expo-speech";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";

import { api } from "@/src/api";
import { PressableScale, tap } from "@/src/components/ui";
import { makeStyles, space, useTheme } from "@/src/theme";

// Spoken affirmation session using on-device text-to-speech (works in Expo Go).
export function AffirmationAudio() {
  const styles = useStyles();
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ["aff-list"], queryFn: () => api<{ items: string[] }>("/affirmations/list") });
  const items = useMemo(() => q.data?.items ?? [], [q.data]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);

  const speak = useCallback(
    (i: number) => {
      if (!items[i]) return;
      Speech.stop();
      Speech.speak(items[i], {
        rate: 0.85,
        pitch: 1.0,
        onDone: () => {
          if (!playingRef.current) return;
          const n = i + 1;
          if (n < items.length) {
            setIdx(n);
            setTimeout(() => playingRef.current && speak(n), 1200);
          } else {
            playingRef.current = false;
            setPlaying(false);
          }
        },
      });
    },
    [items],
  );

  const stop = () => {
    playingRef.current = false;
    setPlaying(false);
    Speech.stop();
  };

  useFocusEffect(useCallback(() => () => stop(), []));

  const toggle = () => {
    tap("medium");
    if (playing) return stop();
    playingRef.current = true;
    setPlaying(true);
    speak(idx);
  };
  const jump = (d: number) => {
    tap();
    const n = Math.min(Math.max(idx + d, 0), Math.max(items.length - 1, 0));
    setIdx(n);
    if (playingRef.current) speak(n);
  };

  return (
    <View style={styles.wrap} testID="discover-affirmation-audio">
      <View style={styles.labelRow}>
        <Feather name="headphones" size={14} color={colors.brandSecondary} />
        <Text style={styles.label}>AFFIRMATION AUDIO</Text>
      </View>
      <LinearGradient colors={[colors.cardGradA, colors.cardGradB]} style={styles.card}>
        <View style={styles.top}>
          <View style={styles.icon}>
            <Feather name="headphones" size={18} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.title}>Manifestation · Listen</Text>
          <Text style={styles.count} testID="discover-audio-count">
            {items.length ? `${idx + 1}/${items.length}` : ""}
          </Text>
        </View>
        <Text style={styles.text} testID="discover-audio-text">
          {playing && items[idx] ? items[idx] : "Tap play to begin your affirmation session"}
        </Text>
        <View style={styles.controls}>
          <PressableScale testID="discover-audio-prev" onPress={() => jump(-1)} haptic={null} style={styles.ctrl}>
            <Feather name="skip-back" size={20} color={colors.brandSecondary} />
          </PressableScale>
          <PressableScale testID="discover-audio-play" onPress={toggle} haptic={null} style={styles.play}>
            <LinearGradient colors={[colors.gradStart, colors.gradEnd]} style={styles.fill} />
            <Feather name={playing ? "pause" : "play"} size={24} color={colors.onBrandPrimary} />
          </PressableScale>
          <PressableScale testID="discover-audio-next" onPress={() => jump(1)} haptic={null} style={styles.ctrl}>
            <Feather name="skip-forward" size={20} color={colors.brandSecondary} />
          </PressableScale>
        </View>
      </LinearGradient>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { marginBottom: space.lg },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 2, color: c.muted },
  card: { borderRadius: 24, padding: space.lg, borderWidth: 1, borderColor: c.border },
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: c.onSurface },
  count: { fontSize: 13, fontWeight: "600", color: c.muted },
  text: { fontSize: 17, lineHeight: 25, fontStyle: "italic", color: c.onSurfaceTertiary, marginTop: space.lg, minHeight: 50 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xl, marginTop: space.md },
  ctrl: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceTertiary },
  play: { width: 60, height: 60, borderRadius: 30, overflow: "hidden", alignItems: "center", justifyContent: "center" },
}));
