import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const usesNativeTabs = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

export const TAB_BAR_HEIGHT = 64;

// Bottom offset of the floating capsule tab bar (JS tabs only).
export function tabBarBottom(insetBottom: number) {
  return Math.max(insetBottom, 10) + 14;
}

// Space a tab screen must leave at the bottom so content clears the floating bar.
export function useTabBottomSpace() {
  const insets = useSafeAreaInsets();
  return usesNativeTabs ? insets.bottom + 16 : tabBarBottom(insets.bottom) + TAB_BAR_HEIGHT + 16;
}
