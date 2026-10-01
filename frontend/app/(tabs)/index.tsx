import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS } from 'react-native-reanimated';
import { useHera } from '@/hooks/useHera';
import { useTheme } from '@/hooks/useTheme';
import { useAuth, useAlert } from '@/template';
import { pickAvatarImage, uploadAvatar, loadCachedAvatarUrl } from '@/services/avatarService';
import { Spacing, Radius, FontSize, ThemeColors } from '@/constants/theme';

const TRENDING_ITEMS = [
  'him obsessed with me',
  '$10k weeks',
  'Euro summer vacation',
  'dream body glow up',
  'true love finds me',
  'financial freedom',
  'dream apartment',
  'get promoted',
  '5AM morning routine',
  'abundance mindset',
];

// ── Dynamic styles factory ────────────────────────────────────────────────────
const createStyles = (c: ThemeColors, isDark: boolean) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: c.background },
  scroll: { gap: 0 },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.md,
  },
  // flexShrink: 0 prevents "HERA" from being squeezed by action buttons
  appName: { fontSize: 22, color: c.textWhite, fontWeight: '800', letterSpacing: 3, flexShrink: 0 },
  topActions: { flexDirection: 'row', gap: Spacing.sm, flexShrink: 0 },
  topBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(168,85,247,0.3)' : 'rgba(0,0,0,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Orb
  orbWrap: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md, position: 'relative', height: 165,
    backgroundColor: 'transparent',
  },
  orbGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  orbInner: { position: 'relative', width: 160, height: 160, zIndex: 1, backgroundColor: 'transparent', borderWidth: 0 },
  orb: { width: 160, height: 160, backgroundColor: 'transparent' },
  orbPhoto: { width: 160, height: 160, borderRadius: 80 },
  cameraBadge: {
    position: 'absolute', bottom: 6, right: 2, width: 30, height: 30, borderRadius: 15,
    backgroundColor: isDark ? '#14082E' : '#2D1520',
    borderWidth: 2,
    borderColor: isDark ? 'rgba(168,85,247,0.45)' : 'rgba(196,112,122,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Title section — split into two rows so the name wraps independently
  titleWrap: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: 2,
    // Ensure the block never exceeds screen width
    alignSelf: 'stretch',
  },
  // Name row: shrinks & wraps; max 2 lines with ellipsis for extreme cases
  manifestName: {
    fontSize: 30, color: c.textWhite, fontWeight: '700',
    textAlign: 'center', lineHeight: 38,
    flexShrink: 1, flexWrap: 'wrap',
  },
  // Fixed subtitle row — no dynamic content, always fits
  manifestSubtitle: {
    fontSize: 30, color: c.textWhite, fontWeight: '700',
    textAlign: 'center', lineHeight: 44,
  },
  manifestItalic: { fontStyle: 'italic', color: c.primaryLight, fontWeight: '700' },

  // Input capsule
  inputCapsule: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg,
    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
    borderRadius: 50, borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.07)',
    paddingLeft: Spacing.lg, paddingRight: 6, paddingVertical: 6,
    marginBottom: Spacing.md,
    shadowColor: isDark ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.07,
    shadowRadius: 10,
    elevation: isDark ? 0 : 3,
  },
  input: {
    flex: 1, fontSize: FontSize.base, color: c.textWhite,
    paddingVertical: Spacing.sm + 2, paddingRight: Spacing.sm,
  },
  submitBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: isDark ? '#14082E' : '#2D1520',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(168,85,247,0.55)' : 'rgba(196,112,122,0.45)',
  },

  // Trending
  trendingSection: { marginBottom: Spacing.xl },
  trendingLabel: {
    fontSize: FontSize.xs, color: c.textSubtle, fontWeight: '700',
    letterSpacing: 1.2, textAlign: 'center', marginBottom: Spacing.md,
  },
  chipsRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 3,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.09)',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)',
    shadowColor: isDark ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 4, elevation: isDark ? 0 : 2,
  },
  chipTxt: { fontSize: FontSize.sm, color: c.textMuted, fontWeight: '500' },

  // For You header
  forYouHeader: {
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.md,
  },
  forYouTitle: { fontSize: 30, color: c.textWhite, fontWeight: '700' },

  // Cards
  cardsWrap: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  card: {
    borderRadius: Radius.xl + 4, overflow: 'hidden', borderWidth: 1,
    borderColor: isDark ? 'rgba(168,85,247,0.22)' : 'rgba(196,112,122,0.18)',
    shadowColor: isDark ? 'transparent' : 'rgba(180,100,115,1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0 : 0.12,
    shadowRadius: 14, elevation: isDark ? 0 : 5,
  },
  cardGrad: { padding: Spacing.lg, gap: Spacing.sm, minHeight: 132, flex: 1 },
  cardCat: { fontSize: FontSize.xs, color: c.primary, fontWeight: '700', letterSpacing: 0.4 },
  cardTitle: { fontSize: FontSize.md, color: c.textWhite, fontWeight: '600', lineHeight: 26, flex: 1, flexShrink: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  cardAction: {
    fontSize: FontSize.xs, fontWeight: '600',
    color: isDark ? 'rgba(255,255,255,0.48)' : 'rgba(26,10,20,0.4)',
  },
});

