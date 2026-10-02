/**
 * OfflineNotice.tsx — global "no internet" popup.
 * Listens to NetInfo and shows a themed modal whenever connectivity drops;
 * auto-dismisses on reconnect, with a manual "Try Again" re-check.
 */
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius, FontSize } from '@/constants/theme';

const isOffline = (s: { isConnected: boolean | null; isInternetReachable: boolean | null }) =>
  s.isConnected === false || s.isInternetReachable === false;

export function OfflineNotice() {
  const { colors: c, isDark } = useTheme();
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

  return (
    <Modal visible={offline} transparent animationType="fade" statusBarTranslucent>
      <View style={st.overlay}>
        <View style={[st.card, { backgroundColor: isDark ? '#12142A' : '#FFFFFF', borderColor: c.border }]}>
          <LinearGradient colors={[c.primary, c.primaryDark]} style={st.iconWrap}>
            <Ionicons name="cloud-offline-outline" size={30} color="white" />
          </LinearGradient>
          <Text style={[st.title, { color: c.textWhite }]}>No Internet Connection</Text>
          <Text style={[st.msg, { color: c.textMuted }]}>
            Hera needs a connection to sync your journey. Please check your internet and try again.
          </Text>
          <Pressable onPress={retry} disabled={checking} style={({ pressed }) => [st.btnWrap, (pressed || checking) && { opacity: 0.75 }]}>
            <LinearGradient colors={[c.primary, c.primaryDark]} style={st.btn}>
              <Ionicons name="refresh" size={15} color="white" />
              <Text style={st.btnTxt}>{checking ? 'Checking…' : 'Try Again'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: { width: '100%', maxWidth: 340, borderRadius: Radius.xxl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center' },
  msg: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  btnWrap: { borderRadius: Radius.full, overflow: 'hidden', marginTop: Spacing.xs },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: Spacing.xl },
  btnTxt: { color: 'white', fontSize: FontSize.base, fontWeight: '700' },
});
