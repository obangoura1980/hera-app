import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/auth";
import { useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

export default function Index() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    storage.getItem<boolean>("hera_onboarded", false).then((v) => setOnboarded(!!v));
  }, []);

  if (loading || onboarded === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }
  if (user) return <Redirect href="/(tabs)" />;
  return <Redirect href={onboarded ? "/auth" : "/onboarding"} />;
}
