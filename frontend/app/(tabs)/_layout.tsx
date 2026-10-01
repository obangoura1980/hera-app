import Feather from "@react-native-vector-icons/feather";
import { Redirect, Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { useAuth } from "@/src/auth";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/auth" />;

  if (usesNativeTabs) {
    return (
      <NativeTabs tintColor={colors.brandPrimary}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="sun.max.fill" />
          <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="journal">
          <NativeTabs.Trigger.Icon sf="book.fill" />
          <NativeTabs.Trigger.Label>Journal</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="coach">
          <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" />
          <NativeTabs.Trigger.Label>Hera</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="discover">
          <NativeTabs.Trigger.Icon sf="sparkles" />
          <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  const icon = (name: React.ComponentProps<typeof Feather>["name"]) =>
    function TabIcon({ color }: { color: string }) {
      return <Feather name={name} size={22} color={color} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.borderStrong,
        tabBarHideOnKeyboard: Platform.OS === "android",
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: fonts.text, fontSize: 12, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: icon("sun"), tabBarButtonTestID: "tab-today" }} />
      <Tabs.Screen name="journal" options={{ title: "Journal", tabBarIcon: icon("book-open"), tabBarButtonTestID: "tab-journal" }} />
      <Tabs.Screen name="coach" options={{ title: "Hera", tabBarIcon: icon("message-circle"), tabBarButtonTestID: "tab-coach" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: icon("compass"), tabBarButtonTestID: "tab-discover" }} />
    </Tabs>
  );
}
