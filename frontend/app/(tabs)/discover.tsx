import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius, FontSize, ThemeColors } from '@/constants/theme';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { DISCOVER_CONTENT, AFFIRMATIONS_BY_CATEGORY, DAILY_AFFIRMATIONS } from '@/services/heraAI';
import { useHera } from '@/hooks/useHera';
import { useAlert } from '@/template';
import { AffirmationCard } from '@/components/feature/AffirmationCard';
import { AudioAffirmationPlayer } from '@/components/feature/AudioAffirmationPlayer';

const TABS = ['Manifestation', 'Mindset', 'Meditations', 'Affirmations', 'Challenges'];
const TYPE_ICONS: Record<string, any> = {
  article: 'document-text', lesson: 'school', meditation: 'leaf', visualization: 'eye', challenge: 'flame',
};
const TAB_AFFIRMATIONS: Record<string, string[]> = {
  Manifestation: [...AFFIRMATIONS_BY_CATEGORY.wealth, ...AFFIRMATIONS_BY_CATEGORY.happiness],
  Mindset: [...AFFIRMATIONS_BY_CATEGORY.confidence, ...AFFIRMATIONS_BY_CATEGORY.productivity],
  Meditations: DAILY_AFFIRMATIONS,
  Affirmations: DAILY_AFFIRMATIONS,
  Challenges: [...AFFIRMATIONS_BY_CATEGORY.career, ...AFFIRMATIONS_BY_CATEGORY.productivity],
};
const TAB_ACCENT: Record<string, string> = {
  Manifestation: '#F472B6', Mindset: '#C084FC', Meditations: '#34D399', Affirmations: '#F472B6', Challenges: '#FBBF24',
};
const AFF_CAT_COLOR: Record<string, string> = {
  career: '#FBBF24', wealth: '#F472B6', confidence: '#C084FC', love: '#EC4899',
  health: '#34D399', family: '#06B6D4', business: '#A855F7', productivity: '#FBBF24', happiness: '#F472B6',
};

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: c.background },
  scroll:        { flex: 1 },
  content:       { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  title:         { fontSize: FontSize.xxl, color: c.textWhite, fontWeight: '700' },
  subtitle:      { fontSize: FontSize.sm, color: c.textMuted, marginTop: 2 },
  playerSection: { gap: Spacing.sm },
  playerHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionLabel:  { fontSize: FontSize.xs, color: c.textSubtle, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  collapseBtn:   { padding: Spacing.sm, borderRadius: Radius.full, backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.border },
  collapsedPlayer: { borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  collapsedGrad: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  featuredCard:  { borderRadius: Radius.xl, overflow: 'hidden', height: 200 },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, gap: 5 },
  featuredBadge: { alignSelf: 'flex-start', backgroundColor: c.glassGold, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: c.borderGold },
  featuredBadgeTxt: { fontSize: FontSize.xs, color: c.gold, fontWeight: '700', letterSpacing: 1.2 },
  featuredTitle: { fontSize: FontSize.lg, color: '#FFFFFF', fontWeight: '700' },
  featuredSub:   { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)' },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:      { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)' },
  tabsRow:       { gap: Spacing.sm },
  tabChip:       { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, borderRadius: Radius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.glassBg },
  tabText:       { fontSize: FontSize.sm, color: c.textMuted, fontWeight: '500' },
  section:       { gap: Spacing.md },
  affCatRow:     { gap: Spacing.sm },
  contentCard:   { flexDirection: 'row', backgroundColor: c.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  contentImg:    { width: 90, height: 90 },
  contentInfo:   { flex: 1, padding: Spacing.sm, gap: 4, justifyContent: 'center' },
  contentMeta:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.glassPurple, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  typeText:      { fontSize: FontSize.xs - 1, color: c.primaryLight, fontWeight: '600', textTransform: 'capitalize' },
  contentTitle:  { fontSize: FontSize.base, color: c.textWhite, fontWeight: '600', lineHeight: 22 },
  contentDesc:   { fontSize: FontSize.sm, color: c.textMuted },
  durationRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText:  { fontSize: FontSize.xs, color: c.textMuted },
});

