/**
 * app/subscription.tsx — Hera paywall
 * Step 0: Auth gate (email sign-in) so purchases are tied to the account
 * Step 1: Dynamic RevenueCat paywall (identity-specific current offering) with a
 *         "Continue to App" fallback when the store returns no products
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, UIManager,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { useAuth, useAlert } from '@/template';
import { Spacing, Radius, FontSize } from '@/constants/theme';
import { useRCSubscription } from '@/src/lib/revenuecat';
import { RevenueCatPaywall } from '@/components/feature/RevenueCatPaywall';

// Native RevenueCat paywall is only safe when the native view exists AND the
// offering actually has packages — otherwise RevenueCatUI renders a dead-end
// "Paywall is not available" screen. In every other case show the fallback screen.
const HAS_NATIVE_PAYWALL = Platform.OS !== 'web' && UIManager.getViewManagerConfig?.('PaywallView') != null;



// ── Step 0: Auth Gate ─────────────────────────────────────────────────────────
type AuthStage = 'email' | 'otp';

function AuthGateStep({ onAuthenticated }: { onAuthenticated: () => void }) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: c } = useTheme();
  const { sendOTP, verifyOTPAndLogin, operationLoading } = useAuth();
  const { showAlert } = useAlert();
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


// ── Paywall stage — dynamic RevenueCat paywall from `offerings.current` ──
// Renders RevenueCatUI.Paywall only when the native view exists AND the offering has
// packages. Otherwise (web preview, simulators, StoreKit/Play Billing not returning
// products, BILLING_UNAVAILABLE) shows a clean "Continue to App" screen — never a
// dead-end or a hardcoded price list. Closing the paywall lets the user in for free;
// premium features stay gated by their own in-app prompts.
function goToApp() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/(tabs)');
}

function PaywallStage() {
  const { offeringId } = useLocalSearchParams<{ offeringId?: string }>();
  const { offerings, isLoading, refetchOfferings } = useRCSubscription();
  const { restoreSubscription, isLoading: isRestoring } = useSubscription();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [nativeFailed, setNativeFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const handlePaywallLoadError = useCallback(() => setNativeFailed(true), []);

  const offering = offeringId
    ? offerings?.all?.[offeringId] ?? null
    : offerings?.current ?? null;
  const hasPackages = (offering?.availablePackages?.length ?? 0) > 0;

  const textColor = isDark ? '#FFFFFF' : '#2D1520';
  const subColor = isDark ? '#A096C0' : '#7A5A62';
  const accent = isDark ? '#C084FC' : '#C4707A';

  if (isLoading) {
    return (
      <View style={pu.centered}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[pu.sub, { color: subColor }]}>Loading plans…</Text>
      </View>
    );
  }

  if (HAS_NATIVE_PAYWALL && hasPackages && !nativeFailed) {
    return (
      <RevenueCatPaywall
        offeringId={offeringId}
        onDismiss={goToApp}
        onPurchaseSuccess={goToApp}
        onLoadError={handlePaywallLoadError}
      />
    );
  }

  return (
    <View testID="paywall-fallback-screen" style={[pu.centered, { paddingBottom: insets.bottom + 24 }]}>
      <Ionicons name="sparkles-outline" size={40} color={accent} />
      <Text style={[pu.title, { color: textColor }]}>Plans are unavailable right now</Text>
      <Text style={[pu.sub, { color: subColor }]}>
        We couldn&apos;t load subscription plans right now. You can keep using Hera and upgrade any time from your profile.
      </Text>
      <Pressable
        testID="paywall-fallback-continue-button"
        onPress={goToApp}
        style={({ pressed }) => [pu.primary, { backgroundColor: accent }, pressed && { opacity: 0.85 }]}
      >
        <Text style={pu.primaryText}>Continue to App</Text>
      </Pressable>
      <Pressable
        testID="paywall-fallback-retry-button"
        disabled={retrying}
        onPress={async () => {
          setRetrying(true);
          setNativeFailed(false);
          // Keep the spinner visible long enough to read as a real retry
          await Promise.all([refetchOfferings().catch(() => {}), new Promise(r => setTimeout(r, 900))]);
          setRetrying(false);
        }}
        style={({ pressed }) => [pu.secondary, pressed && { opacity: 0.7 }]}
      >
        {retrying ? <ActivityIndicator color={accent} /> : <Text style={[pu.secondaryText, { color: accent }]}>Try again</Text>}
      </Pressable>
      <Pressable testID="paywall-fallback-restore-button" disabled={isRestoring} onPress={restoreSubscription} style={({ pressed }) => [pu.secondary, pressed && { opacity: 0.7 }]}>
        <Text style={[pu.link, { color: subColor }]}>Restore purchases</Text>
      </Pressable>
    </View>
  );
}

const pu = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  primary: { marginTop: Spacing.md, minHeight: 52, alignSelf: 'stretch', maxWidth: 360, width: '100%', borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondary: { minHeight: 44, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  link: { fontSize: 13, textDecorationLine: 'underline' },
});

// ── Root Screen ───────────────────────────────────────────────────────────────
export default function SubscriptionScreen() {
  const { isSubscribed } = useSubscription();
  const { user: authUser } = useAuth();
  const { isDark } = useTheme();
  const [authed, setAuthed] = useState(!!authUser);

  useEffect(() => {
    if (isSubscribed) goToApp();
  }, [isSubscribed]);

  useEffect(() => {
    if (authUser) setAuthed(true);
  }, [authUser]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#080A18' : '#FDE8EA' }}>
      {authed ? <PaywallStage /> : <AuthGateStep onAuthenticated={() => setAuthed(true)} />}
    </View>
  );
}
