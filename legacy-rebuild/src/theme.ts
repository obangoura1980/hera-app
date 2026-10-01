// Design tokens for this app. Light theme only.Always modify the colors and theme to Dark, Light or Dark and Light according to the design guidelines.
//
// The keys match the "color" block of /app/design_guidelines.json. Fill the
// values from that file (or from the user's brand colors). Keep every key; do
// not add a second theme or colors file; do not write color literals in
// components.
//
// How the names work: a plain key is a background, and its `on` partner is the
// text or icon color that sits on top of it. Always use them as a pair.
//   <View style={{ backgroundColor: colors.brandPrimary }}>
//     <Text style={{ color: colors.onBrandPrimary }}>Continue</Text>
//   </View>
//
// Styling a screen or component: build the sheet with makeStyles so colors
// and layout live together and follow the active scheme:
//   const useStyles = makeStyles((colors) => ({
//     card: { backgroundColor: colors.surfaceSecondary, padding: 16 },
//     title: { color: colors.onSurfaceSecondary, fontSize: 16 },
//   }));
//   function Screen() {
//     const styles = useStyles();
//     return <View style={styles.card}><Text style={styles.title}>Hi</Text></View>;
//   }
// For color props that are not styles (icon color, placeholderTextColor,
// ActivityIndicator) read useTheme().colors inside the component.
// Never call StyleSheet.create with color values at module level; it cannot
// follow the scheme.
//
// To support dark mode later: add `dark` to `themes` with every key filled.
// Nothing else changes; the device setting takes over automatically.
// Feel free to add as many new colors as you need to support the design guidelines.

import { useMemo, useSyncExternalStore } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // ---------------------------------------------------------------------------
  // Surfaces: backgrounds, from the screen down to small fills.
  // Each `on` key is the text and icon color for that background.
  // ---------------------------------------------------------------------------
  // Light = "Blush Rose" from the original Hera brand
  surface: "#FDE8EA", // primary canvas, most of every screen
  onSurface: "#1A0A14", // text and icons on the canvas
  surfaceSecondary: "#FFFFFF", // cards, sheets, list rows
  onSurfaceSecondary: "#1A0A14", // text and icons on cards, sheets, rows
  surfaceTertiary: "#FEF0F2", // input backgrounds, chips, deepest nesting
  onSurfaceTertiary: "#6B4050", // text on inputs and chips; also muted text
  surfaceInverse: "#1A0A14", // dark fill behind imagery
  onSurfaceInverse: "#FFFFFF", // text and icons over imagery / inverse
  muted: "#8C6A76", // subdued text on surface: captions, timestamps, placeholders
  scrim: "rgba(10,10,20,0.85)", // image scrim end stop
  scrimClear: "rgba(10,10,20,0)", // image scrim start stop
  gold: "#C4707A", // accent
  bgTop: "#FDE8EA", // screen background gradient
  bgBottom: "#F5C2C7",
  gradStart: "#A855F7", // signature CTA gradient
  gradEnd: "#EC4899",
  action: "#2D1520", // dark round action buttons (send)
  onAction: "#FFFFFF",
  orbHalo: "#F3CDBE", // circle behind Hera orb
  accentText: "#C4707A", // highlighted words ("manifest?")
  cardGradA: "#FFFFFF",
  cardGradB: "#FEF0F2",
  visionGradA: "#FFFFFF",
  visionGradB: "#FCE1E5",
  tabBar: "rgba(255,255,255,0.85)",
  tabActive: "#2D1520",
  tabInactive: "#B0909A",
  // Hera aura splash (original brand landing)
  auraDeep: "#020408",
  auraMid: "#060B1E",
  auraBase: "#080A18",
  auraViolet: "rgba(168,85,247,0.12)",
  auraVioletLine: "rgba(168,85,247,0.3)",
  auraPink: "rgba(236,72,153,0.06)",
  auraPinkLine: "rgba(236,72,153,0.1)",
  auraGlow: "rgba(124,58,237,0.95)",
  auraAccent: "#F472B6",
  auraHint: "rgba(255,255,255,0.26)",
  auraText: "#FFFFFF",

  // ---------------------------------------------------------------------------
  // Brand: the identity color and the fills built from it.
  // Neutral by default; replace with the design guidelines values.
  // ---------------------------------------------------------------------------
  brand: "#C4707A", // dusty rose
  onBrand: "#FFFFFF", // text and icons placed directly on brand
  brandPrimary: "#C4707A", // primary CTA, active tab indicator, selected states
  onBrandPrimary: "#FFFFFF", // text and icons on brandPrimary
  brandSecondary: "#D4939A", // secondary CTA, less prominent accents
  onBrandSecondary: "#FFFFFF", // text and icons on brandSecondary
  brandTertiary: "#F9D5D9", // chips, tags, badges, subtle brand moments
  onBrandTertiary: "#A85560", // text and icons on brandTertiary

  // ---------------------------------------------------------------------------
  // Status: semantic only, never decorative. Fill for badges, banners and
  // toasts; the `on` key is text on that fill. The plain key is also safe as
  // text on `surface`.
  // ---------------------------------------------------------------------------
  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#6B4050",
  onInfo: "#FFFFFF",

  // ---------------------------------------------------------------------------
  // Lines
  // ---------------------------------------------------------------------------
  border: "rgba(0,0,0,0.08)", // hairline outline, 0.5pt or 1pt max: inputs, cards
  borderStrong: "rgba(196,112,122,0.45)", // focus rings, selected outlines, 1.5pt max
  divider: "rgba(0,0,0,0.06)", // subtle list separators
};

