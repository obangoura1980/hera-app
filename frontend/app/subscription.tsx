/**
 * app/subscription.tsx — Native IAP 2-Step checkout for Hera
 * Step 0: Auth gate (sign in / sign up) when user is not authenticated
 * Step 1: Plan selection with native StoreKit prices
 * Step 2: Checkout breakdown + native purchase CTA
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import Animated, { FadeInDown, FadeIn, SlideInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { useAuth, useAlert } from '@/template';
import { IAP_SKUS } from '@/services/iapService';
import { Spacing, Radius, FontSize } from '@/constants/theme';

// ── Legal URLs ────────────────────────────────────────────────────────────────
const TERMS_URL = 'https://downloadhera.com/terms';
const PRIVACY_URL = 'https://downloadhera.com/privacy';

// ── Static pricing fallbacks (shown if StoreKit product list is empty) ────────
const FALLBACK_MONTHLY_PRICE  = '$9.99';
const FALLBACK_YEARLY_PRICE   = '$83.88';
const FALLBACK_YEARLY_MONTHLY = '$6.99';

type BillingCycle = 'monthly' | 'yearly';

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES_LEFT  = ['Unlimited AI Coaching', 'Daily Affirmations', 'Future Self Sessions', 'Guided Visualizations', 'AI Dream Interpretation'];
const FEATURES_RIGHT = ['Manifestation Plans', 'Mood & Habit Tracking', 'Meditation Library', 'Cloud Sync', 'Early Feature Access'];

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Step 1: Trial Summary ─────────────────────────────────────────────────────
function TrialSummaryStep({
  billing, setBilling, onNext,
}: {
  billing: BillingCycle;
  setBilling: (v: BillingCycle) => void;
  onNext: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: c } = useTheme();
  const { iapProducts, restoreSubscription, isLoading } = useSubscription();
  const { user: authUser } = useAuth();

  const monthlyProduct = useMemo(() => iapProducts.find(p => p.productId === IAP_SKUS.monthly), [iapProducts]);
  const yearlyProduct  = useMemo(() => iapProducts.find(p => p.productId === IAP_SKUS.yearly),  [iapProducts]);

  const stripSuffix = (s: string) => s.replace(/\s*\/?(yr|mo|year|month)$/i, '').trim();
  const monthlyPriceStr = stripSuffix((monthlyProduct as any)?.localizedPrice ?? FALLBACK_MONTHLY_PRICE);
  const yearlyPriceStr  = stripSuffix((yearlyProduct  as any)?.localizedPrice ?? FALLBACK_YEARLY_PRICE);
  const yearlyPerMonth  = FALLBACK_YEARLY_MONTHLY;

  const bgColors   = isDark ? (['#080A18', '#0D1035', '#131838'] as const) : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);
  const cardBg     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)';
  const cardBorder = isDark ? 'rgba(168,85,247,0.22)' : 'rgba(196,112,122,0.22)';
  const headColor  = isDark ? 'rgba(255,255,255,0.9)' : '#1A0A14';
  const bodyColor  = isDark ? 'rgba(192,132,252,0.75)' : '#4A2832';
  const checkBg    = isDark ? 'rgba(52,211,153,0.15)' : 'rgba(52,211,153,0.1)';

  const ctaLabel = billing === 'yearly'
    ? `Start Free Trial – ${yearlyPriceStr}/yr`
    : `Start Free Trial – ${monthlyPriceStr}/mo`;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={{ flex: 1 }}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[ts.scroll, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + 220 }]}
      >
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(500).delay(80)} style={{ alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg }}>
          <Text style={[ts.headline, { color: headColor }]}>Try Hera Free for 7 Days.</Text>
          <Text style={[ts.subhead, { color: bodyColor }]}>
            {billing === 'yearly' ? `Then ${yearlyPriceStr} billed annually` : `Then ${monthlyPriceStr} per month`}
          </Text>
        </Animated.View>

        {/* Billing toggle */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(120)}
          style={[ts.toggleWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: cardBorder }]}
        >
          {(['yearly', 'monthly'] as BillingCycle[]).map(b => {
            const isActive = billing === b;
            return (
              <Pressable
                key={b}
                onPress={() => setBilling(b)}
                style={[ts.toggleBtn, isActive && { backgroundColor: isDark ? 'rgba(168,85,247,0.28)' : '#C4707A' }]}
              >
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text style={[ts.toggleTxt, { color: isActive ? '#FFFFFF' : bodyColor }]}>
                    {b === 'yearly' ? `Annual · ${yearlyPriceStr}/yr` : `Monthly · ${monthlyPriceStr}/mo`}
                  </Text>
                  {b === 'yearly' ? (
                    <Text style={[ts.toggleSub, { color: isActive ? 'rgba(255,255,255,0.75)' : bodyColor }]}>
                      {yearlyPerMonth}/mo · billed annually
                    </Text>
                  ) : (
                    <Text style={[ts.toggleSub, { color: isActive ? 'rgba(255,255,255,0.75)' : bodyColor }]}>
                      Billed monthly · Cancel anytime
                    </Text>
                  )}
                </View>
                {b === 'yearly' && <View style={ts.savePill}><Text style={ts.savePillTxt}>Save 30%</Text></View>}
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Features card */}
        <Animated.View entering={FadeInDown.duration(500).delay(160)} style={[ts.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[ts.cardTitle, { color: headColor }]}>Here is what you will get</Text>
          <View style={ts.featuresGrid}>
            <View style={{ flex: 1, gap: Spacing.sm }}>
              {FEATURES_LEFT.map((f, i) => (
                <View key={i} style={ts.featureRow}>
                  <View style={[ts.checkCircle, { backgroundColor: checkBg }]}><Ionicons name="checkmark" size={12} color="#34D399" /></View>
                  <Text style={[ts.featureTxt, { color: bodyColor }]}>{f}</Text>
                </View>
              ))}
            </View>
            <View style={{ flex: 1, gap: Spacing.sm }}>
              {FEATURES_RIGHT.map((f, i) => (
                <View key={i} style={ts.featureRow}>
                  <View style={[ts.checkCircle, { backgroundColor: checkBg }]}><Ionicons name="checkmark" size={12} color="#34D399" /></View>
                  <Text style={[ts.featureTxt, { color: bodyColor }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[ts.divider, { backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(196,112,122,0.18)' }]} />

          {/* Price callout */}
          <View style={ts.priceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm }}>
              <Text style={[ts.freePrice, { color: isDark ? '#A855F7' : c.primary }]}>$0.00</Text>
              <Text style={[ts.strikePrice, { color: bodyColor }]}>
                {billing === 'yearly' ? yearlyPriceStr : monthlyPriceStr}
              </Text>
            </View>
            <View style={[ts.cancelBadge, { borderColor: cardBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Ionicons name="shield-checkmark-outline" size={13} color={isDark ? '#C084FC' : '#C4707A'} />
              <Text style={[ts.cancelTxt, { color: isDark ? '#C084FC' : '#C4707A' }]}>No charge today · Cancel anytime</Text>
            </View>
          </View>

          {billing === 'yearly' && (
            <View style={[ts.savingsRow, { backgroundColor: isDark ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.07)', borderColor: 'rgba(52,211,153,0.25)' }]}>
              <Ionicons name="gift" size={14} color="#34D399" />
              <Text style={[ts.savingsTxt, { color: isDark ? '#34D399' : '#1A6646' }]}>
                Billed annually at {yearlyPriceStr} · Save ~30% vs monthly
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Trust badges */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={ts.trustRow}>
          {[
            { icon: 'gift-outline',             text: 'No payment today' },
            { icon: 'close-circle-outline',     text: 'Cancel anytime'   },
            { icon: 'shield-checkmark-outline', text: 'Secure · Apple Pay' },
          ].map((b, i) => (
            <View key={i} style={[ts.trustChip, { backgroundColor: isDark ? 'rgba(168,85,247,0.1)' : 'rgba(196,112,122,0.1)', borderColor: isDark ? 'rgba(168,85,247,0.28)' : 'rgba(196,112,122,0.28)' }]}>
              <Ionicons name={b.icon as any} size={12} color={isDark ? '#F4D35E' : '#C4707A'} />
              <Text style={[ts.trustTxt, { color: isDark ? '#F4D35E' : '#C4707A' }]}>{b.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Footer */}
        <View style={ts.footerLinks}>
          <Pressable hitSlop={10} onPress={restoreSubscription} disabled={isLoading}>
            <Text style={[ts.footerLink, { color: bodyColor }]}>Restore Purchases</Text>
          </Pressable>
          {!authUser && (
            <>
              <Text style={[ts.footerDot, { color: bodyColor }]}>{'\u00b7'}</Text>
              <Pressable hitSlop={10} onPress={() => router.push('/login')}>
                <Text style={[ts.footerLink, { color: isDark ? '#C084FC' : '#C4707A', fontWeight: '700' }]}>Sign In</Text>
              </Pressable>
            </>
          )}
          <Text style={[ts.footerDot, { color: bodyColor }]}>{'\u00b7'}</Text>
          <Pressable hitSlop={10} onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={[ts.footerLink, { color: bodyColor }]}>Terms of Use (EULA)</Text>
          </Pressable>
        </View>
        <Text style={[ts.legalNote, { color: isDark ? 'rgba(192,132,252,0.38)' : 'rgba(74,40,50,0.45)' }]}>
          Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[ts.ctaSection, { paddingBottom: insets.bottom + Spacing.md }]}>
        <LinearGradient
          colors={isDark ? ['transparent', '#080A18', '#080A18'] : ['transparent', '#F5C2C7', '#F5C2C7']}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={ts.ctaInner}>
          <Pressable
            onPress={onNext}
            style={({ pressed }) => [{ borderRadius: Radius.xxl, overflow: 'hidden' }, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient colors={isDark ? (['#A855F7', '#EC4899'] as const) : [c.primary, c.primaryDark]} style={ts.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="sparkles" size={18} color="white" />
              <Text style={ts.ctaTxt}>{ctaLabel}</Text>
            </LinearGradient>
          </Pressable>
          <Text style={[ts.ctaSub, { color: isDark ? 'rgba(192,132,252,0.55)' : 'rgba(74,40,50,0.55)' }]}>
            $0.00 today · Confirmation via App Store
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const ts = StyleSheet.create({
  scroll:      { paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  headline:    { fontSize: 34, fontWeight: '800', textAlign: 'center', lineHeight: 42, letterSpacing: -0.5 },
  subhead:     { fontSize: FontSize.base, textAlign: 'center', lineHeight: 23 },
  toggleWrap:  { flexDirection: 'row', borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', padding: 4, gap: 4 },
  toggleBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm + 4, borderRadius: Radius.lg, gap: 6, flexWrap: 'wrap' },
  toggleTxt:   { fontSize: FontSize.sm, fontWeight: '700', textAlign: 'center' },
  toggleSub:   { fontSize: 10, textAlign: 'center' },
  savePill:    { backgroundColor: '#34D399', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  savePillTxt: { fontSize: 10, color: 'white', fontWeight: '800' },
  card:        { borderRadius: Radius.xxl, borderWidth: 1, padding: Spacing.xl, gap: Spacing.lg },
  cardTitle:   { fontSize: FontSize.lg, fontWeight: '700' },
  featuresGrid: { flexDirection: 'row', gap: Spacing.lg },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkCircle: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTxt:  { fontSize: FontSize.sm, fontWeight: '500', flex: 1, lineHeight: 19 },
  divider:     { height: 1, borderRadius: 1 },
  priceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.sm },
  freePrice:   { fontSize: 36, color: '#A855F7', fontWeight: '900' },
  strikePrice: { fontSize: FontSize.lg, textDecorationLine: 'line-through', fontWeight: '500' },
  cancelBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1 },
  cancelTxt:   { fontSize: FontSize.xs, fontWeight: '600' },
  savingsRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  savingsTxt:  { fontSize: FontSize.xs, fontWeight: '700', flex: 1 },
  trustRow:    { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
  trustChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1 },
  trustTxt:    { fontSize: FontSize.xs, fontWeight: '600' },
  footerLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  footerLink:  { fontSize: FontSize.xs, textDecorationLine: 'underline' },
  footerDot:   { fontSize: FontSize.xs },
  legalNote:   { fontSize: 10, textAlign: 'center', lineHeight: 16, paddingHorizontal: Spacing.md },
  ctaSection:  { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.xl, paddingTop: 55 },
  ctaInner:    { gap: Spacing.md },
  ctaGrad:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 18, paddingHorizontal: Spacing.md, flexWrap: 'wrap' },
  ctaTxt:      { fontSize: FontSize.base, color: 'white', fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  ctaSub:      { fontSize: FontSize.xs, textAlign: 'center' },
});

// ── Step 2: Confirm Native Purchase ──────────────────────────────────────────
function CheckoutBreakdownStep({
  billing, onConfirm, onBack, isPurchasing,
}: {
  billing: BillingCycle;
  onConfirm: () => void;
  onBack: () => void;
  isPurchasing: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: c } = useTheme();
  const { iapProducts, restoreSubscription, isLoading } = useSubscription();
  const { user: authUser } = useAuth();

  const monthlyProduct = useMemo(() => iapProducts.find(p => p.productId === IAP_SKUS.monthly), [iapProducts]);
  const yearlyProduct  = useMemo(() => iapProducts.find(p => p.productId === IAP_SKUS.yearly),  [iapProducts]);

  const stripSuffix = (s: string) => s.replace(/\s*\/?(yr|mo|year|month)$/i, '').trim();
  const monthlyPriceStr = stripSuffix((monthlyProduct as any)?.localizedPrice ?? FALLBACK_MONTHLY_PRICE);
  const yearlyPriceStr  = stripSuffix((yearlyProduct  as any)?.localizedPrice ?? FALLBACK_YEARLY_PRICE);
  const yearlyPerMonth  = FALLBACK_YEARLY_MONTHLY;

  const bgColors    = isDark ? (['#080A18', '#0D1035', '#131838'] as const) : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);
  const cardBg      = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.96)';
  const cardBorder  = isDark ? 'rgba(168,85,247,0.22)' : 'rgba(196,112,122,0.22)';
  const titleColor  = isDark ? '#FFFFFF' : '#1A0A14';
  const bodyColor   = isDark ? 'rgba(192,132,252,0.75)' : '#4A2832';
  const lineColor   = isDark ? 'rgba(168,85,247,0.15)' : 'rgba(196,112,122,0.15)';
  const accentColor = isDark ? '#C084FC' : '#C4707A';

  const postTrialAmt    = billing === 'yearly' ? `${yearlyPriceStr}/yr` : `${monthlyPriceStr}/mo`;
  const postTrialDetail = billing === 'yearly' ? `${yearlyPerMonth}/mo × 12 months · billed as ${yearlyPriceStr}/yr` : 'Billed monthly · Cancel anytime';
  const billingDate     = addDays(7);
  const productLabel    = billing === 'yearly' ? 'Hera Premium · Annual Plan' : 'Hera Premium · Monthly Plan';
  const confirmLabel    = billing === 'yearly'
    ? `Confirm Free Trial – ${yearlyPriceStr}/yr`
    : `Confirm Free Trial – ${monthlyPriceStr}/mo`;

  return (
    <Animated.View entering={SlideInRight.duration(340)} style={{ flex: 1 }}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Top bar */}
      <View style={[cb.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={onBack} hitSlop={14} style={({ pressed }) => [cb.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderColor: cardBorder }, pressed && { opacity: 0.65 }]}>
          <Ionicons name="arrow-back" size={18} color={bodyColor} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Image source={isDark ? require('@/assets/images/logo.png') : require('@/assets/images/logo-light.png')} style={{ width: 28, height: 28 }} contentFit="contain" />
          <Text style={[cb.brand, { color: titleColor }]}>HERA</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[cb.scroll, { paddingBottom: insets.bottom + 210 }]}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(420).delay(60)} style={{ gap: Spacing.sm }}>
          <Text style={[cb.eyebrow, { color: accentColor }]}>Try Hera for free</Text>
          <Text style={[cb.title, { color: titleColor }]}>7 days free</Text>
          <Text style={[cb.subtitle, { color: bodyColor }]}>
            Then {postTrialAmt} starting {billingDate}
          </Text>
          {postTrialDetail ? (
            <Text style={[cb.subtitleNote, { color: bodyColor }]}>{postTrialDetail}</Text>
          ) : null}

        </Animated.View>

        {/* Breakdown card */}
        <Animated.View entering={FadeInDown.duration(440).delay(100)} style={[cb.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={cb.lineItem}>
            <View style={[cb.productIconWrap, { backgroundColor: isDark ? '#1A0A35' : '#F5C2C7' }]}>
              <Image source={isDark ? require('@/assets/images/logo.png') : require('@/assets/images/logo-light.png')} style={{ width: 22, height: 22 }} contentFit="contain" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[cb.lineLabel, { color: titleColor }]}>{productLabel}</Text>
              <Text style={[cb.lineNote, { color: bodyColor }]}>7 days free trial</Text>
            </View>
            <Text style={[cb.lineAmt, { color: bodyColor }]}>{postTrialAmt} after</Text>
          </View>
          <View style={[cb.divider, { backgroundColor: lineColor }]} />
          <View style={cb.summaryRow}>
            <Text style={[cb.summaryLabel, { color: bodyColor }]}>Subtotal</Text>
            <Text style={[cb.summaryAmt, { color: bodyColor }]}>{billing === 'yearly' ? `${yearlyPriceStr}/yr` : `${monthlyPriceStr}/mo`}</Text>
          </View>
          <View style={[cb.divider, { backgroundColor: lineColor }]} />
          <View style={[cb.dueTodayRow, { backgroundColor: isDark ? 'rgba(168,85,247,0.07)' : 'rgba(196,112,122,0.07)', borderColor: isDark ? 'rgba(168,85,247,0.2)' : 'rgba(196,112,122,0.2)' }]}>
            <Text style={[cb.dueTodayLabel, { color: titleColor }]}>Total due today</Text>
            <Text style={[cb.dueTodayAmt, { color: isDark ? '#A855F7' : c.primary }]}>$0.00</Text>
          </View>
        </Animated.View>

        {/* Billing schedule */}
        <Animated.View entering={FadeInDown.duration(440).delay(140)} style={[cb.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[cb.cardSectionTitle, { color: titleColor }]}>Billing Schedule</Text>
          {[
            { icon: 'gift-outline',     iconColor: '#34D399', iconBg: 'rgba(52,211,153,0.12)',  label: 'Today',               note: 'Free trial begins — no charge today', amount: '$0.00',       amountColor: '#34D399' },
            { icon: 'calendar-outline', iconColor: accentColor, iconBg: isDark ? 'rgba(192,132,252,0.1)' : 'rgba(196,112,122,0.1)', label: `Due ${billingDate}`, note: 'First charge — cancel before to avoid', amount: billing === 'yearly' ? `${yearlyPriceStr}/yr` : `${monthlyPriceStr}/mo`, amountColor: titleColor },
          ].map((row, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={[cb.divider, { backgroundColor: lineColor }]} />}
              <View style={cb.scheduleRow}>
                <View style={[cb.scheduleIcon, { backgroundColor: row.iconBg }]}><Ionicons name={row.icon as any} size={17} color={row.iconColor} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[cb.scheduleLabel, { color: titleColor }]}>{row.label}</Text>
                  <Text style={[cb.scheduleNote, { color: bodyColor }]}>{row.note}</Text>
                </View>
                <Text style={[cb.scheduleAmt, { color: row.amountColor, fontWeight: '800' }]}>{row.amount}</Text>
              </View>
            </React.Fragment>
          ))}
        </Animated.View>

        {/* Mini feature chips */}
        <Animated.View entering={FadeInDown.duration(440).delay(180)} style={[cb.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[cb.cardSectionTitle, { color: titleColor }]}>What is included</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {[...FEATURES_LEFT, ...FEATURES_RIGHT].slice(0, 8).map((f, i) => (
              <View key={i} style={[cb.miniFeature, { backgroundColor: isDark ? 'rgba(168,85,247,0.07)' : 'rgba(196,112,122,0.07)', borderColor: cardBorder }]}>
                <Ionicons name="checkmark-circle" size={12} color="#34D399" />
                <Text style={{ fontSize: FontSize.xs, fontWeight: '500', color: bodyColor }}>{f}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Apple IAP notice */}
        <View style={[cb.appleNotice, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
          <Ionicons name="logo-apple" size={16} color={bodyColor} />
          <Text style={[cb.appleNoticeTxt, { color: bodyColor }]}>
            Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
          </Text>
        </View>

        {/* Footer */}
        <View style={cb.footerLinks}>
          <Pressable hitSlop={10} onPress={restoreSubscription} disabled={isLoading}>
            <Text style={[cb.footerLink, { color: bodyColor }]}>Restore Purchases</Text>
          </Pressable>
          {!authUser && (
            <>
              <Text style={{ fontSize: FontSize.xs, color: bodyColor }}>{'\u00b7'}</Text>
              <Pressable hitSlop={10} onPress={() => router.push('/login')}>
                <Text style={[cb.footerLink, { color: isDark ? '#C084FC' : '#C4707A', fontWeight: '700' }]}>Sign In</Text>
              </Pressable>
            </>
          )}
          <Text style={{ fontSize: FontSize.xs, color: bodyColor }}>{'\u00b7'}</Text>
          <Pressable hitSlop={10} onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={[cb.footerLink, { color: bodyColor }]}>Terms of Use (EULA)</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[cb.ctaSection, { paddingBottom: insets.bottom + Spacing.md }]}>
        <LinearGradient
          colors={isDark ? ['transparent', '#080A18', '#080A18'] : ['transparent', '#F5C2C7', '#F5C2C7']}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={{ gap: Spacing.md, paddingHorizontal: Spacing.xl }}>
          <Pressable
            onPress={onConfirm}
            disabled={isPurchasing}
            style={({ pressed }) => [{ borderRadius: Radius.xxl, overflow: 'hidden' }, (pressed || isPurchasing) && { opacity: 0.8 }]}
          >
            <LinearGradient colors={isDark ? (['#A855F7', '#EC4899'] as const) : [c.primary, c.primaryDark]} style={cb.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isPurchasing
                ? <ActivityIndicator color="white" size="small" />
                : (<><Ionicons name="logo-apple" size={18} color="white" /><Text style={cb.ctaTxt}>{confirmLabel}</Text></>)
              }
            </LinearGradient>
          </Pressable>
          <View style={[cb.secureRow, { backgroundColor: isDark ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.2)' }]}>
            <Ionicons name="shield-checkmark" size={14} color="#34D399" />
            <Text style={[cb.secureTxt, { color: isDark ? 'rgba(52,211,153,0.9)' : '#2D7A5C' }]}>
              Secure Apple checkout {'\u00b7'} $0.00 charged today {'\u00b7'} Cancel before {billingDate}
            </Text>
          </View>
          <Pressable onPress={onBack} hitSlop={10} style={{ alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '500', color: bodyColor }}>Go back</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const cb = StyleSheet.create({
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  backBtn:          { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  brand:            { fontSize: 18, fontWeight: '800', letterSpacing: 2.5 },
  scroll:           { paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  eyebrow:          { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  title:            { fontSize: 38, fontWeight: '900', letterSpacing: -0.5 },
  subtitle:         { fontSize: FontSize.base, lineHeight: 23 },
  subtitleNote:     { fontSize: FontSize.xs, lineHeight: 18, marginTop: -Spacing.sm },
  card:             { borderRadius: Radius.xxl, borderWidth: 1, padding: Spacing.xl, gap: Spacing.md },
  cardSectionTitle: { fontSize: FontSize.base, fontWeight: '700', marginBottom: 4 },
  lineItem:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  productIconWrap:  { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lineLabel:        { fontSize: FontSize.sm, fontWeight: '600' },
  lineNote:         { fontSize: FontSize.xs },
  lineAmt:          { fontSize: FontSize.sm, fontWeight: '600', flexShrink: 0 },
  divider:          { height: 1, borderRadius: 1 },
  summaryRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel:     { fontSize: FontSize.sm },
  summaryAmt:       { fontSize: FontSize.sm, fontWeight: '600' },
  dueTodayRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginTop: 4 },
  dueTodayLabel:    { fontSize: FontSize.base, fontWeight: '700' },
  dueTodayAmt:      { fontSize: 28, color: '#A855F7', fontWeight: '900' },
  scheduleRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  scheduleIcon:     { width: 38, height: 38, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  scheduleLabel:    { fontSize: FontSize.sm, fontWeight: '600' },
  scheduleNote:     { fontSize: FontSize.xs, lineHeight: 17 },
  scheduleAmt:      { fontSize: FontSize.base, flexShrink: 0 },
  miniFeature:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.sm + 2, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  appleNotice:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  appleNoticeTxt:   { fontSize: FontSize.xs, lineHeight: 17, flex: 1 },
  footerLinks:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  footerLink:       { fontSize: FontSize.xs, textDecorationLine: 'underline' },
  ctaSection:       { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 55 },
  ctaGrad:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 18, paddingHorizontal: Spacing.md, flexWrap: 'wrap' },
  ctaTxt:           { fontSize: FontSize.base, color: 'white', fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  secureRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  secureTxt:        { fontSize: FontSize.xs, fontWeight: '600', flex: 1, lineHeight: 17 },
});

// ── Step 0: Auth Gate ─────────────────────────────────────────────────────────
type AuthStage = 'email' | 'otp';

function AuthGateStep({ onAuthenticated }: { onAuthenticated: () => void }) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: c } = useTheme();
  const { sendOTP, verifyOTPAndLogin, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const [authStage, setAuthStage] = useState<AuthStage>('email');
  const [email, setEmail]         = useState('');
  const [normEmail, setNormEmail] = useState('');
  const [otp, setOtp]             = useState('');
  const [checking, setChecking]   = useState(false);

  const bgColors  = isDark ? (['#080A18', '#0D1035', '#131838'] as const) : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);
  const cardBg    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)';
  const cardBorder= isDark ? 'rgba(168,85,247,0.22)' : 'rgba(196,112,122,0.22)';
  const titleColor= isDark ? '#FFFFFF' : '#1A0A14';
  const bodyColor = isDark ? 'rgba(192,132,252,0.75)' : '#4A2832';
  const inputBg   = isDark ? '#1A1A2E' : '#FFFFFF';
  const inputBorder = isDark ? '#3A3A60' : 'rgba(196,112,122,0.35)';

  const friendlyErr = (e: string) => {
    const l = e.toLowerCase();
    if (l.includes('rate limit') || l.includes('too many')) return 'Too many attempts. Please wait and try again.';
    if (l.includes('invalid') && l.includes('otp'))         return 'Incorrect code. Please check your email.';
    if (l.includes('expired'))                              return 'Code expired. Tap Resend to get a new one.';
    return e;
  };

  const handleSend = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    // Client-side format check — no backend call for obviously invalid emails
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showAlert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    const { error } = await sendOTP(trimmed);
    if (error) { showAlert('Error', friendlyErr(error)); return; }
    setNormEmail(trimmed); setOtp(''); setAuthStage('otp');
  }, [email, sendOTP, showAlert]);

  const handleVerify = useCallback(async () => {
    if (otp.length < 4) return;
    setChecking(true);
    const { error } = await verifyOTPAndLogin(normEmail, otp.trim());
    setChecking(false);
    if (error) { setOtp(''); showAlert('Invalid Code', friendlyErr(error)); return; }
    onAuthenticated();
  }, [otp, normEmail, verifyOTPAndLogin, showAlert, onAuthenticated]);

  return (
    <Animated.View entering={FadeIn.duration(350)} style={{ flex: 1 }}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', top: -60, alignSelf: 'center', width: 260, height: 260, borderRadius: 130, backgroundColor: isDark ? 'rgba(168,85,247,0.09)' : 'rgba(196,112,122,0.09)' }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40, gap: Spacing.xl, alignItems: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          {authStage === 'otp' && (
          <Pressable
            onPress={() => { setAuthStage('email'); setOtp(''); }}
            style={({ pressed }) => [ag.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderColor: cardBorder }, pressed && { opacity: 0.65 }]}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={18} color={bodyColor} />
          </Pressable>
          )}

          <Animated.View entering={FadeInDown.duration(420).delay(60)} style={{ alignItems: 'center', gap: Spacing.md }}>
            <Image source={isDark ? require('@/assets/images/logo.png') : require('@/assets/images/logo-light.png')} style={{ width: 88, height: 88 }} contentFit="contain" transition={200} />
            <Text style={[ag.title, { color: titleColor }]}>
              {authStage === 'email' ? 'Create Account or Sign In' : 'Check Your Email'}
            </Text>
            <Text style={[ag.subtitle, { color: bodyColor }]}>
              {authStage === 'email'
                ? 'One email is all you need — new accounts are created automatically'
                : `We sent a 4-digit code to\n${normEmail}`}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(440).delay(120)} style={[ag.card, { backgroundColor: cardBg, borderColor: cardBorder, width: '100%' }]}>
            {authStage === 'email' ? (
              <>
                <Text style={[ag.fieldLabel, { color: bodyColor }]}>Email Address</Text>
                <View style={[ag.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                  <Ionicons name="mail-outline" size={18} color={bodyColor} style={{ paddingLeft: Spacing.md }} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={isDark ? 'rgba(192,132,252,0.35)' : 'rgba(74,40,50,0.35)'}
                    style={[ag.input, { color: titleColor }]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSend}
                  />
                </View>
                <Pressable
                  onPress={handleSend}
                  disabled={operationLoading || !email.trim()}
                  style={({ pressed }) => [{ borderRadius: Radius.xl, overflow: 'hidden' }, (pressed || operationLoading || !email.trim()) && { opacity: 0.65 }]}
                >
                  <LinearGradient colors={isDark ? (['#A855F7', '#EC4899'] as const) : [c.primary, c.primaryDark]} style={ag.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {operationLoading
                      ? <ActivityIndicator color="white" size="small" />
                      : (<><Ionicons name="send" size={16} color="white" /><Text style={ag.ctaTxt}>Continue with Email</Text></>)}
                  </LinearGradient>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[ag.fieldLabel, { color: bodyColor }]}>Verification Code</Text>
                <TextInput
                  value={otp}
                  onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="• • • •"
                  placeholderTextColor={bodyColor}
                  style={[ag.otpInput, { backgroundColor: inputBg, borderColor: otp.length === 4 ? c.primary : inputBorder, color: titleColor }]}
                  keyboardType="number-pad"
                  autoFocus
                  maxLength={4}
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                />
                <Pressable
                  onPress={handleVerify}
                  disabled={operationLoading || checking || otp.length < 4}
                  style={({ pressed }) => [{ borderRadius: Radius.xl, overflow: 'hidden' }, (pressed || operationLoading || checking || otp.length < 4) && { opacity: 0.65 }]}
                >
                  <LinearGradient colors={isDark ? (['#A855F7', '#EC4899'] as const) : [c.primary, c.primaryDark]} style={ag.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {operationLoading || checking
                      ? <ActivityIndicator color="white" size="small" />
                      : (<><Ionicons name="checkmark-circle" size={16} color="white" /><Text style={ag.ctaTxt}>Verify &amp; Continue</Text></>)}
                  </LinearGradient>
                </Pressable>
                <Pressable onPress={handleSend} disabled={operationLoading} hitSlop={10} style={{ alignItems: 'center', paddingVertical: 4 }}>
                  <Text style={{ fontSize: FontSize.sm, color: isDark ? '#C084FC' : '#C4707A', fontWeight: '600' }}>Resend code</Text>
                </Pressable>
              </>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(440).delay(180)} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm }}>
            {[
              { icon: 'lock-closed-outline', text: 'No password needed' },
              { icon: 'shield-checkmark-outline', text: 'Encrypted & secure' },
              { icon: 'sparkles-outline', text: 'Instant account creation' },
            ].map((b, i) => (
              <View key={i} style={[ag.trustChip, { backgroundColor: isDark ? 'rgba(168,85,247,0.08)' : 'rgba(196,112,122,0.08)', borderColor: isDark ? 'rgba(168,85,247,0.22)' : 'rgba(196,112,122,0.22)' }]}>
                <Ionicons name={b.icon as any} size={12} color={isDark ? '#F4D35E' : '#C4707A'} />
                <Text style={{ fontSize: FontSize.xs, color: isDark ? '#F4D35E' : '#C4707A', fontWeight: '600' }}>{b.text}</Text>
              </View>
            ))}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const ag = StyleSheet.create({
  backBtn:    { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  title:      { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3, lineHeight: 36 },
  subtitle:   { fontSize: FontSize.base, textAlign: 'center', lineHeight: 24 },
  card:       { borderRadius: Radius.xxl, borderWidth: 1, padding: Spacing.xl, gap: Spacing.md },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginLeft: 2 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1 },
  input:      { flex: 1, paddingHorizontal: Spacing.md, paddingVertical: 15, fontSize: FontSize.base },
  otpInput:   { textAlign: 'center', fontSize: 30, fontWeight: '800', letterSpacing: 14, paddingVertical: 18, borderRadius: Radius.lg, borderWidth: 2 },
  ctaBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 16, borderRadius: Radius.xl },
  ctaTxt:     { fontSize: FontSize.base, color: 'white', fontWeight: '800' },
  trustChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1 },
});

// ── Root Screen ───────────────────────────────────────────────────────────────
export default function SubscriptionScreen() {
  const { purchasePlan, isPurchasing, isSubscribed } = useSubscription();
  const { user: authUser } = useAuth();
  const [step,    setStep]    = useState<0 | 1 | 2>(0);
  const [billing, setBilling] = useState<BillingCycle>('yearly');
  const { isDark } = useTheme();

  useEffect(() => {
    if (isSubscribed) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)');
    }
  }, [isSubscribed]);

  useEffect(() => {
    if (authUser && step === 0) setStep(1);
  }, [authUser]);

  const handleConfirm = useCallback(() => {
    if (isPurchasing) return; // guard against double-tap
    purchasePlan(billing);
  }, [isPurchasing, purchasePlan, billing]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#080A18' : '#FDE8EA' }}>
      {step === 0
        ? <AuthGateStep onAuthenticated={() => setStep(1)} />
        : step === 1
          ? <TrialSummaryStep billing={billing} setBilling={setBilling} onNext={() => setStep(2)} />
          : <CheckoutBreakdownStep billing={billing} onConfirm={handleConfirm} onBack={() => setStep(1)} isPurchasing={isPurchasing} />
      }
    </View>
  );
}
