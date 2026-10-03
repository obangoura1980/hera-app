
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Audio } from '@/src/utils/av-shim';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';

// Royalty-free ambient track — replace with a licensed meditation audio URL for production
const AMBIENT_MUSIC_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3';

function estimateDuration(text: string): number {
  return Math.max(6000, (text.trim().split(/\s+/).length / 2.2) * 1000);
}

export interface AudioAffirmationPlayerProps {
  affirmations: string[];
  categoryLabel: string;
  accentColor?: string;
}

export function AudioAffirmationPlayer({
  affirmations,
  categoryLabel,
  accentColor = Colors.gold,
}: AudioAffirmationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [trackWidth, setTrackWidth] = useState(300);

  // Engine refs — never stale in timer callbacks
  const playR = useRef(false);
  const idxR = useRef(0);
  const progressR = useRef(0);
  const durR = useRef(estimateDuration(affirmations[0] ?? ''));
  const startR = useRef(0);
  const intervalR = useRef<ReturnType<typeof setInterval> | null>(null);
  const advR = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgSoundR = useRef<Audio.Sound | null>(null);
  const musicOnR = useRef(true);
  const affsR = useRef(affirmations);
  useEffect(() => { affsR.current = affirmations; }, [affirmations]);

  // Reanimated shared values
  const txtOp = useSharedValue(0);
  const txtY = useSharedValue(16);
  const glowOp = useSharedValue(0.08);
  const wB1 = useSharedValue(0.18);
  const wB2 = useSharedValue(0.28);
  const wB3 = useSharedValue(0.14);

  const txtStyle = useAnimatedStyle(() => ({
    opacity: txtOp.value,
    transform: [{ translateY: txtY.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOp.value }));
  const wb1S = useAnimatedStyle(() => ({ height: Math.max(3, wB1.value * 32) }));
  const wb2S = useAnimatedStyle(() => ({ height: Math.max(3, wB2.value * 32) }));
  const wb3S = useAnimatedStyle(() => ({ height: Math.max(3, wB3.value * 32) }));

  // ── Tracking function stored as ref to avoid stale closures ──────────────
  const trackR = useRef<() => void>(() => {});
  useEffect(() => {
    trackR.current = function track() {
      if (intervalR.current) { clearInterval(intervalR.current); intervalR.current = null; }
      startR.current = Date.now() - progressR.current * durR.current;

      intervalR.current = setInterval(() => {
        if (!playR.current) return;
        const p = Math.min(1, (Date.now() - startR.current) / durR.current);
        progressR.current = p;
        setProgress(p);

        if (p >= 1 && !advR.current) {
          clearInterval(intervalR.current!); intervalR.current = null;
          // Fade out text
          txtOp.value = withTiming(0, { duration: 480 });
          txtY.value = withTiming(-10, { duration: 480 });
          // Advance after fade
          advR.current = setTimeout(() => {
            advR.current = null;
            if (!playR.current) return;
            const next = (idxR.current + 1) % affsR.current.length;
            idxR.current = next;
            durR.current = estimateDuration(affsR.current[next] ?? '');
            progressR.current = 0;
            setCurrentIdx(next);
            setProgress(0);
            // Fade in new text
            txtOp.value = 0; txtY.value = 16;
            txtOp.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
            txtY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) });
            trackR.current(); // Restart for next affirmation
          }, 540);
        }
      }, 160);
    };
  }, []); // Set once; reads from refs which are always current

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    if (intervalR.current) { clearInterval(intervalR.current); intervalR.current = null; }
    if (advR.current) { clearTimeout(advR.current); advR.current = null; }
  }, []);

  const fadeIn = useCallback(() => {
    txtOp.value = 0; txtY.value = 16;
    txtOp.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
    txtY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) });
  }, [txtOp, txtY]);

  const fadeOut = useCallback(() => {
    txtOp.value = withTiming(0, { duration: 480 });
    txtY.value = withTiming(-10, { duration: 480 });
  }, [txtOp, txtY]);

  const glowStart = useCallback(() => {
    glowOp.value = withRepeat(
      withSequence(withTiming(0.8, { duration: 2100 }), withTiming(0.18, { duration: 2100 })),
      -1, false,
    );
  }, [glowOp]);

  const glowStop = useCallback(() => { glowOp.value = withTiming(0.08, { duration: 600 }); }, [glowOp]);

  const waveStart = useCallback(() => {
    wB1.value = withRepeat(withSequence(
      withTiming(0.95, { duration: 360 }), withTiming(0.08, { duration: 360 })
    ), -1, false);
    wB2.value = withDelay(90, withRepeat(withSequence(
      withTiming(1.0, { duration: 340 }), withTiming(0.16, { duration: 340 })
    ), -1, false));
    wB3.value = withDelay(190, withRepeat(withSequence(
      withTiming(0.72, { duration: 380 }), withTiming(0.08, { duration: 380 })
    ), -1, false));
  }, [wB1, wB2, wB3]);

  const waveStop = useCallback(() => {
    wB1.value = withTiming(0.18, { duration: 300 });
    wB2.value = withTiming(0.28, { duration: 300 });
    wB3.value = withTiming(0.14, { duration: 300 });
  }, [wB1, wB2, wB3]);

  // ── Load ambient music ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: AMBIENT_MUSIC_URL },
          { isLooping: true, volume: 0.28, shouldPlay: false },
        );
        if (mounted) {
          bgSoundR.current = sound;
          // Prime the buffer (silent play → stop) so the first real Play starts instantly.
          // On web, autoplay policy may block this — the catch/finally keeps volume correct.
          try {
            await sound.setVolumeAsync(0);
            await sound.playAsync();
            await sound.stopAsync(); // pause + rewind to 0, buffer stays warm
          } catch {
          } finally {
            await sound.setVolumeAsync(0.28).catch(() => {});
          }
        }
      } catch {
        // No background music — visuals-only graceful degradation
      }
    })();
    return () => {
      mounted = false;
      bgSoundR.current?.unloadAsync().catch(() => {});
      clearAll();
    };
  }, [clearAll]);

  // ── Reset when category changes ───────────────────────────────────────
  // The original error was related to the eslint rule 'react-hooks/exhaustive-deps'
  // and the comment 'eslint-disable-line react-hooks/exhaustive-deps' was causing
  // the syntax error because the definition for that rule was not found.
  // Removing the comment fixes the syntax issue as reported, assuming the environment
  // does not have that specific eslint rule configured or it's an outdated comment.
  useEffect(() => {
    playR.current = false;
    clearAll();
    bgSoundR.current?.pauseAsync().catch(() => {});
    setIsPlaying(false);
    idxR.current = 0;
    progressR.current = 0;
    durR.current = estimateDuration(affirmations[0] ?? '');
    setCurrentIdx(0);
    setProgress(0);
    txtOp.value = withTiming(0, { duration: 280 });
    txtY.value = 16;
    glowOp.value = withTiming(0.08, { duration: 280 });
    waveStop();
  }, [categoryLabel, clearAll, waveStop, affirmations, txtOp, txtY, glowOp]); // Added missing dependencies

  // ── Controls ───────────────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    // Set ref first (synchronous) so handlePlayPause can read it immediately
    playR.current = true;
    setIsPlaying(true);
    fadeIn();
    glowStart();
    waveStart();
    trackR.current();
    if (musicOnR.current) {
      try {
        const snd = bgSoundR.current;
        if (snd) {
          // Ensure the sound object is loaded before playing
          const status = await snd.getStatusAsync();
          if (status.isLoaded) await snd.playAsync();
        }
      } catch {}
    }
  }, [fadeIn, glowStart, waveStart]);

  const handlePause = useCallback(async () => {
    playR.current = false;
    setIsPlaying(false);
    clearAll();
    glowStop();
    waveStop();
    if (bgSoundR.current) try { await bgSoundR.current.pauseAsync(); } catch {}
  }, [clearAll, glowStop, waveStop]);

  // Use playR ref (always current) instead of isPlaying state to avoid stale-closure
  // mismatch on the first tap — the ref is synchronously updated by handlePlay/handlePause
  // before the React state re-render cycle, so a single tap always routes correctly.
  const handlePlayPause = useCallback(async () => {
    if (playR.current) await handlePause();
    else await handlePlay();
  }, [handlePlay, handlePause]);

  const handleSkip = useCallback((dir: 1 | -1) => {
    const wasPlaying = playR.current;
    if (wasPlaying) { playR.current = false; clearAll(); }
    fadeOut();
    setTimeout(() => {
      const next = ((idxR.current + dir) % affsR.current.length + affsR.current.length) % affsR.current.length;
      idxR.current = next;
      durR.current = estimateDuration(affsR.current[next] ?? '');
      progressR.current = 0;
      setCurrentIdx(next);
      setProgress(0);
      if (wasPlaying) {
        playR.current = true;
        fadeIn();
        trackR.current();
      }
    }, 500);
  }, [clearAll, fadeOut, fadeIn]);

  const handleMusicToggle = useCallback(async () => {
    const next = !isMusicOn;
    setIsMusicOn(next);
    musicOnR.current = next;
    if (bgSoundR.current) {
      try {
        if (next && playR.current) await bgSoundR.current.playAsync();
        else await bgSoundR.current.pauseAsync();
      } catch {}
    }
  }, [isMusicOn]);

  const currentText = affirmations[currentIdx] ?? '';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(91,33,182,0.32)', 'rgba(10,15,32,0.98)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.borderGlow, { borderColor: accentColor + '28' }]} />

      {/* Radial glow */}
      <Animated.View style={[styles.glow, glowStyle, { backgroundColor: accentColor }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.categoryBadge}>
          <Ionicons name="headset" size={13} color={accentColor} />
          <Text style={[styles.categoryText, { color: accentColor }]}>
            {categoryLabel} · Listen
          </Text>
        </View>
        <Pressable onPress={handleMusicToggle} hitSlop={12} style={styles.musicToggle}>
          <Ionicons
            name={isMusicOn ? 'musical-notes' : 'musical-notes-outline'}
            size={19}
            color={isMusicOn ? accentColor : Colors.textSubtle}
          />
        </Pressable>
      </View>

      {/* Affirmation text area */}
      <View style={styles.textArea}>
        {!isPlaying && progress === 0 ? (
          <Text style={styles.tapHint}>
            ✦ Tap play to begin your affirmation session
          </Text>
        ) : (
          <Animated.Text style={[styles.affirmText, txtStyle]}>
            "{currentText}"
          </Animated.Text>
        )}
      </View>

      {/* Progress bar */}
      <View
        style={styles.progressTrack}
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View
          style={[
            styles.progressFill,
            { width: progress * trackWidth, backgroundColor: accentColor },
          ]}
        />
      </View>

      {/* Metadata row */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{currentIdx + 1} / {affirmations.length}</Text>

        {/* Sound wave bars */}
        {isPlaying && (
          <View style={styles.waveContainer}>
            <Animated.View style={[styles.waveBar, wb1S, { backgroundColor: accentColor }]} />
            <Animated.View style={[styles.waveBar, wb2S, { backgroundColor: accentColor }]} />
            <Animated.View style={[styles.waveBar, wb3S, { backgroundColor: accentColor }]} />
          </View>
        )}

        <Text style={styles.metaText}>{categoryLabel}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable onPress={() => handleSkip(-1)} hitSlop={14} style={styles.sideBtn}>
          {({ pressed }) => (
            <Ionicons name="play-skip-back" size={22} color={pressed ? accentColor : Colors.textMuted} />
          )}
        </Pressable>

        <Pressable
          onPress={handlePlayPause}
          style={({ pressed }) => [
            styles.playBtn,
            { borderColor: accentColor + '44' },
            pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] },
          ]}
        >
          <LinearGradient
            colors={isPlaying ? ['#5B21B6', '#3B0764'] : [accentColor, accentColor + 'AA']}
            style={styles.playBtnInner}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={26}
              color="white"
            />
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => handleSkip(1)} hitSlop={14} style={styles.sideBtn}>
          {({ pressed }) => (
            <Ionicons name="play-skip-forward" size={22} color={pressed ? accentColor : Colors.textMuted} />
          )}
        </Pressable>
      </View>

      {/* Ambient music indicator */}
      {isMusicOn && isPlaying && (
        <View style={styles.ambientRow}>
          <View style={[styles.ambientDot, { backgroundColor: accentColor }]} />
          <Text style={styles.ambientLabel}>Ambient music playing</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
    minHeight: 280,
  },
  borderGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: Radius.xl, borderWidth: 1,
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    alignSelf: 'center',
    top: 20,
    opacity: 0.08,
    // Blur approximated via large radius — actual blur needs expo-blur
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  musicToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  textArea: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  tapHint: {
    fontSize: FontSize.sm,
    color: Colors.textSubtle,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  affirmText: {
    fontSize: FontSize.lg,
    color: Colors.textWhite,
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textSubtle,
    fontWeight: '500',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 32,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  sideBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    // No overflow:hidden — lets the icon render fully without clipping
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  playBtnInner: {
    flex: 1,
    borderRadius: 34,     // clips gradient to the circle without clipping the icon
    overflow: 'hidden',   // gradient clips itself; icon is inside so it stays fully visible
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  ambientDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.8,
  },
  ambientLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSubtle,
    letterSpacing: 0.3,
  },
});
