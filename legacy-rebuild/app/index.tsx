import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { tap } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

function useTypewriter(text: string, speed: number, delay: number) {
  const [out, setOut] = useState("");
  useEffect(() => {
    let i = 0;
    let iv: ReturnType<typeof setInterval>;
    const t = setTimeout(() => {
      iv = setInterval(() => {
        i += 1;
        setOut(text.slice(0, i));
        if (i >= text.length) clearInterval(iv);
      }, speed);
    }, delay);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, [text, speed, delay]);
  return out;
}

export default function Landing() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState(false);
  const title = useTypewriter("HERA", 140, 1000);

  const pulse = useSharedValue(1);
  const fade = useSharedValue(0);

  useEffect(() => {
    storage.getItem<boolean>("hera_onboarded", false).then((v) => setOnboarded(!!v));
    fade.value = withTiming(1, { duration: 1500 });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.16, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [fade, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const begin = () => {
    if (loading) return;
    tap();
    if (user) router.replace("/(tabs)");
    else router.replace(onboarded ? "/auth" : "/onboarding");
  };

  return (
    <Pressable testID="landing-screen" style={styles.root} onPress={begin} accessibilityLabel="Tap anywhere to begin">
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.auraDeep, colors.auraMid, colors.auraBase]}
        style={[styles.fill, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <Animated.View style={[styles.ring, styles.ringInner, pulseStyle]} />
        <Animated.View style={[styles.ring, styles.ringOuter, pulseStyle]} />
        <Animated.View style={[styles.stack, fadeStyle]}>
          <Image
            testID="landing-logo"
            source={require("../assets/images/hera-logo.png")}
            style={styles.logo}
            contentFit="contain"
            transition={400}
          />
          <Text style={styles.title} testID="landing-title">
            {title || " "}
          </Text>
          <View style={styles.taglineRow}>
            <Feather name="star" size={11} color={colors.auraAccent} />
            <Text style={styles.tagline}>AI Manifestation Companion</Text>
            <Feather name="star" size={11} color={colors.auraAccent} />
          </View>
        </Animated.View>
        <Animated.Text style={[styles.hint, { bottom: insets.bottom + 56 }, fadeStyle]} testID="landing-tap-hint">
          tap anywhere to begin
        </Animated.Text>
      </LinearGradient>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.auraBase },
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", borderWidth: 1 },
  ringInner: { width: 330, height: 330, borderRadius: 165, backgroundColor: c.auraViolet, borderColor: c.auraVioletLine },
  ringOuter: { width: 480, height: 480, borderRadius: 240, backgroundColor: c.auraPink, borderColor: c.auraPinkLine, opacity: 0.55 },
  stack: { alignItems: "center", gap: 24 },
  logo: { width: 110, height: 110 },
  title: {
    fontSize: 52,
    color: c.auraText,
    fontWeight: "900",
    letterSpacing: 16,
    marginRight: -16,
    minHeight: 64,
    textShadowColor: c.auraGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  taglineRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  tagline: { fontSize: 13, color: c.auraAccent, fontWeight: "600", letterSpacing: 0.8 },
  hint: { position: "absolute", fontSize: 13, color: c.auraHint, fontStyle: "italic" },
}));
