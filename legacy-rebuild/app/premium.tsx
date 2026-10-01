import Feather from "@react-native-vector-icons/feather";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type User } from "@/src/api";
import { useAuth } from "@/src/auth";
import { ErrorText, IconButton, PressableScale, ScreenBg, tap } from "@/src/components/ui";
import { makeStyles, radius, space, useTheme } from "@/src/theme";

const BENEFITS = [
  "Unlimited AI Coaching",
  "Manifestation Plans",
  "Daily Affirmations",
  "Mood & Habit Tracking",
  "Future Self Sessions",
  "Meditation Library",
  "Guided Visualizations",
  "Cloud Sync",
  "AI-Written Affirmations",
  "Early Feature Access",
];
const PLANS = {
  annual: { label: "Annual · $6.99/mo", cta: "$6.99/mo", sub: "7 days free, then just $6.99/mo · billed at $83.88/yr", foot: "$0.00 today · $83.88/yr after trial · Cancel anytime" },
  monthly: { label: "Monthly · $9.99/mo", cta: "$9.99/mo", sub: "7 days free, then $9.99/mo", foot: "$0.00 today · $9.99/mo after trial · Cancel anytime" },
};

export default function Premium() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setUser } = useAuth();
  const [plan, setPlan] = useState<keyof typeof PLANS>("annual");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const p = PLANS[plan];

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
      <ScreenBg />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: space.xl, paddingBottom: space.xl }}>
        <Text style={styles.title}>Try Hera Free for 7 Days.</Text>
        <Text style={styles.sub}>{p.sub}</Text>

        <View style={styles.toggle}>
          {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((k) => (
            <Pressable
              key={k}
              testID={`premium-plan-${k}`}
              onPress={() => {
                tap();
                setPlan(k);
              }}
              style={[styles.toggleBtn, plan === k && styles.toggleOn]}
            >
              <Text style={[styles.toggleText, plan === k && styles.toggleTextOn]} numberOfLines={1}>
                {PLANS[k].label}
              </Text>
              {k === "annual" ? (
                <View style={styles.save}>
                  <Text style={styles.saveText}>Save 30%</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Here is what you will get</Text>
          <View style={styles.grid}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefit}>
                <View style={styles.check}>
                  <Feather name="check" size={13} color={colors.success} />
                </View>
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.pills}>
          {[
            ["gift", "No payment today"],
            ["x-circle", "Cancel anytime"],
            ["shield", "Secure checkout"],
          ].map(([i, t]) => (
            <View key={t} style={styles.pill}>
              <Feather name={i as any} size={15} color={colors.warning} />
              <Text style={styles.pillText}>{t}</Text>
            </View>
          ))}
        </View>
        <ErrorText msg={err} testID="premium-error-text" />
        <Text style={styles.legal}>Demo checkout: no payment is taken in this preview.</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <PressableScale testID="premium-subscribe-button" onPress={subscribe} disabled={busy} haptic="medium" style={styles.cta}>
          <LinearGradient colors={[colors.gradStart, colors.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleFill} />
          <Feather name="star" size={20} color={colors.onBrandPrimary} />
          <Text style={styles.ctaText}>{busy ? "Starting…" : `Start My 7-Day Free Trial – ${p.cta}`}</Text>
        </PressableScale>
        <Text style={styles.foot}>{p.foot}</Text>
      </View>
      <View style={[styles.close, { top: insets.top + space.sm }]}>
        <IconButton testID="premium-close-button" name="x" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const StyleFill = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  title: { fontSize: 36, lineHeight: 42, fontWeight: "800", color: c.onSurface, textAlign: "center" },
  sub: { fontSize: 16, lineHeight: 23, color: c.onSurfaceTertiary, textAlign: "center", marginTop: space.md },
  toggle: { flexDirection: "row", marginTop: space.xl, padding: 4, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  toggleBtn: { flex: 1, minHeight: 48, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm, gap: 2 },
  toggleOn: { backgroundColor: c.brandTertiary },
  toggleText: { fontSize: 13, fontWeight: "700", color: c.onSurfaceTertiary },
  toggleTextOn: { color: c.onSurface },
  save: { backgroundColor: c.success, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 1 },
  saveText: { fontSize: 10, fontWeight: "800", color: c.onSuccess },
  card: { marginTop: space.xl, padding: space.xl, borderRadius: 28, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  cardTitle: { fontSize: 22, fontWeight: "800", color: c.onSurface, marginBottom: space.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: space.md },
  benefit: { width: "50%", flexDirection: "row", alignItems: "center", gap: space.sm, paddingRight: space.sm },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  benefitText: { flex: 1, fontSize: 14, lineHeight: 19, color: c.onSurfaceTertiary },
  pills: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, marginTop: space.xl },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  pillText: { fontSize: 13, fontWeight: "600", color: c.warning },
  legal: { fontSize: 12, color: c.muted, textAlign: "center", marginTop: space.lg },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md },
  cta: { minHeight: 64, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center", paddingVertical: space.md, gap: 4 },
  ctaText: { fontSize: 16, fontWeight: "800", color: c.onBrandPrimary, textAlign: "center", paddingHorizontal: space.lg },
  foot: { fontSize: 12, color: c.muted, textAlign: "center", marginTop: space.sm },
  close: { position: "absolute", right: space.lg },
}));
