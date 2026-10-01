import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type User } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Button, ErrorText, IconButton, tap } from "@/src/components/ui";
import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";

const GOLD = "https://images.unsplash.com/photo-1733935156769-fe0c2a600d6c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const BENEFITS = [
  "Unlimited conversations with Hera",
  "Unlimited AI-written affirmations",
  "Every guided visualization, new ones monthly",
  "Unlimited vision board photos",
];
const PLANS = [
  { id: "yearly", title: "Yearly", price: "$39.99 / year", note: "Save 58% · 7 days free" },
  { id: "monthly", title: "Monthly", price: "$7.99 / month", note: "Cancel anytime" },
];

export default function Premium() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setUser } = useAuth();
  const [plan, setPlan] = useState("yearly");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subscribe = async () => {
    setBusy(true);
    setErr(null);
    try {
      setUser(await api<User>("/premium/activate", { method: "POST" }));
      tap("success");
      router.back();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root} testID="premium-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <View style={styles.hero}>
          <Image source={{ uri: GOLD }} style={styles.fill} contentFit="cover" />
          <LinearGradient colors={[colors.scrimClear, colors.scrim]} style={styles.fill} />
          <View style={[styles.heroInner, { paddingTop: insets.top + space.lg }]}>
            <Text style={styles.label}>HERA PRO</Text>
            <Text style={styles.title}>Manifest without limits</Text>
          </View>
        </View>
        <View style={{ padding: space.xl }}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefit}>
              <View style={styles.check}>
                <Feather name="check" size={14} color={colors.onBrandTertiary} />
              </View>
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
          <View style={{ gap: space.md, marginTop: space.xl }}>
            {PLANS.map((p) => (
              <Pressable
                key={p.id}
                testID={`premium-plan-${p.id}`}
                onPress={() => {
                  tap();
                  setPlan(p.id);
                }}
                style={[styles.plan, plan === p.id && styles.planOn]}
              >
                <View style={[styles.radio, plan === p.id && styles.radioOn]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{p.title}</Text>
                  <Text style={styles.planNote}>{p.note}</Text>
                </View>
                <Text style={styles.planPrice}>{p.price}</Text>
              </Pressable>
            ))}
          </View>
          <ErrorText msg={err} testID="premium-error-text" />
          <Text style={styles.demo}>Demo checkout: no payment is taken in this preview.</Text>
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button testID="premium-subscribe-button" title="Start my 7-day free trial" onPress={subscribe} loading={busy} />
      </View>
      <View style={[styles.close, { top: insets.top + space.sm }]}>
        <IconButton testID="premium-close-button" name="x" tone="light" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  hero: { height: 280, backgroundColor: c.surfaceInverse },
  heroInner: { flex: 1, justifyContent: "flex-end", padding: space.xl },
  label: { fontFamily: fonts.text, fontSize: 12, fontWeight: "800", letterSpacing: 1.5, color: c.onSurfaceInverse },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: c.onSurfaceInverse, marginTop: space.sm },
  benefit: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  benefitText: { flex: 1, fontFamily: fonts.text, fontSize: 16, color: c.onSurface },
  plan: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  planOn: { borderColor: c.brandPrimary, backgroundColor: c.brandTertiary },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.borderStrong },
  radioOn: { borderColor: c.brandPrimary, backgroundColor: c.brandPrimary },
  planTitle: { fontFamily: fonts.text, fontSize: 16, fontWeight: "800", color: c.onSurface },
  planNote: { fontFamily: fonts.text, fontSize: 13, color: c.muted },
  planPrice: { fontFamily: fonts.display, fontSize: 16, color: c.onSurface },
  demo: { fontFamily: fonts.text, fontSize: 12, color: c.muted, textAlign: "center", marginTop: space.lg },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.divider, backgroundColor: c.surface },
  close: { position: "absolute", right: space.lg },
}));
