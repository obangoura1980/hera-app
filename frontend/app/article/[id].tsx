import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type DiscoverItem } from "@/src/api";
import { IconButton } from "@/src/components/ui";
import { fonts, makeStyles, space, useTheme } from "@/src/theme";

export default function Article() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ["discover-item", id], queryFn: () => api<DiscoverItem>(`/discover/${id}`) });

  return (
    <View style={styles.root} testID="article-screen">
      {q.isLoading || !q.data ? (
        <ActivityIndicator style={{ marginTop: 200 }} color={colors.brandPrimary} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
          <View style={styles.hero}>
            {q.data.image ? <Image source={{ uri: q.data.image }} style={styles.fill} contentFit="cover" /> : null}
            <LinearGradient colors={[colors.scrimClear, colors.scrim]} style={styles.fill} />
            <View style={styles.heroInner}>
              <Text style={styles.meta}>
                {q.data.category.toUpperCase()} · {q.data.read_minutes} MIN READ
              </Text>
              <Text style={styles.title} testID="article-title">
                {q.data.title}
              </Text>
            </View>
          </View>
          <View style={styles.body}>
            <Text style={styles.subtitle}>{q.data.subtitle}</Text>
            {q.data.body.map((p, i) => (
              <Text key={i} style={styles.para}>
                {p}
              </Text>
            ))}
          </View>
        </ScrollView>
      )}
      <View style={[styles.back, { top: insets.top + space.sm }]}>
        <IconButton testID="article-back-button" name="arrow-left" tone="light" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  hero: { height: 380, backgroundColor: c.surfaceInverse },
  heroInner: { flex: 1, justifyContent: "flex-end", padding: space.xl },
  meta: { fontFamily: fonts.text, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: c.brandTertiary },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: c.onSurfaceInverse, marginTop: space.sm },
  body: { padding: space.xl },
  subtitle: { fontFamily: fonts.display, fontSize: 19, fontStyle: "italic", color: c.brandPrimary, marginBottom: space.lg },
  para: { fontFamily: fonts.text, fontSize: 17, lineHeight: 28, color: c.onSurfaceSecondary, marginBottom: space.lg },
  back: { position: "absolute", left: space.lg },
}));