// Dark = "Ethereal Aura" from the original Hera brand
const dark: typeof light = {
  ...light,
  surface: "#080A18",
  onSurface: "#FFFFFF",
  surfaceSecondary: "#141530",
  onSurfaceSecondary: "#FFFFFF",
  surfaceTertiary: "#1B1C3D",
  onSurfaceTertiary: "#C084FC",
  surfaceInverse: "#04050D",
  onSurfaceInverse: "#FFFFFF",
  muted: "rgba(192,132,252,0.6)",
  gold: "#F472B6",
  bgTop: "#080A18",
  bgBottom: "#131838",
  action: "#1E0A3C",
  onAction: "#FFFFFF",
  orbHalo: "#2B1356",
  accentText: "#C084FC",
  cardGradA: "rgba(124,58,237,0.45)",
  cardGradB: "rgba(20,21,48,0.95)",
  visionGradA: "rgba(236,72,153,0.32)",
  visionGradB: "rgba(20,21,48,0.95)",
  tabBar: "rgba(30,27,46,0.92)",
  tabActive: "#C084FC",
  tabInactive: "rgba(192,132,252,0.42)",
  brand: "#A855F7",
  brandPrimary: "#A855F7",
  brandSecondary: "#C084FC",
  brandTertiary: "rgba(168,85,247,0.18)",
  onBrandTertiary: "#C084FC",
  success: "#34D399",
  warning: "#FBBF24",
  error: "#F87171",
  info: "#C084FC",
  border: "rgba(168,85,247,0.25)",
  borderStrong: "rgba(168,85,247,0.6)",
  divider: "rgba(168,85,247,0.15)",
};

// Original Hera uses the platform system font
export const fonts: { display: string | undefined; text: string | undefined } = { display: undefined, text: undefined };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 };

export type ThemeColors = typeof light;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

// In-app theme toggle, only after `dark` exists in `themes`. Call
// setColorScheme("dark"), setColorScheme("light"), or setColorScheme(null) to
// follow the device. Every useTheme() consumer re-renders. Persisting the
// choice and re-applying it on launch is the toggle's job.
export function setColorScheme(scheme: ColorScheme | null) {
  // RN 0.86 re-reads the device scheme only for the literal "unspecified";
  // null would pin useColorScheme() to null and the app to light.
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

// Keep native surfaces (alerts, pickers, navigation chrome) on the schemes this
// app ships: light only forces light; once `dark` exists the device decides.
// Optional call because react-native-web does not implement it.
setColorScheme?.(themes.dark ? null : defaultScheme);

// In-app override so the toggle also works where Appearance.setColorScheme
// is a no-op (react-native-web).
let override: ColorScheme | null = null;
const listeners = new Set<() => void>();
export function setThemeOverride(scheme: ColorScheme | null) {
  override = scheme;
  setColorScheme(scheme);
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const forced = useSyncExternalStore(subscribe, () => override, () => override);
  const pick = forced ?? system;
  const scheme: ColorScheme = pick && themes[pick] ? pick : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Themed StyleSheet: returns a hook that builds the sheet from the active
// scheme's colors and memoizes it until the scheme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}


