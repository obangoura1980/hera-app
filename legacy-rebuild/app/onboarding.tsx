import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui";
import { fonts, makeStyles, space, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1619331603973-492406a358b7?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    title: "Welcome to Hera",
    body: "A gentle space to dream, write and become the person you're quietly growing into.",
  },
  {
    image: "https://images.unsplash.com/photo-1586380951230-e6703d9f6833?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    title: "Affirm. Write. See it.",
    body: "Daily affirmations, a manifestation journal and a vision board you can hold in your hand.",
  },
  {
    image: "https://images.unsplash.com/photo-1635776062360-af423602aff3?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    title: "Meet your coach",
    body: "Talk with Hera, your AI manifestation guide, and drift into short guided visualizations.",
  },
];

export default function Onboarding() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];

  const next = async () => {
    if (i < SLIDES.length - 1) return setI(i + 1);
    await storage.setItem("hera_onboarded", true);
    router.replace("/auth");
  };

  return (
    <View style={styles.root} testID="onboarding-screen">
      <Animated.View key={slide.image} entering={FadeInDown.duration(500)} exiting={FadeOut} style={styles.fill}>
        <Image source={{ uri: slide.image }} style={styles.fill} contentFit="cover" transition={300} />
      </Animated.View>
      <LinearGradient colors={[colors.scrimClear, colors.scrim, colors.surfaceInverse]} locations={[0.2, 0.65, 1]} style={styles.fill} />
      <View style={[styles.content, { paddingBottom: insets.bottom + space.xl }]}>
        <Animated.View key={i} entering={FadeInDown.duration(500).delay(100)}>
          <Text style={styles.brand}>hera</Text>
          <Text style={styles.title} testID="onboarding-title">
            {slide.title}
          </Text>
          <Text style={styles.body}>{slide.body}</Text>
        </Animated.View>
        <View style={styles.dots}>
          {SLIDES.map((_, idx) => (
            <View key={idx} style={[styles.dot, idx === i && styles.dotOn]} />
          ))}
        </View>
        <Button testID="onboarding-next-button" title={i === SLIDES.length - 1 ? "Begin my journey" : "Continue"} onPress={next} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  content: { flex: 1, justifyContent: "flex-end", paddingHorizontal: space.xl },
  brand: { fontFamily: fonts.display, fontWeight: "700", fontSize: 18, color: c.brandTertiary, letterSpacing: 2, marginBottom: space.md },
  title: { fontFamily: fonts.display, fontWeight: "700", fontSize: 40, lineHeight: 46, color: c.onSurfaceInverse },
  body: { fontFamily: fonts.text, fontSize: 17, lineHeight: 26, color: c.onSurfaceInverse, opacity: 0.9, marginTop: space.md },
  dots: { flexDirection: "row", gap: space.sm, marginVertical: space.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.onSurfaceInverse, opacity: 0.35 },
  dotOn: { opacity: 1, width: 24 },
}));
