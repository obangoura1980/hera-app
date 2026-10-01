
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHera } from '@/hooks/useHera';
import { generateVisualizationScript } from '@/services/heraAI';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(SCREEN_W * 0.7, 272);
const INNER_SIZE = CIRCLE_SIZE * 0.74;
const GLOW_SIZE = CIRCLE_SIZE + 80;

// Breath timings (ms)
const INHALE_MS = 4000;
const HOLD_MS = 7000;
const EXHALE_MS = 8000;
const CYCLE_MS = INHALE_MS + HOLD_MS + EXHALE_MS;

type SessionPhase = 'setup' | 'active' | 'complete';
type BreathPhase = 'inhale' | 'hold' | 'exhale';

const DURATION_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
];

const BREATH_LABELS: Record<BreathPhase, string> = {
  inhale: 'Breathe In',
  hold: 'Hold',
  exhale: 'Breathe Out',
};
const BREATH_COUNTS: Record<BreathPhase, string> = {
  inhale: '4 counts',
  hold: '7 counts',
  exhale: '8 counts',
};

const FALLBACK_SEGMENTS = [
  "Take a long, slow breath and feel yourself arriving fully in this moment. You are safe. You are exactly where you need to be.",
  "You are standing at the threshold of your future life. A warm golden light flows through you — this is the energy of everything you have been building toward.",
  "Step inside. Your dream home surrounds you, filled with peace and beauty. Every corner reflects the version of you who believed, who kept going, who became.",
  "You walk through your thriving career, your radiant health, the love surrounding you. Feel the deep satisfaction of having honored your own potential.",
  "Your heart fills with gratitude — not just for what you have created, but for who you have become. This person has always been inside you.",
  "Carry this feeling into your breath, into your body. You are already becoming. The path is lit, the momentum is yours. You are ready.",
];

// ── Stable particle config (computed once at module load) ──────────────────
const PARTICLE_COUNT = 18;
const particleConfigs = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: SCREEN_H * 0.1 + Math.random() * SCREEN_H * 0.8,
  floatHeight: 140 + Math.random() * 160,
  driftX: Math.random() * 50 - 25,
  size: Math.random() * 3.5 + 1.2,
  duration: 7500 + Math.random() * 9000,
  delay: Math.random() * 7000,
  color:
    i % 4 === 0
      ? 'rgba(212,175,55,0.7)'
      : i % 4 === 1
      ? 'rgba(167,139,250,0.55)'
      : i % 4 === 2
      ? 'rgba(212,175,55,0.35)'
      : 'rgba(124,58,237,0.45)',
}));

// ── FloatingParticle ───────────────────────────────────────────────────────
interface ParticleProps {
  config: (typeof particleConfigs)[0];
}
function FloatingParticle({ config }: ParticleProps) {
  const translateY = useSharedValue(config.y);
  const translateX = useSharedValue(config.x);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.y - config.floatHeight, {
            duration: config.duration,
            easing: Easing.out(Easing.sin),
          }),
          withTiming(config.y, { duration: config.duration, easing: Easing.in(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.x + config.driftX, { duration: config.duration }),
          withTiming(config.x, { duration: config.duration }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration * 0.3 }),
          withTiming(0.12, { duration: config.duration * 0.5 }),
          withTiming(0, { duration: config.duration * 0.2 }),
        ),
        -1,
        false,
      ),
    );
  }, [config]); // Added config to dependencies

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: config.size,
    height: config.size,
    borderRadius: config.size / 2,
    backgroundColor: config.color,
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return <Animated.View style={style} />;
}

