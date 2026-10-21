/**
 * RevenueCatPaywall — WEB fallback.
 * The native RevenueCat UI paywall (RevenueCatPaywall.native.tsx) requires the
 * PaywallView native view manager, which does not exist on web/Expo web
 * preview. This fallback keeps /subscription and PaywallModal functional in
 * the browser: explains checkout is mobile-only and offers Restore Purchases.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/useTheme';
import { useSubscription } from '@/hooks/useSubscription';

interface RevenueCatPaywallProps {
  offeringId?: string;
  onDismiss?: () => void;
  onPurchaseSuccess?: () => void;
}

export function RevenueCatPaywall({ onDismiss }: RevenueCatPaywallProps) {
  const { colors: c, isDark } = useTheme();
  const { restoreSubscription, isLoading } = useSubscription();

  return (
    <View style={[st.container, { backgroundColor: isDark ? '#080415' : c.background }]}>
      <Ionicons name="sparkles" size={40} color={isDark ? '#A855F7' : c.primary} />
      <Text style={[st.title, { color: c.textWhite }]}>Hera Premium</Text>
      <Text style={[st.text, { color: c.textMuted }]}>
        {'Checkout is available in the Hera mobile app.\nAlready subscribed? Restore your purchase below.'}
      </Text>
      <Pressable
        onPress={restoreSubscription}
        disabled={isLoading}
        style={({ pressed }) => [st.btn, { borderColor: c.border, backgroundColor: c.glassBg }, pressed && { opacity: 0.7 }]}
      >
        {isLoading
          ? <ActivityIndicator color={c.textWhite} />
          : <Text style={[st.btnText, { color: c.textWhite }]}>Restore Purchases</Text>}
      </Pressable>
      {onDismiss ? (
        <Pressable onPress={onDismiss} style={({ pressed }) => [st.close, pressed && { opacity: 0.7 }]}>
          <Text style={[st.closeText, { color: c.textMuted }]}>Close</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 22, fontWeight: '700' },
  text: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  btn: { marginTop: 10, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24, borderWidth: 1, minWidth: 200, alignItems: 'center' },
  btnText: { fontWeight: '700', fontSize: 15 },
  close: { marginTop: 6, padding: 10 },
  closeText: { fontSize: 14, fontWeight: '500' },
});
