import Feather from "@react-native-vector-icons/feather";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";

export function ScreenBg() {
  const { colors } = useTheme();
  return <LinearGradient pointerEvents="none" colors={[colors.bgTop, colors.bgBottom]} style={StyleSheet.absoluteFill} />;
}

export function tap(style: "light" | "medium" | "success" = "light") {
  if (Platform.OS === "web") return;
  if (style === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(style === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  children,
  onPress,
  style,
  testID,
  disabled,
  haptic = "light",
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
  disabled?: boolean;
  haptic?: "light" | "medium" | "success" | null;
}) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      testID={testID}
      disabled={disabled}
      onPressIn={() => (s.value = withSpring(0.97, { damping: 18 }))}
      onPressOut={() => (s.value = withSpring(1, { damping: 18 }))}
      onPress={() => {
        if (haptic) tap(haptic);
        onPress?.();
      }}
      style={[anim, style as ViewStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
  testID,
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  icon?: React.ComponentProps<typeof Feather>["name"];
  testID?: string;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = variant === "primary" ? colors.brandPrimary : variant === "secondary" ? colors.brandTertiary : "transparent";
  const fg = variant === "primary" ? colors.onBrandPrimary : colors.onBrandTertiary;
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, { backgroundColor: variant === "primary" ? "transparent" : bg, opacity: disabled ? 0.5 : 1 }, style ?? {}]}
    >
      {variant === "primary" ? (
        <LinearGradient colors={[colors.gradStart, colors.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      ) : null}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Feather name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </PressableScale>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const styles = useStyles();
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  testID,
  tone = "default",
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  testID?: string;
  tone?: "default" | "light";
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PressableScale testID={testID} onPress={onPress} style={[styles.iconBtn, tone === "light" && styles.iconBtnLight]}>
      <Feather name={name} size={20} color={tone === "light" ? colors.onSurfaceInverse : colors.onSurface} />
    </PressableScale>
  );
}

export function EmptyState({ icon, title, body, testID }: { icon: any; title: string; body: string; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View testID={testID} style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={28} color={colors.brandPrimary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function ErrorText({ msg, testID }: { msg: string | null; testID?: string }) {
  const { colors } = useTheme();
  if (!msg) return null;
  return (
    <Text testID={testID} style={{ color: colors.error, fontFamily: fonts.text, fontSize: 14, marginTop: space.sm }}>
      {msg}
    </Text>
  );
}

const useStyles = makeStyles((c) => ({
  btn: {
    minHeight: 52,
    borderRadius: radius.pill,
    overflow: "hidden",
    paddingHorizontal: space.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  btnText: { fontFamily: fonts.text, fontSize: 16, fontWeight: "700" },
  chip: {
    height: 36,
    flexShrink: 0,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: c.brandTertiary, borderColor: c.brandPrimary },
  chipText: { fontFamily: fonts.text, fontSize: 14, fontWeight: "600", color: c.onSurfaceTertiary },
  chipTextOn: { color: c.onBrandTertiary },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  iconBtnLight: { backgroundColor: "rgba(0,0,0,0.25)", borderColor: "transparent" },
  empty: { alignItems: "center", paddingVertical: space.xxxl, paddingHorizontal: space.xl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  emptyTitle: { fontFamily: fonts.display, fontWeight: "700", fontSize: 22, color: c.onSurface, textAlign: "center" },
  emptyBody: {
    fontFamily: fonts.text,
    fontSize: 15,
    color: c.muted,
    textAlign: "center",
    marginTop: space.sm,
    lineHeight: 22,
  },
}));
