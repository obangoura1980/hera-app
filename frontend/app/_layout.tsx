import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AuthProvider } from "@/src/auth";
import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { useTheme } from "@/src/theme";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const { colors } = useTheme();
  // Prewarm fonts, including the icon font so icons render on Expo Go Android.
  const [loaded, error] = useFonts({
    Fraunces: require("../assets/fonts/Fraunces.ttf"),
    Nunito: require("../assets/fonts/Nunito.ttf"),
    Feather: require("@react-native-vector-icons/feather/fonts/Feather.ttf"),
  });

  if (!loaded && !error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  // One app level ErrorBoundary; a render crash shows a reload screen
  // instead of a blank app.
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <AuthProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
                <Stack.Screen name="journal-new" options={{ presentation: "modal" }} />
                <Stack.Screen name="goal-new" options={{ presentation: "modal" }} />
                <Stack.Screen name="premium" options={{ presentation: "modal" }} />
                <Stack.Screen name="visualization" options={{ presentation: "fullScreenModal", animation: "fade" }} />
              </Stack>
            </AuthProvider>
          </KeyboardProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
