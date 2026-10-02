import Ionicons from '@react-native-vector-icons/ionicons';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Pressable, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/template';

// ── Floating bottom nav config ─────────────────────────────────────────────────
const NAV_ITEMS: {
  route: string;
  iconOff: import('react').ComponentProps<typeof Ionicons>['name'];
  iconOn: import('react').ComponentProps<typeof Ionicons>['name'];
}[] = [
  { route: 'index',    iconOff: 'home-outline',   iconOn: 'home' },
  { route: 'discover', iconOff: 'headset-outline', iconOn: 'headset' },
  { route: 'vision',   iconOff: 'images-outline',  iconOn: 'images' },
  { route: 'journal',  iconOff: 'heart-outline',   iconOn: 'heart' },
  { route: 'profile',  iconOff: 'person-outline',  iconOn: 'person' },
];

// ── Subscription guard — blocks unsubscribed users from accessing tabs ─────────
// Waits until auth and the first subscription check have resolved so paying
// users are never bounced to the paywall while their status is still loading.
function SubscriptionGuard() {
  const { isSubscribed, isTrial, isLoading, statusLoaded } = useSubscription();
  const { loading: authLoading } = useAuth();
  useEffect(() => {
    if (authLoading || isLoading || !statusLoaded) return;
    if (!isSubscribed && !isTrial) {
      router.replace('/subscription');
    }
  }, [isSubscribed, isTrial, isLoading, statusLoaded, authLoading]);
  return null;
}

// ── Floating Capsule Tab Bar ───────────────────────────────────────────────────
function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const activeRoute: string = state.routes[state.index]?.name ?? 'index';
  const activeTint = isDark ? '#C084FC' : '#2D1520';
  const inactiveTint = isDark ? 'rgba(192,132,252,0.42)' : '#B0909A';
  const capsuleBg = isDark ? 'rgba(30,27,46,0.85)' : 'rgba(255,255,255,0.78)';

  return (
    <View
      pointerEvents="box-none"
      style={[fn.wrapper, { bottom: Math.max(insets.bottom, 10) + 14 }]}
    >
      <View style={[fn.capsule, { backgroundColor: capsuleBg }]}>
        {NAV_ITEMS.map(item => {
          const isActive = activeRoute === item.route;
          return (
            <Pressable
              key={item.route}
              onPress={() => navigation.navigate(item.route)}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
              style={({ pressed }) => [fn.btn, pressed && { opacity: 0.7 }]}
              accessibilityLabel={item.route}
            >
              <Ionicons
                name={isActive ? item.iconOn : item.iconOff}
                size={24}
                color={isActive ? activeTint : inactiveTint}
              />
              {isActive ? <View style={[fn.dot, { backgroundColor: activeTint }]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const fn = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 28,
    right: 28,
    alignItems: 'center',
    zIndex: 999,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 52,
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#14082E', // overridden inline
    marginTop: -2,
  },
});

// ── Layout ────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <>
      <SubscriptionGuard />
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="vision" />
        <Tabs.Screen name="journal" />
        <Tabs.Screen name="discover" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </>
  );
}
