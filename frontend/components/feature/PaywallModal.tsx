import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

// ── Props ─────────────────────────────────────────────────────────────────────

interface PaywallModalProps {
  visible: boolean;
  feature: string;
  chatCount: number;
  chatLimit: number;
  onClose: () => void;
  onCheckout: () => void;
  onViewPlans: () => void;
}

const PREVIEW_FEATURES = [
  'Unlimited AI conversations daily',
  'Future Self deep coaching sessions',
  'Personalized manifestation plans',
  'Unlimited guided visualizations',
  'AI voice coach & meditation library',
];

// ── Component ─────────────────────────────────────────────────────────────────

export function PaywallModal({
  visible, feature, chatCount, chatLimit, onClose, onCheckout, onViewPlans,
}: PaywallModalProps) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const isChatLimit = feature.toLowerCase().includes('chat') || feature.toLowerCase().includes('ai');
  const icon: any = isChatLimit ? 'chatbubble-ellipses' : 'sparkles';
  const title = isChatLimit ? 'Daily Limit Reached' : 'Premium Feature';
  const description = isChatLimit
    ? `You have used all ${chatLimit} of your daily free AI conversations. Upgrade for unlimited guidance from Hera.`
    : `${feature} is a Hera Premium feature. Start your free trial to unlock it today.`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[st.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[st.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle */}
          <View style={st.handle} />

          {/* Icon */}
          <View style={st.iconWrap}>
            <LinearGradient
              colors={['#7C3AED', '#5B21B6', '#3B0764']}
              style={st.iconCircle}
            >
              <Ionicons name={icon} size={28} color={Colors.gold} />
            </LinearGradient>
            {isChatLimit && (
              <View style={st.countPill}>
                <Text style={st.countTxt}>{chatCount}/{chatLimit} used today</Text>
              </View>
            )}
          </View>

          <Text style={st.title}>{title}</Text>
          <Text style={st.desc}>{description}</Text>

          {/* Plan preview card */}
          <View style={st.planCard}>
            <LinearGradient
              colors={['rgba(212,175,55,0.14)', 'rgba(212,175,55,0.04)']}
              style={st.planInner}
            >
              <View style={st.planHeader}>
                <View style={st.planBadge}>
                  <Text style={st.planBadgeTxt}>🔥 Most Popular</Text>
                </View>
                <View style={st.planPriceRow}>
                  <Text style={st.planPrice}>$12.99</Text>
                  <Text style={st.planPeriod}>/month</Text>
                </View>
              </View>
              <View style={st.trialRow}>
                <Ionicons name="gift-outline" size={13} color={Colors.gold} />
                <Text style={st.trialTxt}>7-day free trial · No payment today</Text>
              </View>
              <View style={st.featureList}>
                {PREVIEW_FEATURES.map((f, i) => (
                  <View key={i} style={st.featureRow}>
                    <Ionicons name="checkmark-circle" size={15} color={Colors.gold} />
                    <Text style={st.featureTxt}>{f}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>

          {/* CTAs */}
          <Pressable
            onPress={onCheckout}
            style={({ pressed }) => [st.primaryWrap, pressed && { opacity: 0.88 }]}
          >
            <LinearGradient colors={['#D4AF37', '#B8960C']} style={st.primaryBtn}>
              <Ionicons name="sparkles" size={17} color="white" />
              <Text style={st.primaryTxt}>Start 7-Day Free Trial</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={onViewPlans}
            style={({ pressed }) => [st.secondaryBtn, pressed && { opacity: 0.72 }]}
          >
            <Text style={st.secondaryTxt}>View All Plans</Text>
          </Pressable>

          <Pressable onPress={onClose} hitSlop={12} style={st.notNowBtn}>
            <Text style={st.notNowTxt}>Not now</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#110A2A',
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(212,175,55,0.22)',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  handle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginBottom: Spacing.sm,
  },
  iconWrap: { alignItems: 'center', gap: Spacing.sm },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.gold,
  },
  countPill: {
    backgroundColor: 'rgba(212,175,55,0.14)',
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
  },
  countTxt: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: '600' },
  title: { fontSize: FontSize.xl, color: Colors.textWhite, fontWeight: '700', textAlign: 'center' },
  desc: {
    fontSize: FontSize.sm, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 21, paddingHorizontal: Spacing.sm,
  },

  planCard: {
    borderRadius: Radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.38)',
  },
  planInner: { padding: Spacing.lg, gap: Spacing.md },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planBadge: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
  },
  planBadgeTxt: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: '700' },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planPrice: { fontSize: FontSize.xl, color: Colors.textWhite, fontWeight: '800' },
  planPeriod: { fontSize: FontSize.sm, color: Colors.textMuted },
  trialRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trialTxt: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: '500' },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureTxt: { fontSize: FontSize.sm, color: Colors.textMuted, flex: 1 },

  primaryWrap: { borderRadius: Radius.xl, overflow: 'hidden' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 17,
  },
  primaryTxt: { fontSize: FontSize.base, color: 'white', fontWeight: '700' },

  secondaryBtn: {
    alignItems: 'center', paddingVertical: 14,
    borderRadius: Radius.xl, borderWidth: 1,
    borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg,
  },
  secondaryTxt: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },

  notNowBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  notNowTxt: { fontSize: FontSize.sm, color: Colors.textSubtle },
});