// ── BreathingRing ──────────────────────────────────────────────────────────
function BreathingRing() {
  const scale = useSharedValue(0.64);
  const glowOpacity = useSharedValue(0.18);
  const outerRingOpacity = useSharedValue(0.45);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: INHALE_MS, easing: Easing.out(Easing.ease) }),
        withDelay(HOLD_MS, withTiming(0.64, { duration: EXHALE_MS, easing: Easing.in(Easing.ease) })),
      ),
      -1,
      false,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: INHALE_MS }),
        withDelay(HOLD_MS, withTiming(0.18, { duration: EXHALE_MS })),
      ),
      -1,
      false,
    );
    outerRingOpacity.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: INHALE_MS }),
        withDelay(HOLD_MS, withTiming(0.45, { duration: EXHALE_MS })),
      ),
      -1,
      false,
    );
  }, []); // Dependencies are constant (INHALE_MS, HOLD_MS, EXHALE_MS), so an empty array is correct.

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const outerStyle = useAnimatedStyle(() => ({ opacity: outerRingOpacity.value }));

  return (
    <View
      style={{ width: GLOW_SIZE, height: GLOW_SIZE, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Soft outer glow ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: GLOW_SIZE,
            height: GLOW_SIZE,
            borderRadius: GLOW_SIZE / 2,
            borderWidth: 1,
            borderColor: 'rgba(212,175,55,0.5)',
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 28,
            elevation: 18,
          },
          glowStyle,
        ]}
      />
      {/* Mid ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: CIRCLE_SIZE + 28,
            height: CIRCLE_SIZE + 28,
            borderRadius: (CIRCLE_SIZE + 28) / 2,
            borderWidth: 1,
            borderColor: 'rgba(124,58,237,0.4)',
          },
          outerStyle,
        ]}
      />
      {/* Breathing main circle */}
      <Animated.View style={[{ position: 'absolute' }, circleStyle]}>
        <LinearGradient
          colors={[
            'rgba(212,175,55,0.22)',
            'rgba(124,58,237,0.38)',
            'rgba(59,7,100,0.28)',
          ]}
          style={{
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE / 2,
            borderWidth: 1.5,
            borderColor: 'rgba(212,175,55,0.28)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LinearGradient
            colors={['rgba(59,7,100,0.9)', 'rgba(10,15,32,0.95)']}
            style={{
              width: INNER_SIZE,
              height: INNER_SIZE,
              borderRadius: INNER_SIZE / 2,
            }}
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function VisualizationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useHera();

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('setup');
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale');
  const [timeLeft, setTimeLeft] = useState(300);
  const [scriptSegments, setScriptSegments] = useState<string[]>([]);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [isLoadingScript, setIsLoadingScript] = useState(false);

  const segmentOpacity = useSharedValue(0);
  const segIdxRef = useRef(0);

  const segmentStyle = useAnimatedStyle(() => ({
    opacity: segmentOpacity.value,
  }));

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // ── Start session ────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setTimeLeft(selectedDuration * 60);
    setCurrentSegment(0);
    segIdxRef.current = 0;
    setScriptSegments([]);
    setSessionPhase('active');
    setIsLoadingScript(true);

    try {
      const segments = await generateVisualizationScript(
        user.name,
        user.goals,
        user.focusAreas,
        selectedDuration,
      );
      setScriptSegments(segments);
    } catch {
      setScriptSegments(FALLBACK_SEGMENTS);
    } finally {
      setIsLoadingScript(false);
    }
  }, [selectedDuration, user.name, user.goals, user.focusAreas]); // Added all dependencies used in generateVisualizationScript

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionPhase !== 'active') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setSessionPhase('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionPhase]);

  // ── Breath phase tracker ─────────────────────────────────────────────────
  useEffect(() => {
    if (sessionPhase !== 'active') return;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed = (elapsed + 200) % CYCLE_MS;
      if (elapsed < INHALE_MS) setBreathPhase('inhale');
      else if (elapsed < INHALE_MS + HOLD_MS) setBreathPhase('hold');
      else setBreathPhase('exhale');
    }, 200);
    return () => clearInterval(interval);
  }, [sessionPhase]);

  // ── Script segment rotation ──────────────────────────────────────────────
  useEffect(() => {
    if (sessionPhase !== 'active' || scriptSegments.length === 0) return;

    segmentOpacity.value = withTiming(1, { duration: 1600 });

    const totalMs = selectedDuration * 60 * 1000;
    const perMs = Math.floor(totalMs / scriptSegments.length);

    const advance = setInterval(() => {
      segmentOpacity.value = withTiming(0, { duration: 900 });
      setTimeout(() => {
        segIdxRef.current = Math.min(segIdxRef.current + 1, scriptSegments.length - 1);
        setCurrentSegment(segIdxRef.current);
        segmentOpacity.value = withTiming(1, { duration: 1100 });
      }, 1100);
    }, perMs);

    return () => clearInterval(advance);
  }, [sessionPhase, scriptSegments, selectedDuration, segmentOpacity]); // Added segmentOpacity to dependencies

  // ── SETUP SCREEN ─────────────────────────────────────────────────────────
  if (sessionPhase === 'setup') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#060B18', '#190940', '#060B18']} style={StyleSheet.absoluteFill} />
        {particleConfigs.map(cfg => (
          <FloatingParticle key={cfg.id} config={cfg} />
        ))}

        <Pressable
          style={[styles.closeBtn, { top: insets.top + 14 }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
        </Pressable>

        <ScrollView
          contentContainerStyle={[
            styles.setupContent,
            { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.setupHero}>
            <View style={styles.previewRingOuter}>
              <LinearGradient
                colors={['rgba(212,175,55,0.22)', 'rgba(124,58,237,0.35)', 'rgba(59,7,100,0.22)']}
                style={styles.previewRing}
              >
                <LinearGradient
                  colors={['rgba(59,7,100,0.9)', 'rgba(10,15,32,0.95)']}
                  style={styles.previewInner}
                >
                  <Text style={styles.previewEmoji}>✨</Text>
                </LinearGradient>
              </LinearGradient>
            </View>
            <Text style={styles.setupTitle}>Visualization</Text>
            <Text style={styles.setupSubtitle}>A guided journey into your highest self</Text>
          </View>

          {/* What to expect */}
          <View style={styles.featuresCard}>
            {[
              { icon: '🌬️', title: '4-7-8 Breathing', desc: 'Inhale 4 · Hold 7 · Exhale 8 rhythm' },
              { icon: '✨', title: 'AI Personalized Journey', desc: 'Your future self, vividly imagined' },
              { icon: '🌊', title: 'Ambient Particles', desc: 'Immersive floating light experience' },
            ].map((f, i) => (
              <View key={i} style={[styles.featureRow, i < 2 && styles.featureDivider]}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Duration */}
          <View style={styles.durationSection}>
            <Text style={styles.durationHeading}>Session Duration</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map(d => (
                <Pressable
                  key={d.value}
                  onPress={() => setSelectedDuration(d.value)}
                  style={({ pressed }) => [
                    styles.durationChip,
                    selectedDuration === d.value && styles.durationChipActive,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      selectedDuration === d.value && styles.durationChipTextActive,
                    ]}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Begin button */}
          <Pressable
            onPress={startSession}
            style={({ pressed }) => [styles.beginWrap, pressed && { opacity: 0.88 }]}
          >
            <LinearGradient colors={['#7C3AED', '#5B21B6', '#3B0764']} style={styles.beginBtn}>
              <Ionicons name="play-circle" size={22} color={Colors.gold} />
              <Text style={styles.beginText}>Begin Journey</Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.setupNote}>
            Find a quiet place · Close your eyes when ready · Follow the circle
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ── COMPLETE SCREEN ───────────────────────────────────────────────────────
  if (sessionPhase === 'complete') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#060B18', '#190940', '#060B18']} style={StyleSheet.absoluteFill} />
        {particleConfigs.map(cfg => (
          <FloatingParticle key={cfg.id} config={cfg} />
        ))}
        <View
          style={[
            styles.completeContent,
            { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <Text style={styles.completeStar}>🌟</Text>
          <Text style={styles.completeTitle}>Session Complete</Text>
          <Text style={styles.completeSub}>
            You showed up for yourself.{'\n'}That is always enough.
          </Text>

          <View style={styles.completeStats}>
            <View style={styles.completeStat}>
              <Text style={styles.completeStatVal}>{selectedDuration}</Text>
              <Text style={styles.completeStatLabel}>minutes</Text>
            </View>
            <View style={styles.completeStatDivider} />
            <View style={styles.completeStat}>
              <Text style={styles.completeStatVal}>{scriptSegments.length}</Text>
              <Text style={styles.completeStatLabel}>scenes</Text>
            </View>
            <View style={styles.completeStatDivider} />
            <View style={styles.completeStat}>
              <Text style={styles.completeStatVal}>{Math.floor(selectedDuration * 60 / (CYCLE_MS / 1000))}</Text>
              <Text style={styles.completeStatLabel}>breaths</Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/journal')}
            style={({ pressed }) => [styles.completeActionWrap, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.completeAction}>
              <Ionicons name="book" size={18} color="white" />
              <Text style={styles.completeActionText}>Journal This Experience</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => {
              setSessionPhase('setup');
              setCurrentSegment(0);
              setScriptSegments([]);
              segIdxRef.current = 0;
            }}
            style={({ pressed }) => [styles.completeSec, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.completeSecText}>Begin Another Session</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.completeTert, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.completeTertText}>Return Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── ACTIVE SESSION ────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#040810', '#160830', '#040810']} style={StyleSheet.absoluteFill} />

      {/* Particles */}
      {particleConfigs.map(cfg => (
        <FloatingParticle key={cfg.id} config={cfg} />
      ))}

      {/* Header */}
      <View style={[styles.sessionHeader, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => setSessionPhase('complete')} hitSlop={14}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.35)" />
        </Pressable>
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={12} color={Colors.gold} />
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      {/* Breathing circle section */}
      <View style={styles.circleSection}>
        <BreathingRing />
        {/* Phase label — absolute, doesn't scale with circle */}
        <View style={styles.phaseOverlay} pointerEvents="none">
          <Text style={styles.phaseLabel}>{BREATH_LABELS[breathPhase]}</Text>
          <Text style={styles.phaseCount}>{BREATH_COUNTS[breathPhase]}</Text>
        </View>
      </View>

      {/* AI Narration */}
      <View style={styles.narrationSection}>
        {isLoadingScript ? (
          <View style={styles.narrationLoading}>
            <Text style={styles.narrationLoadingText}>Preparing your journey…</Text>
          </View>
        ) : (
          <Animated.View style={[styles.narrationCard, segmentStyle]}>
            <Ionicons name="sparkles" size={13} color={Colors.gold} style={{ alignSelf: 'center' }} />
            <Text style={styles.narrationText}>{scriptSegments[currentSegment] ?? ''}</Text>
          </Animated.View>
        )}

        {scriptSegments.length > 1 && (
          <View style={styles.segDots}>
            {scriptSegments.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.segDot,
                  i === currentSegment && styles.segDotActive,
                  i < currentSegment && styles.segDotDone,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Bottom note */}
      <View style={[styles.bottomNote, { paddingBottom: insets.bottom + 18 }]}>
        <Text style={styles.bottomNoteText}>Follow the circle · Breathe with Hera</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060B18' },

  closeBtn: {
    position: 'absolute',
    left: Spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Setup ─────────────────────────────────────────────────────────────────
  setupContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  setupHero: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  previewRingOuter: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  previewRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: { fontSize: 36 },
  setupTitle: {
    fontSize: FontSize.xxl,
    color: Colors.textWhite,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  setupSubtitle: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  featuresCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  featureDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  featureIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  featureTextWrap: { flex: 1, gap: 2 },
  featureTitle: { fontSize: FontSize.base, color: Colors.textWhite, fontWeight: '600' },
  featureDesc: { fontSize: FontSize.sm, color: Colors.textMuted },

  durationSection: { width: '100%', gap: Spacing.md },
  durationHeading: {
    fontSize: FontSize.sm,
    color: Colors.textSubtle,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  durationRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  durationChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  durationChipActive: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderColor: Colors.primary,
  },
  durationChipText: { fontSize: FontSize.base, color: Colors.textMuted, fontWeight: '600' },
  durationChipTextActive: { color: Colors.primaryLight },

  beginWrap: { width: '100%', borderRadius: Radius.xxl, overflow: 'hidden' },
  beginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 18,
    borderRadius: Radius.xxl,
  },
  beginText: { fontSize: FontSize.md, color: Colors.textWhite, fontWeight: '700' },

  setupNote: {
    fontSize: FontSize.sm,
    color: Colors.textSubtle,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Complete ──────────────────────────────────────────────────────────────
  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  completeStar: { fontSize: 56 },
  completeTitle: { fontSize: FontSize.xxl, color: Colors.textWhite, fontWeight: '700' },
  completeSub: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: -Spacing.sm,
  },

  completeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  completeStat: { flex: 1, alignItems: 'center', gap: 4 },
  completeStatVal: { fontSize: FontSize.xl, color: Colors.gold, fontWeight: '700' },
  completeStatLabel: { fontSize: FontSize.xs, color: Colors.textSubtle },
  completeStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },

  completeActionWrap: { width: '100%', borderRadius: Radius.xl, overflow: 'hidden' },
  completeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: Radius.xl,
  },
  completeActionText: { fontSize: FontSize.base, color: 'white', fontWeight: '700' },
  completeSec: { paddingVertical: Spacing.md },
  completeSecText: { fontSize: FontSize.base, color: Colors.primaryLight, fontWeight: '600' },
  completeTert: { paddingVertical: Spacing.sm },
  completeTertText: { fontSize: FontSize.sm, color: Colors.textSubtle },

  // ── Active session ────────────────────────────────────────────────────────
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.22)',
  },
  timerText: { fontSize: FontSize.sm, color: Colors.gold, fontWeight: '700', letterSpacing: 0.5 },

  circleSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  phaseLabel: {
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  phaseCount: {
    fontSize: FontSize.sm,
    color: Colors.gold,
    fontWeight: '500',
    opacity: 0.85,
    letterSpacing: 0.5,
  },

  narrationSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  narrationLoading: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  narrationLoadingText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
  },
  narrationCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
    padding: Spacing.lg,
    gap: Spacing.sm,
    width: '100%',
  },
  narrationText: {
    fontSize: 15.5,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 27,
    textAlign: 'center',
    fontWeight: '400',
  },
  segDots: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  segDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  segDotActive: {
    backgroundColor: Colors.gold,
    width: 16,
    borderRadius: 3,
  },
  segDotDone: { backgroundColor: 'rgba(212,175,55,0.38)' },

  bottomNote: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  bottomNoteText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.8,
  },
});
