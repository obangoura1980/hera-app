/**
 * app/discover-detail.tsx — Immersive article / lesson reader for Hera Discover
 * Theme-aware: respects active Light / Dark theme via useTheme()
 */
import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Spacing, Radius, FontSize, ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getArticleBody, type ContentSection } from '@/services/discoverContent';

const { width: SW } = Dimensions.get('window');
const IMG_HEIGHT = 300;
const HERO_FALLBACK = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

// ── Type accent color (static — doesn't change with theme) ───────────────────

const TYPE_COLOR_DARK: Record<string, string> = {
  article:       '#C084FC',
  lesson:        '#F472B6',
  meditation:    '#34D399',
  visualization: '#C084FC',
  challenge:     '#FBBF24',
};
const TYPE_COLOR_LIGHT: Record<string, string> = {
  article:       '#A85560',
  lesson:        '#C4707A',
  meditation:    '#0F9B72',
  visualization: '#7C3AED',
  challenge:     '#D97706',
};

const TYPE_ICON: Record<string, string> = {
  article:       'document-text',
  lesson:        'school',
  meditation:    'leaf',
  visualization: 'eye',
  challenge:     'flame',
};

// ── Dynamic style factory ─────────────────────────────────────────────────────

function createStyles(c: ThemeColors, isDark: boolean) {
  const bgGradient: [string, string, string] = isDark
    ? ['#0F172A', '#1E0A3C', '#0F172A']
    : ['#FDE8EA', '#F9D5D9', '#FDE8EA'];

  const heroGradient: [string, string, string] = isDark
    ? ['rgba(15,23,42,0.1)', 'rgba(15,23,42,0.92)', '#0F172A']
    : ['rgba(253,232,234,0.05)', 'rgba(253,232,234,0.88)', '#FDE8EA'];

  const heroLocations: [number, number, number] = [0.35, 0.78, 1];

  const quoteGradient: [string, string] = isDark
    ? ['rgba(212,175,55,0.12)', 'rgba(91,33,182,0.08)']
    : ['rgba(196,112,122,0.10)', 'rgba(196,112,122,0.04)'];

  const takeawayGradient: [string, string] = isDark
    ? ['rgba(212,175,55,0.14)', 'rgba(91,33,182,0.10)']
    : ['rgba(196,112,122,0.12)', 'rgba(196,112,122,0.05)'];

  return {
    bgGradient,
    heroGradient,
    heroLocations,
    quoteGradient,
    takeawayGradient,

    s: StyleSheet.create({
      container: { flex: 1, backgroundColor: c.background },

      backBtn: {
        position: 'absolute',
        left: Spacing.lg,
        zIndex: 100,
      },
      backBtnInner: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: isDark ? 'rgba(15,23,42,0.65)' : 'rgba(253,232,234,0.75)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
      },

      // Hero
      heroWrap: { height: IMG_HEIGHT, width: '100%' },
      heroImg: { width: '100%', height: '100%' },
      heroMeta: {
        position: 'absolute',
        bottom: Spacing.lg,
        left: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
      },
      typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: Radius.full,
        borderWidth: 1,
      },
      typeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
      durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: Radius.full,
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
      },
      durationText: { fontSize: FontSize.xs, color: c.textMuted },

      // Header section
      headerSection: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        gap: Spacing.md,
      },
      catChip: {
        alignSelf: 'flex-start',
        backgroundColor: c.glassPurple,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: Spacing.md,
        paddingVertical: 4,
      },
      catText: { fontSize: FontSize.xs, color: c.primaryLight, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },

      title: {
        fontSize: FontSize.xxl,
        color: c.textWhite,
        fontWeight: '800',
        lineHeight: 36,
        letterSpacing: -0.3,
      },
      description: {
        fontSize: FontSize.base,
        color: c.textMuted,
        lineHeight: 24,
      },

      authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
      },
      authorAvatar: { width: 32, height: 32 },
      authorName: { fontSize: FontSize.sm, color: c.textWhite, fontWeight: '600' },
      authorSub: { fontSize: FontSize.xs, color: c.textSubtle },
      dividerDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: c.textSubtle,
        marginHorizontal: 2,
      },
      durationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: c.glassGold,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: c.borderGold,
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 3,
      },
      durationChipText: { fontSize: FontSize.xs, color: c.gold, fontWeight: '600' },

      separator: {
        height: 1,
        backgroundColor: c.glassBorder,
        marginTop: Spacing.sm,
      },

      // Body
      bodySection: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        gap: Spacing.xl,
      },
      intro: {
        fontSize: FontSize.md,
        color: c.textWhite,
        lineHeight: 28,
        fontWeight: '500',
        fontStyle: 'italic',
      },
      sections: { gap: Spacing.lg },

      // Takeaway
      takeawayCard: {
        borderRadius: Radius.xl,
        borderWidth: 1.5,
        borderColor: c.borderGold,
        padding: Spacing.lg,
        gap: Spacing.sm,
        overflow: 'hidden',
      },
      takeawayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
      },
      takeawayLabel: {
        fontSize: FontSize.xs,
        color: c.gold,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
      },
      takeawayText: {
        fontSize: FontSize.base,
        color: c.textWhite,
        lineHeight: 26,
        fontStyle: 'italic',
        fontWeight: '500',
      },

      // No-content fallback
      noContentCard: {
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: c.glassBg,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: c.glassBorder,
        padding: Spacing.xl,
      },
      noContentTitle: { fontSize: FontSize.base, color: c.textMuted, fontWeight: '600' },
      noContentSub: {
        fontSize: FontSize.sm,
        color: c.textSubtle,
        textAlign: 'center',
        lineHeight: 20,
      },

      // Footer
      footer: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        alignItems: 'center',
      },
      backBtnFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.full,
        backgroundColor: c.glassBg,
        borderWidth: 1,
        borderColor: c.glassBorder,
      },
      backBtnFooterText: { fontSize: FontSize.sm, color: c.textMuted, fontWeight: '500' },
    }),

    // Section-specific styles
    r: StyleSheet.create({
      headingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
      },
      headingBar: {
        width: 3,
        height: 20,
        borderRadius: 2,
        backgroundColor: c.gold,
      },
      headingText: {
        fontSize: FontSize.lg,
        color: c.textWhite,
        fontWeight: '700',
        flex: 1,
      },

      paragraphText: {
        fontSize: FontSize.base,
        color: c.textMuted,
        lineHeight: 27,
      },

      quoteCard: {
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: c.borderGold,
        padding: Spacing.lg,
        gap: Spacing.sm,
        overflow: 'hidden',
      },
      quoteMark: {
        fontSize: 44,
        color: c.gold,
        lineHeight: 36,
        fontWeight: '800',
        marginBottom: -8,
      },
      quoteText: {
        fontSize: FontSize.base,
        color: c.textWhite,
        lineHeight: 26,
        fontStyle: 'italic',
        fontWeight: '500',
      },

      bulletList: { gap: Spacing.sm, paddingLeft: Spacing.sm },
      bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
      },
      bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: c.gold,
        marginTop: 9,
        flexShrink: 0,
      },
      bulletText: {
        flex: 1,
        fontSize: FontSize.base,
        color: c.textMuted,
        lineHeight: 26,
      },

      stepCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        backgroundColor: c.glassBg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: c.glassBorder,
        padding: Spacing.md,
      },
      stepNum: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      },
      stepNumTxt: {
        fontSize: FontSize.sm,
        color: 'white',
        fontWeight: '800',
      },
      stepTitle: {
        fontSize: FontSize.sm,
        color: c.gold,
        fontWeight: '700',
        lineHeight: 20,
      },
      stepBody: {
        fontSize: FontSize.sm,
        color: c.textMuted,
        lineHeight: 22,
      },
    }),
  };
}