const DISCOVER_FALLBACK_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';

function FallbackImage({
  uri, style, contentFit = 'cover', transition = 200,
}: { uri: string; style: any; contentFit?: 'cover' | 'contain'; transition?: number }) {
  const [error, setError] = useState(false);
  return (
    <Image
      source={{ uri: error || !uri ? DISCOVER_FALLBACK_IMG : uri }}
      style={style}
      contentFit={contentFit}
      transition={transition}
      onError={() => setError(true)}
    />
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const { favoriteAffirmations, toggleFavoriteAffirmation, isAuthenticated } = useHera();
  const { showAlert } = useAlert();

  const handleToggleFavorite = useCallback((aff: string) => {
    if (!isAuthenticated) {
      showAlert(
        'Login Required',
        'Please login first to save your favorite affirmations.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login',
            onPress: () => router.push('/login'),
          },
        ],
      );
      return;
    }
    toggleFavoriteAffirmation(aff);
  }, [isAuthenticated, toggleFavoriteAffirmation, showAlert, router]);
  const [tab, setTab] = useState('Manifestation');
  const [affCat, setAffCat] = useState('confidence');
  const [playerExpanded, setPlayerExpanded] = useState(true);

  const screenOpacity = useSharedValue(0);
  const screenSlide = useSharedValue(10);
  useFocusEffect(
    useCallback(() => {
      screenOpacity.value = 0;
      screenSlide.value = 10;
      screenOpacity.value = withTiming(1, { duration: 280 });
      screenSlide.value = withTiming(0, { duration: 280 });
    }, [])
  );
  const screenAnimStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: screenSlide.value }],
  }));

  const getContent = () => {
    if (tab === 'Manifestation') return DISCOVER_CONTENT.manifestation;
    if (tab === 'Mindset') return DISCOVER_CONTENT.mindset;
    if (tab === 'Meditations') return DISCOVER_CONTENT.meditations;
    if (tab === 'Challenges') return DISCOVER_CONTENT.challenges;
    return [];
  };

  const currentAccent = TAB_ACCENT[tab] ?? c.gold;
  const bgColors = isDark ? (['#080A18', '#0F1025', '#131838'] as const) : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);

  return (
    <Animated.View style={[s.container, screenAnimStyle]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={s.title}>Discover</Text>
          <Text style={s.subtitle}>Expand your mind, elevate your life</Text>
        </View>

        {/* Audio Player */}
        <View style={s.playerSection}>
          <View style={s.playerHeader}>
            <View style={s.playerTitleRow}>
              <Ionicons name="headset" size={16} color={currentAccent} />
              <Text style={s.sectionLabel}>Affirmation Audio</Text>
            </View>
            <Pressable onPress={() => setPlayerExpanded(p => !p)} hitSlop={10} style={s.collapseBtn}>
              <Ionicons name={playerExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={c.textSubtle} />
            </Pressable>
          </View>
          {playerExpanded ? (
            <AudioAffirmationPlayer affirmations={TAB_AFFIRMATIONS[tab] ?? DAILY_AFFIRMATIONS} categoryLabel={tab} accentColor={currentAccent} />
          ) : (
            <Pressable onPress={() => setPlayerExpanded(true)} style={({ pressed }) => [s.collapsedPlayer, pressed && { opacity: 0.8 }]}>
              <LinearGradient colors={[currentAccent + '18', 'rgba(255,255,255,0.02)']} style={s.collapsedGrad}>
                <Ionicons name="play-circle" size={22} color={currentAccent} />
                <Text style={[{ flex: 1, fontSize: FontSize.sm, fontWeight: '600' }, { color: currentAccent }]}>Tap to open affirmation player</Text>
                <Ionicons name="chevron-down" size={15} color={c.textSubtle} />
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Featured Hero */}
        <Pressable
          style={({ pressed }) => [s.featuredCard, pressed && { opacity: 0.92 }]}
          onPress={() => router.push({ pathname: '/discover-detail', params: { id: 'featured', title: DISCOVER_CONTENT.featured.title, duration: DISCOVER_CONTENT.featured.duration, description: DISCOVER_CONTENT.featured.subtitle, type: 'article', imageUrl: DISCOVER_CONTENT.featured.imageUrl, tab: DISCOVER_CONTENT.featured.category } })}
        >
          <FallbackImage uri={DISCOVER_CONTENT.featured.imageUrl} style={s.featuredImage} contentFit="cover" transition={300} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.92)']} style={s.featuredOverlay}>
            <View style={s.featuredBadge}><Text style={s.featuredBadgeTxt}>✦ FEATURED</Text></View>
            <Text style={s.featuredTitle}>{DISCOVER_CONTENT.featured.title}</Text>
            <Text style={s.featuredSub}>{DISCOVER_CONTENT.featured.subtitle}</Text>
            <View style={s.metaRow}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={s.metaText}>{DISCOVER_CONTENT.featured.duration}</Text>
              <Text style={s.metaText}>•</Text>
              <Text style={s.metaText}>{DISCOVER_CONTENT.featured.category}</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {TABS.map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={[s.tabChip, tab === t && { borderColor: TAB_ACCENT[t], backgroundColor: TAB_ACCENT[t] + '1A' }]}>
              <Text style={[s.tabText, tab === t && { color: TAB_ACCENT[t], fontWeight: '600' }]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Content */}
        {tab === 'Affirmations' ? (
          <View style={s.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.affCatRow}>
              {Object.keys(AFFIRMATIONS_BY_CATEGORY).map(cc => (
                <Pressable key={cc} onPress={() => setAffCat(cc)} style={[s.tabChip, affCat === cc && { borderColor: AFF_CAT_COLOR[cc] ?? c.gold, backgroundColor: (AFF_CAT_COLOR[cc] ?? c.gold) + '1A' }]}>
                  <Text style={[s.tabText, affCat === cc && { color: AFF_CAT_COLOR[cc] ?? c.gold, fontWeight: '600' }]}>{cc.charAt(0).toUpperCase() + cc.slice(1)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {(AFFIRMATIONS_BY_CATEGORY[affCat] || []).map((aff, i) => (
              <AffirmationCard key={i} affirmation={aff} isFavorite={favoriteAffirmations.includes(aff)} onToggleFavorite={() => handleToggleFavorite(aff)} category={affCat} />
            ))}
          </View>
        ) : (
          <View style={s.section}>
            {getContent().map((item: any) => (
              <Pressable key={item.id} style={({ pressed }) => [s.contentCard, pressed && { opacity: 0.88 }]} onPress={() => router.push({ pathname: '/discover-detail', params: { id: item.id, title: item.title, duration: item.duration, description: item.description, type: item.type, imageUrl: item.imageUrl ?? DISCOVER_FALLBACK_IMG, tab } })}>
                <FallbackImage uri={item.imageUrl} style={s.contentImg} contentFit="cover" transition={200} />
                <View style={s.contentInfo}>
                  <View style={s.contentMeta}>
                    <View style={s.typeBadge}>
                      <Ionicons name={TYPE_ICONS[item.type] || 'document-text'} size={10} color={c.primaryLight} />
                      <Text style={s.typeText}>{item.type}</Text>
                    </View>
                    {item.participants ? <Text style={{ fontSize: FontSize.xs, color: c.gold, fontWeight: '500' }}>{item.participants} joined</Text> : null}
                  </View>
                  <Text style={s.contentTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={s.contentDesc} numberOfLines={1}>{item.description}</Text>
                  <View style={s.durationRow}>
                    <Ionicons name="time-outline" size={11} color={c.textMuted} />
                    <Text style={s.durationText}>{item.duration}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}
