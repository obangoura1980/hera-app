import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AlertProvider, AuthProvider } from '@/template';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { HeraProvider } from '@/contexts/HeraContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useHera } from '@/hooks/useHera';
import { useTheme } from '@/hooks/useTheme';
import { initNotifications } from '@/services/notificationService';
import { initAppsFlyer } from '@/src/services/appsflyerService';
import { useFonts } from 'expo-font';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { OfflineNotice } from '@/components/OfflineNotice';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeRevenueCat, RCSubscriptionProvider } from '@/src/lib/revenuecat';

// RevenueCat must be configured at module scope, once, before any component mounts.
const queryClient = new QueryClient();
try {
  initializeRevenueCat();
} catch (err) {
  console.warn('RevenueCat unavailable:', err);
}

function AppContent() {
  const { isLoading } = useHera();
  const { isDark, colors } = useTheme();

  useEffect(() => {
    initNotifications().catch(() => {});
    // AppsFlyer — init once at app launch (native only; no-op on web)
    initAppsFlyer().catch((error) => {
      if (__DEV__) console.warn('AppsFlyer initialization failed', error);
    });
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" options={{ animation: 'slide_from_bottom', headerShown: false, gestureEnabled: false, headerBackVisible: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="subscription" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="visualization" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="discover-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="privacy-policy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <OfflineNotice />
    </>
  );
}

export default function RootLayout() {
  // Prewarm icon fonts so icons render on Expo Go Android.
  const [fontsLoaded, fontError] = useFonts({
    Ionicons: require('@react-native-vector-icons/ionicons/fonts/Ionicons.ttf'),
    MaterialIcons: require('@react-native-vector-icons/material-icons/fonts/MaterialIcons.ttf'),
  });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: '#080A18' }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <KeyboardProvider>
    <ThemeProvider>
    <AlertProvider>
    <QueryClientProvider client={queryClient}>
    <RCSubscriptionProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <HeraProvider>
                <AppContent />
              </HeraProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </SafeAreaProvider>
    </RCSubscriptionProvider>
    </QueryClientProvider>
    </AlertProvider>
    </ThemeProvider>
    </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
