import Feather from "@react-native-vector-icons/feather";
import { Redirect, Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { tap } from "@/src/components/ui";
import { TAB_BAR_HEIGHT, tabBarBottom, usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

const ITEMS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  index: "home",
  discover: "headphones",
  journal: "heart",
  profile: "user",
};

function FloatingTabBar({ state, navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: tabBarBottom(insets.bottom) }]}>
      <View style={styles.capsule}>
        {state.routes.map((r: any, i: number) => {
          const active = state.index === i;
          return (
            <Pressable
              key={r.key}
              testID={`tab-${r.name === "index" ? "home" : r.name}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                tap();
                navigation.navigate(r.name);
              }}
              style={styles.btn}
            >
              <Feather name={ITEMS[r.name]} size={24} color={active ? colors.tabActive : colors.tabInactive} />
              <View style={[styles.dot, { backgroundColor: active ? colors.tabActive : "transparent" }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/auth" />;

  if (usesNativeTabs) {
    return (
      <NativeTabs tintColor={colors.brandPrimary}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="discover">
          <NativeTabs.Trigger.Icon sf="headphones" />
          <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="journal">
          <NativeTabs.Trigger.Icon sf="heart.fill" />
          <NativeTabs.Trigger.Label>Journal</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon sf="person.fill" />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { position: "absolute", left: 28, right: 28, alignItems: "center" },
  capsule: {
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    paddingHorizontal: 28,
    borderRadius: 52,
    backgroundColor: c.tabBar,
    borderWidth: 1,
    borderColor: c.border,
  },
  btn: { width: 44, height: 52, alignItems: "center", justifyContent: "center", gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
}));
