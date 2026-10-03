/**
 * OfflineNotice.tsx — global "internet not available" toast.
 * Slides down from the top whenever connectivity drops and stays visible
 * until the connection returns (auto-hides on reconnect). Tap to re-check.
 * Native uses @react-native-community/netinfo; web uses browser online/offline events.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius, FontSize } from '@/constants/theme';

const isOffline = (s: { isConnected: boolean | null; isInternetReachable: boolean | null }) =>
  s.isConnected === false || s.isInternetReachable === false;

export function OfflineNotice() {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // NetInfo has no web implementation — use browser events there.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const update = () => setOffline(!navigator.onLine);
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      update();
      return () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    }
    const unsub = NetInfo.addEventListener(state => setOffline(isOffline(state)));
    return () => unsub();
  }, []);

  const retry = async () => {
    if (checking) return;
    setChecking(true);
    try {
      if (Platform.OS === 'web') setOffline(!navigator.onLine);
      else setOffline(isOffline(await NetInfo.refresh()));
    } catch {
      setOffline(true);
    } finally {
      setChecking(false);
    }
  };

  if (!offline) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(280)}
      exiting={SlideOutUp.duration(220)}
      style={[st.wrap, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      <Pressable onPress={retry} accessibilityLabel="No internet connection. Tap to retry">
        <View style={[st.toast, { backgroundColor: isDark ? '#1A1D33' : '#FFFFFF', borderColor: c.border }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={c.error} />
          <Text style={[st.txt, { color: c.textWhite }]}>
            {checking ? 'Checking connection…' : 'Internet not available'}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  txt: { fontSize: FontSize.sm, fontWeight: '600' },
});