// ── Toast static styles ───────────────────────────────────────────────────────
const toastStyle = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(168,85,247,0.3)',
    marginHorizontal: 2,
  },
  txt: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors: c, isDark } = useTheme();
  const {
    user, dailyAffirmation, favoriteAffirmations,
    toggleFavoriteAffirmation, visionItems, isAuthenticated,
  } = useHera();
  const { user: authUser } = useAuth();
  const { showAlert } = useAlert();

  // Toast animation shared values
  const toastX = useSharedValue(200);
  const toastOpacity = useSharedValue(0);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    toastX.value = 200;
    toastOpacity.value = 0;
    toastX.value = withTiming(0, { duration: 320 });
    toastOpacity.value = withSequence(
      withTiming(1, { duration: 280 }),
      withDelay(1800, withTiming(0, { duration: 320 }, (finished) => {
        if (finished) runOnJS(setToastVisible)(false);
      }))
    );
  }, []);

  const handleToggleFavorite = useCallback((aff: string) => {
    if (!isAuthenticated) {
      showAlert(
        'Login Required',
        'Please login first to save your favorite affirmations.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') },
        ],
      );
      return;
    }
    const willSave = !favoriteAffirmations.includes(aff);
    toggleFavoriteAffirmation(aff);
    if (willSave) showToast('Daily Affirmation Saved');
  }, [isAuthenticated, favoriteAffirmations, toggleFavoriteAffirmation, showAlert, router, showToast]);

  const [manifestInput, setManifestInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('Daily Affirmation Saved');


  const toastAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: toastX.value }],
    opacity: toastOpacity.value,
  }));

  const s = useMemo(() => createStyles(c, isDark), [c, isDark]);

  // Load cached avatar on mount
  useEffect(() => {
    loadCachedAvatarUrl().then(url => { if (url) setAvatarUrl(url); }).catch(() => {});
  }, []);

  const screenOpacity = useSharedValue(0);
  const screenSlide = useSharedValue(10);

  // Re-sync avatar each time this tab is focused (picks up changes from profile screen)
  useFocusEffect(
    useCallback(() => {
      screenOpacity.value = 0;
      screenSlide.value = 10;
      screenOpacity.value = withTiming(1, { duration: 280 });
      screenSlide.value = withTiming(0, { duration: 280 });
      loadCachedAvatarUrl().then(url => setAvatarUrl(url ?? null)).catch(() => {});
    }, [])
  );

  const screenAnimStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: screenSlide.value }],
  }));

  const handlePickAvatar = useCallback(async () => {
    if (!authUser?.id) {
      showAlert('Sign In Required', 'Please sign in to upload a custom photo.');
      return;
    }
    const localUri = await pickAvatarImage();
    if (!localUri) return;
    setAvatarUploading(true);
    try {
      const publicUrl = await uploadAvatar(localUri, authUser.id);
      setAvatarUrl(publicUrl);
    } catch (e: any) {
      showAlert('Upload Failed', e.message || 'Could not upload photo. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  }, [authUser, showAlert]);

  const rawName = user.name.trim() || 'Beautiful Soul';
  // Cap display name at 28 chars so very long names never break the title layout
  const displayName = rawName.length > 28
    ? rawName.slice(0, 28).trimEnd() + '\u2026'
    : rawName;

  const isFav = favoriteAffirmations.includes(dailyAffirmation);

  // ── Theme-adaptive values ──────────────────────────────────────────────────
  const bgColors = isDark
    ? (['#080A18', '#0D1035', '#131838'] as const)
    : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);

  const orbGlowColor = isDark ? 'rgba(140,60,220,0.28)' : 'rgba(212,140,40,0.2)';

  const forYouGradients: [string, string][] = isDark ? [
    ['rgba(168,85,247,0.32)', 'rgba(109,40,217,0.14)'],
    ['rgba(236,72,153,0.28)', 'rgba(168,85,247,0.12)'],
    ['rgba(109,40,217,0.28)', 'rgba(236,72,153,0.1)'],
  ] : [
    ['rgba(255,255,255,0.92)', 'rgba(255,238,241,0.78)'],
    ['rgba(255,255,255,0.88)', 'rgba(255,232,237,0.72)'],
    ['rgba(255,255,255,0.9)',  'rgba(255,235,240,0.75)'],
  ];

  const handleSubmit = () => {
    if (!manifestInput.trim()) return;
    router.push({
      pathname: '/(tabs)/chat',
      params: { initialMessage: manifestInput.trim(), msgTimestamp: Date.now().toString() },
    });
    setManifestInput('');
  };

  const forYouCards = useMemo(() => [
    {
      id: 'affirmation',
      category: '✨  Daily Affirmation',
      title: dailyAffirmation,
      gradientIndex: 0,
      action: () => router.push('/(tabs)/discover'),
      actionLabel: 'Explore More',
    },
    {
      id: 'vision',
      category: '🔮  Vision Board',
      title: visionItems[0]?.title
        ? `"${visionItems[0].title}" — ${visionItems[0].progress}% manifested`
        : 'Add your first dream to your vision board',
      gradientIndex: 1,
      action: () => router.push('/(tabs)/vision'),
      actionLabel: 'View Board',
    },
    {
      id: 'chat',
      category: '💜  Chat with Hera',
      title: 'Your AI coach is ready. Share what you want to manifest today.',
      gradientIndex: 2,
      action: () => router.push('/(tabs)/chat'),
      actionLabel: 'Start Chat',
    },
  ], [dailyAffirmation, visionItems]);

  return (
    <Animated.View style={[s.root, screenAnimStyle]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* ── Saved Toast ───────────────────────────────────────── */}
      {toastVisible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            toastStyle.wrap,
            { top: insets.top + 56 },
            toastAnimStyle,
            {
              backgroundColor: isDark
                ? 'rgba(30,20,50,0.96)'
                : 'rgba(255,255,255,0.97)',
              borderColor: isDark
                ? 'rgba(236,72,153,0.45)'
                : 'rgba(196,112,122,0.4)',
            },
          ]}
        >
          <Ionicons name="heart" size={14} color={isDark ? '#EC4899' : '#C4707A'} />
          <View style={toastStyle.divider} />
          <Text style={[toastStyle.txt, { color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(26,10,20,0.85)' }]}>
            {toastMsg}
          </Text>
          <Ionicons name="checkmark-circle" size={14} color={isDark ? '#A855F7' : '#9333EA'} />
        </Animated.View>
      ) : null}


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 130 },
        ]}
      >
        {/* ── Top bar ──────────────────────────────────────────── */}
        <View style={s.topBar}>
          <Text style={s.appName}>HERA</Text>
          <View style={s.topActions}>
            <Pressable
              onPress={() => handleToggleFavorite(dailyAffirmation)}
              style={[
                s.topBtn,
                isFav && {
                  backgroundColor: isDark ? 'rgba(236,72,153,0.15)' : 'rgba(196,112,122,0.12)',
                  borderColor: isDark ? 'rgba(236,72,153,0.3)' : 'rgba(196,112,122,0.3)',
                },
              ]}
              hitSlop={10}
            >
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={18}
                color={isFav ? c.primary : c.textMuted}
              />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/chat')} style={s.topBtn} hitSlop={10}>
              <Ionicons name="time-outline" size={18} color={c.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* ── Orb / Avatar ─────────────────────────────────────── */}
        <View style={s.orbWrap}>
          <View style={[s.orbGlow, { backgroundColor: orbGlowColor }]} />
          <View style={s.orbInner}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={s.orbPhoto}
                contentFit="cover"
                contentPosition="center"
                transition={300}
              />
            ) : (
              <Image
                source={
                  isDark
                    ? require('@/assets/images/hera-orb.png')
                    : require('@/assets/images/hera-orb-light.png')
                }
                style={s.orb}
                contentFit="contain"
                contentPosition="center"
                transition={400}
              />
            )}
            <Pressable
              onPress={handlePickAvatar}
              disabled={avatarUploading}
              style={({ pressed }) => [s.cameraBadge, pressed && { opacity: 0.7 }]}
              hitSlop={8}
              accessibilityLabel="Upload profile photo"
            >
              {avatarUploading
                ? <ActivityIndicator size={11} color="white" />
                : <Ionicons name="camera" size={13} color="white" />}
            </Pressable>
          </View>
        </View>

        {/* ── Manifest title ──────────────────────────────────── */}
        {/*
          Split into two rows so the dynamic name and the fixed subtitle
          wrap and constrain independently — prevents horizontal overflow
          when the user has a long name.
        */}
        <View style={s.titleWrap}>
          {/* Name row: up to 2 lines, truncates with ellipsis beyond that */}
          <Text style={s.manifestName} numberOfLines={2} ellipsizeMode="tail">
            {displayName},
          </Text>
          {/* Static subtitle: never overflows */}
          <Text style={s.manifestSubtitle}>
            {'what do you want to '}
            <Text style={s.manifestItalic}>manifest?</Text>
          </Text>
        </View>

        {/* ── Input capsule ────────────────────────────────────── */}
        <View style={s.inputCapsule}>
          <TextInput
            value={manifestInput}
            onChangeText={setManifestInput}
            placeholder="him obsessed with me..."
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.22)' : 'rgba(26,10,20,0.3)'}
            style={s.input}
            onSubmitEditing={handleSubmit}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.78 }]}
          >
            <Ionicons name="arrow-up" size={20} color="white" />
          </Pressable>
        </View>

        {/* ── Trending ─────────────────────────────────────────── */}
        <View style={s.trendingSection}>
          <Text style={s.trendingLabel}>🔥  TRENDING MANIFESTATIONS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipsRow}
          >
            {TRENDING_ITEMS.map((item, i) => (
              <Pressable
                key={i}
                onPress={() => setManifestInput(item)}
                style={({ pressed }) => [s.chip, pressed && { opacity: 0.72 }]}
              >
                <Text style={s.chipTxt}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── For You header ───────────────────────────────────── */}
        <View style={s.forYouHeader}>
          <Text style={s.forYouTitle}>For you</Text>
        </View>

        {/* ── For You cards ────────────────────────────────────── */}
        <View style={s.cardsWrap}>
          {forYouCards.map(card => (
            <Pressable
              key={card.id}
              onPress={card.action}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.86 }]}
            >
              <LinearGradient
                colors={forYouGradients[card.gradientIndex]}
                style={s.cardGrad}
              >
                <Text style={s.cardCat}>{card.category}</Text>
                <Text style={s.cardTitle} numberOfLines={3}>{card.title}</Text>
                <View style={s.cardFooter}>
                  <Text style={s.cardAction}>{card.actionLabel}</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={13}
                    color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(26,10,20,0.35)'}
                  />
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
}