// ── Section renderers — receive theme styles as props ─────────────────────────

function SectionHeading({ text, r }: { text: string; r: ReturnType<typeof createStyles>['r'] }) {
  return (
    <View style={r.headingRow}>
      <View style={r.headingBar} />
      <Text style={r.headingText}>{text}</Text>
    </View>
  );
}

function SectionParagraph({ text, r }: { text: string; r: ReturnType<typeof createStyles>['r'] }) {
  return <Text style={r.paragraphText}>{text}</Text>;
}

function SectionQuote({ text, r, quoteGradient }: { text: string; r: ReturnType<typeof createStyles>['r']; quoteGradient: [string, string] }) {
  return (
    <View style={r.quoteCard}>
      <LinearGradient colors={quoteGradient} style={StyleSheet.absoluteFill} />
      <Text style={r.quoteMark}>"</Text>
      <Text style={r.quoteText}>{text}</Text>
    </View>
  );
}

function SectionBullet({ items, r }: { items: string[]; r: ReturnType<typeof createStyles>['r'] }) {
  return (
    <View style={r.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={r.bulletRow}>
          <View style={r.bulletDot} />
          <Text style={r.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionStep({ number, text, r, isDark }: { number: number; text: string; r: ReturnType<typeof createStyles>['r']; isDark: boolean }) {
  const [title, ...rest] = text.split(' — ');
  const body = rest.join(' — ');
  const stepColors: [string, string] = isDark ? ['#7C3AED', '#5B21B6'] : ['#C4707A', '#A85560'];
  return (
    <View style={r.stepCard}>
      <LinearGradient colors={stepColors} style={r.stepNum}>
        <Text style={r.stepNumTxt}>{number}</Text>
      </LinearGradient>
      <View style={{ flex: 1, gap: 4 }}>
        {body ? (
          <>
            <Text style={r.stepTitle}>{title}</Text>
            <Text style={r.stepBody}>{body}</Text>
          </>
        ) : (
          <Text style={r.stepBody}>{title}</Text>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DiscoverDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();

  // Memoize theme-derived styles so they only recalculate on theme change
  const { s, r, bgGradient, heroGradient, heroLocations, quoteGradient, takeawayGradient } =
    useMemo(() => createStyles(c, isDark), [c, isDark]);

  const {
    id,
    title,
    duration,
    description,
    type,
    imageUrl,
    tab,
  } = useLocalSearchParams<{
    id: string;
    title: string;
    duration: string;
    description: string;
    type: string;
    imageUrl: string;
    tab: string;
  }>();

  const body = getArticleBody(id ?? '');
  const typeColorMap = isDark ? TYPE_COLOR_DARK : TYPE_COLOR_LIGHT;
  const accent = typeColorMap[type ?? 'article'] ?? c.primaryLight;
  const typeIcon = TYPE_ICON[type ?? 'article'] ?? 'document-text';
  const [heroImgError, setHeroImgError] = React.useState(false);
  const heroImgUri = heroImgError || !imageUrl ? HERO_FALLBACK : imageUrl;

  const typeLabel =
    type === 'article'       ? 'Article'       :
    type === 'lesson'        ? 'Lesson'         :
    type === 'meditation'    ? 'Meditation'     :
    type === 'visualization' ? 'Visualization'  :
    type === 'challenge'     ? 'Challenge'      :
    type ?? 'Article';

  const backIconColor = isDark ? '#FFFFFF' : c.textWhite;

  function renderSection(section: ContentSection, index: number) {
    switch (section.type) {
      case 'heading':
        return <SectionHeading key={index} text={section.text ?? ''} r={r} />;
      case 'paragraph':
        return <SectionParagraph key={index} text={section.text ?? ''} r={r} />;
      case 'quote':
        return <SectionQuote key={index} text={section.text ?? ''} r={r} quoteGradient={quoteGradient} />;
      case 'bullet':
        return <SectionBullet key={index} items={section.items ?? []} r={r} />;
      case 'step':
        return <SectionStep key={index} number={section.number ?? index} text={section.text ?? ''} r={r} isDark={isDark} />;
      default:
        return null;
    }
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={bgGradient} style={StyleSheet.absoluteFill} />

      {/* Back button — floats over the image */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[s.backBtn, { top: insets.top + Spacing.sm }]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [s.backBtnInner, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="arrow-back" size={18} color={backIconColor} />
        </Pressable>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        {/* ── Hero Image ────────────────────────────────────────── */}
        <View style={s.heroWrap}>
          <Image
            source={{ uri: heroImgUri }}
            style={s.heroImg}
            contentFit="cover"
            transition={400}
            onError={() => setHeroImgError(true)}
          />
          <LinearGradient
            colors={heroGradient}
            locations={heroLocations}
            style={StyleSheet.absoluteFill}
          />

          {/* Type + duration overlay */}
          <View style={s.heroMeta}>
            <View style={[s.typeBadge, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
              <Ionicons name={typeIcon as any} size={11} color={accent} />
              <Text style={[s.typeText, { color: accent }]}>{typeLabel}</Text>
            </View>
            <View style={s.durationBadge}>
              <Ionicons name="time-outline" size={11} color={c.textSubtle} />
              <Text style={s.durationText}>{duration}</Text>
            </View>
          </View>
        </View>

        {/* ── Article Header ────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={s.headerSection}>
          {tab ? (
            <View style={s.catChip}>
              <Text style={s.catText}>{tab}</Text>
            </View>
          ) : null}

          <Text style={s.title}>{title}</Text>

          {description ? (
            <Text style={s.description}>{description}</Text>
          ) : null}

          <View style={s.authorRow}>
            <Image
              source={isDark ? require('@/assets/images/logo.png') : require('@/assets/images/logo-light.png')}
              style={s.authorAvatar}
              contentFit="contain"
            />
            <View>
              <Text style={s.authorName}>Hera Wisdom</Text>
              <Text style={s.authorSub}>AI Manifestation Coach</Text>
            </View>
            <View style={s.dividerDot} />
            <View style={s.durationChip}>
              <Ionicons name="time-outline" size={12} color={c.gold} />
              <Text style={s.durationChipText}>{duration}</Text>
            </View>
          </View>

          <View style={s.separator} />
        </Animated.View>

        {/* ── Article Body ──────────────────────────────────────── */}
        {body ? (
          <Animated.View entering={FadeInDown.duration(500).delay(180)} style={s.bodySection}>
            <Text style={s.intro}>{body.intro}</Text>

            <View style={s.sections}>
              {body.sections.map((sec, i) => renderSection(sec, i))}
            </View>

            <View style={s.takeawayCard}>
              <LinearGradient colors={takeawayGradient} style={StyleSheet.absoluteFill} />
              <View style={s.takeawayHeader}>
                <Ionicons name="sparkles" size={14} color={c.gold} />
                <Text style={s.takeawayLabel}>Key Takeaway</Text>
              </View>
              <Text style={s.takeawayText}>{body.takeaway}</Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(500).delay(180)} style={s.bodySection}>
            <Text style={s.intro}>{description}</Text>
            <View style={s.noContentCard}>
              <Ionicons name="construct-outline" size={28} color={c.textSubtle} />
              <Text style={s.noContentTitle}>Full content coming soon</Text>
              <Text style={s.noContentSub}>
                This lesson is being crafted. Check back soon for the complete guide.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── Footer CTA ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(500).delay(260)} style={s.footer}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [s.backBtnFooter, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="arrow-back" size={14} color={c.textMuted} />
            <Text style={s.backBtnFooterText}>Back to Discover</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
