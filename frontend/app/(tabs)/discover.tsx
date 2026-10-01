import Feather from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type DiscoverItem } from "@/src/api";
import { Button, Chip, EmptyState, PressableScale, ScreenBg } from "@/src/components/ui";
import { useTabBottomSpace } from "@/src/navigation";
import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";

const CATS = ["All", "Mindset", "Abundance", "Love", "Health", "Career"];

export default function Discover() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = useTabBottomSpace() - space.xl;
  const router = useRouter();
  const [cat, setCat] = useState("All");
  const q = useQuery({ queryKey: ["discover", cat], queryFn: () => api<DiscoverItem[]>(`/discover?category=${cat}`) });

  return (
    <View style={styles.root} testID="discover-screen">
      <ScreenBg />
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.sub}>Expand your mind, elevate your life</Text>
      </View>
      <View style={styles.chipRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATS.map((c) => (
            <Chip key={c} testID={`discover-chip-${c.toLowerCase()}`} label={c} selected={cat === c} onPress={() => setCat(c)} />
          ))}
        </ScrollView>
      </View>
      {q.isLoading ? (
        <ActivityIndicator style={{ marginTop: space.xxxl }} color={colors.brandPrimary} />
      ) : q.isError ? (
        <View style={{ padding: space.xl }}>
          <EmptyState icon="wifi-off" title="Unable to fetch content" body="Check your connection and try again." />
          <Button testID="discover-retry-button" title="Retry" onPress={() => q.refetch()} variant="secondary" />
        </View>
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: bottomChrome + space.xl }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={<EmptyState icon="feather" title="No new content today" body="Try another category." />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(400).delay(Math.min(index, 5) * 70)}>
              {item.type === "quote" ? (
                <View style={styles.quote} testID={`discover-quote-${item.id}`}>
                  <Feather name="feather" size={20} color={colors.brandPrimary} />
                  <Text style={styles.quoteText}>“{item.title}”</Text>
                  <Text style={styles.quoteBy}>— {item.subtitle}</Text>
                </View>
              ) : (
                <PressableScale
                  testID={`discover-article-${item.id}`}
                  onPress={() => router.push({ pathname: "/article/[id]", params: { id: item.id } })}
                  style={index === 0 ? styles.card : styles.row}
                >
                  {index === 0 ? (
                    <>
                      <Image source={{ uri: item.image! }} style={styles.fill} contentFit="cover" transition={250} />
                      <LinearGradient colors={[colors.scrimClear, colors.scrim, colors.surfaceInverse]} locations={[0.2, 0.7, 1]} style={styles.fill} />
                      <View style={styles.cardInner}>
                        <View style={styles.featured}>
                          <Feather name="star" size={12} color={colors.gold} />
                          <Text style={styles.featuredText}>FEATURED</Text>
                        </View>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardSub}>{item.subtitle}</Text>
                        <Text style={styles.meta}>
                          {item.read_minutes} min read · {item.category}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Image source={{ uri: item.image! }} style={styles.thumb} contentFit="cover" transition={250} />
                      <View style={styles.rowBody}>
                        <View style={styles.kind}>
                          <Feather name="file-text" size={12} color={colors.brandSecondary} />
                          <Text style={styles.kindText}>{item.category}</Text>
                        </View>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                        <View style={styles.readRow}>
                          <Feather name="clock" size={12} color={colors.brandSecondary} />
                          <Text style={styles.readText}>{item.read_minutes} min read</Text>
                        </View>
                      </View>
                    </>
                  )}
                </PressableScale>
              )}
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: space.xl },
  title: { fontFamily: fonts.display, fontWeight: "700", fontSize: 32, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 15, color: c.onSurfaceTertiary, marginTop: 2 },
  chipRow: { height: 56, justifyContent: "center" },
  chips: { paddingHorizontal: space.xl, gap: space.sm, alignItems: "center" },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  featured: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "rgba(236,72,153,0.25)", marginBottom: space.sm },
  featuredText: { fontSize: 12, fontWeight: "800", letterSpacing: 2, color: c.gold },
  row: { flexDirection: "row", borderRadius: 24, overflow: "hidden", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, minHeight: 120 },
  thumb: { width: 110, alignSelf: "stretch" },
  rowBody: { flex: 1, padding: space.md, gap: 4 },
  kind: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: c.brandTertiary },
  kindText: { fontSize: 12, fontWeight: "700", color: c.brandSecondary },
  rowTitle: { fontSize: 17, fontWeight: "700", color: c.onSurface },
  rowSub: { fontSize: 14, color: c.onSurfaceTertiary },
  readRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  readText: { fontSize: 13, color: c.brandSecondary },
  card: { height: 300, borderRadius: radius.lg, borderTopLeftRadius: 28, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  cardInner: { flex: 1, justifyContent: "flex-end", padding: space.xl },
  meta: { fontFamily: fonts.text, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: c.onSurfaceInverse },
  cardTitle: { fontFamily: fonts.display, fontWeight: "700", fontSize: 24, lineHeight: 30, color: c.onSurfaceInverse, marginTop: space.sm },
  cardSub: { fontFamily: fonts.text, fontSize: 14, color: c.onSurfaceInverse, opacity: 0.85, marginTop: space.xs },
  quote: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderBottomRightRadius: radius.sm, padding: space.xl, borderWidth: 1, borderColor: c.border },
  quoteText: { fontFamily: fonts.display, fontWeight: "700", fontSize: 22, lineHeight: 30, color: c.onSurface, marginTop: space.md, fontStyle: "italic" },
  quoteBy: { fontFamily: fonts.text, fontSize: 14, color: c.muted, marginTop: space.md },
}));
