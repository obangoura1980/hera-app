/**
 * onboarding.tsx — 25 full-screen onboarding steps with ambient audio & typewriter effects.
 * Screen 1: Splash | Screen 2: Welcome | Screen 3: Referral | Screens 4-23: Questions |
 * Screen 24: Generating | Screen 25: 7-day Paywall
 *
 * Fix (goals persistence): AsyncStorage write happens BEFORE router.replace() so the home
 * screen reads the correct name/goals on first mount even when Context hasn't re-rendered yet.
 * Fix (transition lag): QuestionLayout wrapped in React.memo — prevents the typewriter
 * animation restarting when the parent re-renders due to unrelated TextInput state changes.
 * Gender options: Female / Male / Non-binary / Prefer not to say.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Dimensions, Platform, KeyboardAvoidingView, Animated, Modal, Linking, Keyboard,
} from 'react-native';
import { Audio } from '@/src/utils/av-shim';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Ionicons from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@/src/utils/async-storage';
import { Colors, Spacing, Radius, FontSize, Shadow } from '@/constants/theme';
import { useHera } from '@/hooks/useHera';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/template';

const { width } = Dimensions.get('window');

// ── Audio config ──────────────────────────────────────────────────────────────
const AMBIENT_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3';
const AUDIO_TARGET_VOL   = 0.3;
const AUDIO_FADE_IN_MS   = 500;
const AUDIO_FADE_OUT_MS  = 1000;
const AUDIO_FULL_PLAY_MS = 3000;
const TOTAL_Q = 20;

interface Contact { name: string; relationship: string; }

// ── Typewriter Hook ────────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 20, delay = 320): string {
  const [out, setOut] = useState('');
  const t = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    setOut('');
    let i = 0;
    const tick = () => {
      if (i < text.length) { i++; setOut(text.slice(0, i)); t.current = setTimeout(tick, speed); }
    };
    t.current = setTimeout(tick, delay);
    return () => clearTimeout(t.current);
  }, [text]);
  return out;
}

// ── Option Card (Radio) ────────────────────────────────────────────────────────
function OptionCard({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <Pressable onPress={onSelect} style={({ pressed }) => [oc.card, selected && oc.sel, pressed && { opacity: 0.8 }]}>
      {selected && <LinearGradient colors={['rgba(168,85,247,0.22)', 'rgba(236,72,153,0.12)']} style={StyleSheet.absoluteFill} />}
      <View style={[oc.radio, selected && oc.radioSel]}>
        {selected ? <View style={oc.dot} /> : null}
      </View>
      <Text style={[oc.label, selected && oc.labelSel]}>{label}</Text>
    </Pressable>
  );
}
const oc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg, paddingVertical: 15, paddingHorizontal: Spacing.md, overflow: 'hidden' },
  sel: { borderColor: Colors.primaryLight },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioSel: { borderColor: Colors.primaryLight },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primaryLight },
  label: { fontSize: FontSize.base, color: Colors.textMuted, fontWeight: '600' },
  labelSel: { color: Colors.textWhite },
});

// ── Yes / No ───────────────────────────────────────────────────────────────────
function YesNo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.md }}>
      {['Yes', 'No'].map(opt => {
        const sel = value === opt;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} style={({ pressed }) => [yn.btn, sel && yn.sel, pressed && { opacity: 0.8 }]}>
            {sel ? <LinearGradient colors={['#A855F7', '#EC4899']} style={StyleSheet.absoluteFill} /> : null}
            <Text style={[yn.label, sel && { color: Colors.textWhite }]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const yn = StyleSheet.create({
  btn: { flex: 1, height: 56, borderRadius: Radius.xxl, borderWidth: 1.5, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sel: { borderColor: Colors.primaryLight },
  label: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '700' },
});

// ── Home Grid ──────────────────────────────────────────────────────────────────
const HOME_TYPES = [
  { id: 'penthouse', e: '🏙️', l: 'Luxury\nPenthouse' },
  { id: 'beach', e: '🏖️', l: 'Beachfront\nVilla' },
  { id: 'loft', e: '🏢', l: 'Modern\nLoft' },
  { id: 'cottage', e: '🏡', l: 'Cozy\nCottage' },
  { id: 'mansion', e: '🏛️', l: 'Suburban\nMansion' },
  { id: 'cabin', e: '🌲', l: 'Cabin' },
  { id: 'tiny', e: '🏠', l: 'Tiny\nHome' },
  { id: 'farm', e: '🌾', l: 'Farmhouse' },
];
function HomeGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const cardW = (width - Spacing.lg * 2 - Spacing.sm * 3) / 4;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
      {HOME_TYPES.map(item => {
        const sel = value === item.id;
        return (
          <Pressable key={item.id} onPress={() => onChange(item.id)} style={({ pressed }) => [hg.card, { width: cardW }, sel && hg.sel, pressed && { opacity: 0.8 }]}>
            {sel ? <LinearGradient colors={['rgba(168,85,247,0.22)', 'rgba(236,72,153,0.08)']} style={StyleSheet.absoluteFill} /> : null}
            <Text style={{ fontSize: 22 }}>{item.e}</Text>
            <Text style={[hg.label, sel && { color: Colors.gold }]}>{item.l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const hg = StyleSheet.create({
  card: { alignItems: 'center', gap: 5, paddingVertical: 12, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg, overflow: 'hidden' },
  sel: { borderColor: Colors.gold },
  label: { fontSize: 10, color: Colors.textSubtle, textAlign: 'center', fontWeight: '500', lineHeight: 14, paddingHorizontal: 3 },
});

// ── Add Contact Modal ──────────────────────────────────────────────────────────
const REL_TAGS = ['Partner', 'Mom', 'Dad', 'Sister', 'Brother', 'Friend', 'Mentor', 'Child', 'Colleague'];
function AddContactModal({ visible, onAdd, onClose }: { visible: boolean; onAdd: (c: Contact) => void; onClose: () => void }) {
  const [cname, setCname] = useState('');
  const [rel, setRel] = useState('');
  const submit = () => {
    if (!cname.trim() || !rel) return;
    onAdd({ name: cname.trim(), relationship: rel });
    setCname(''); setRel(''); onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
        <LinearGradient colors={['#0D0F22', '#080A18']} style={acm.sheet}>
          <View style={acm.handle} />
          <Text style={acm.title}>Add a Person</Text>
          <TextInput value={cname} onChangeText={setCname} placeholder="Their name..." placeholderTextColor="rgba(255,255,255,0.22)" style={acm.input} autoFocus autoCapitalize="words" />
          <Text style={acm.relLabel}>Relationship</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: Spacing.sm, paddingVertical: 2 }}>
            {REL_TAGS.map(t => (
              <Pressable key={t} onPress={() => setRel(t)} style={[acm.tag, rel === t && acm.tagSel]}>
                <Text style={[acm.tagTxt, rel === t && { color: Colors.primaryLight, fontWeight: '700' }]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Pressable onPress={onClose} style={acm.cancel}>
              <Text style={{ fontSize: FontSize.base, color: Colors.textMuted, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={submit} disabled={!cname.trim() || !rel} style={({ pressed }) => [acm.addWrap, (!cname.trim() || !rel) && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}>
              <LinearGradient colors={['#A855F7', '#EC4899']} style={acm.add}>
                <Text style={{ fontSize: FontSize.base, color: 'white', fontWeight: '700' }}>Add Person</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const acm = StyleSheet.create({
  sheet: { borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.lg, gap: Spacing.md, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.glassBorder, alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: FontSize.lg, color: Colors.textWhite, fontWeight: '700', textAlign: 'center' },
  input: { backgroundColor: Colors.glassBg, borderWidth: 1.5, borderColor: Colors.glassBorder, borderRadius: Radius.lg, padding: Spacing.md, fontSize: FontSize.base, color: Colors.textWhite },
  relLabel: { fontSize: FontSize.sm, color: Colors.textSubtle, fontWeight: '600' },
  tag: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg },
  tagSel: { borderColor: Colors.primary, backgroundColor: 'rgba(168,85,247,0.2)' },
  tagTxt: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  cancel: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.glassBg, borderRadius: Radius.xxl, borderWidth: 1, borderColor: Colors.glassBorder },
  addWrap: { flex: 2, borderRadius: Radius.xxl, overflow: 'hidden' },
  add: { paddingVertical: 14, alignItems: 'center' },
});

// ── Countdown Timer ────────────────────────────────────────────────────────────
function Countdown() {
  const [secs, setSecs] = useState(10795);
  useEffect(() => { const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000); return () => clearInterval(id); }, []);
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s2 = secs % 60;
  const f = (n: number) => String(n).padStart(2, '0');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
      <Ionicons name="timer-outline" size={13} color={Colors.error} />
      <Text style={{ fontSize: FontSize.sm, color: Colors.textMuted }}>Your stories expire in </Text>
      <Text style={{ fontSize: FontSize.sm, color: Colors.error, fontWeight: '800' }}>{f(h)}:{f(m)}:{f(s2)}</Text>
    </View>
  );
}

// ── Animated Progress Bar (Generating screen) ──────────────────────────────────
function GenBar({ onDone }: { onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 5200, useNativeDriver: false }).start(({ finished }) => { if (finished) onDone(); });
  }, []);
  const w = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', width: w, borderRadius: 3 }}>
        <LinearGradient colors={['#A855F7', '#EC4899']} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
      </Animated.View>
    </View>
  );
}

// ── Styled Input ───────────────────────────────────────────────────────────────
function SInput({ value, onChange, placeholder, multiline, keyboardType, autoFocus: af = true }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  multiline?: boolean; keyboardType?: any; autoFocus?: boolean;
}) {
  return (
    <TextInput
      value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.2)"
      style={[si.input, multiline && si.multi]}
      multiline={multiline} keyboardType={keyboardType ?? 'default'}
      autoCapitalize={keyboardType === 'number-pad' ? 'none' : 'sentences'}
      autoFocus={af}
    />
  );
}
const si = StyleSheet.create({
  input: { backgroundColor: Colors.glassBg, borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.45)', borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md + 2, fontSize: FontSize.base, color: Colors.textWhite },
  multi: { minHeight: 130, paddingTop: Spacing.md, textAlignVertical: 'top' },
});

// ── Question Layout (Screens 4-23 wrapper) ────────────────────────────────────
// Wrapped in React.memo so typing in an answer TextInput (which re-renders the parent)
// does NOT reset the typewriter animation running inside this component.
const QuestionLayout = React.memo(function QuestionLayout({ qNum, title, children, onBack, onNext, canNext, nextLabel = 'Continue', onSkip, isMuted, onToggleMute }: {
  qNum: number; title: string; children?: React.ReactNode;
  onBack: () => void; onNext: () => void; canNext: boolean; nextLabel?: string; onSkip?: () => void;
  isMuted?: boolean; onToggleMute?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const displayed = useTypewriter(title, 20, 380);
  const pct = `${Math.min(100, Math.round((qNum / TOTAL_Q) * 100))}%`;
  return (
    <LinearGradient colors={['#080A18', '#0F1028', '#131838']} style={{ flex: 1, paddingTop: insets.top }}>
      <View style={ql.header}>
        <Pressable onPress={onBack} style={ql.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
        <View style={ql.track}>
          <View style={[ql.fill, { width: pct }]} />
        </View>
        <Text style={ql.step}>{qNum}/{TOTAL_Q}</Text>
        {onToggleMute ? <MuteBtn isMuted={!!isMuted} onToggle={onToggleMute} /> : null}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={ql.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={ql.title}>{displayed || ' '}</Text>
          {children}
        </ScrollView>
        <View style={[ql.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable onPress={onNext} disabled={!canNext} style={({ pressed }) => [ql.btnWrap, !canNext && { opacity: 0.32 }, pressed && { opacity: 0.8 }]}>
            <LinearGradient colors={['#A855F7', '#EC4899']} style={ql.btn}>
              <Text style={ql.btnTxt}>{nextLabel}</Text>
              <Ionicons name="arrow-forward" size={17} color="white" />
            </LinearGradient>
          </Pressable>
          {onSkip ? (
            <Pressable onPress={onSkip} hitSlop={10} style={({ pressed }) => [ql.skipWrap, pressed && { opacity: 0.55 }]}>
              <Text style={ql.skipHint}>Not important</Text>
              <Text style={ql.skipTxt}>Skip</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
});

const ql = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: Colors.primaryLight },
  step: { fontSize: FontSize.xs, color: Colors.textSubtle, fontWeight: '600', minWidth: 30, textAlign: 'right' },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: 20 },
  title: { fontSize: FontSize.xxl, color: Colors.textWhite, fontWeight: '700', lineHeight: 38, minHeight: 38 },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  btnWrap: { borderRadius: Radius.xxl, overflow: 'hidden' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 16 },
  btnTxt: { fontSize: FontSize.base, color: 'white', fontWeight: '700' },
  skipWrap: { alignItems: 'center', paddingVertical: Spacing.sm, gap: 2 },
  skipHint: { fontSize: FontSize.xs, color: Colors.textSubtle },
  skipTxt:  { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
});

// ── Mute Button ──────────────────────────────────────────────────────────────
function MuteBtn({ isMuted, onToggle, style }: { isMuted: boolean; onToggle: () => void; style?: any }) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={12}
      style={({ pressed }) => [
        mb.btn,
        style,
        pressed && { opacity: 0.65 },
      ]}
      accessibilityLabel={isMuted ? 'Unmute music' : 'Mute music'}
    >
      <Ionicons
        name={isMuted ? 'volume-mute' : 'volume-medium'}
        size={16}
        color={isMuted ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.65)'}
      />
    </Pressable>
  );
}
const mb = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Splash Screen (Screen 1) ───────────────────────────────────────────────────
function SplashScreen({ onContinue, onAudioStart, isMuted, onToggleMute }: { onContinue: () => void; onAudioStart?: () => void; isMuted?: boolean; onToggleMute?: () => void }) {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const twText = useTypewriter('HERA', 140, 1000);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 1500, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.16, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Pressable style={{ flex: 1 }} onPress={() => { onAudioStart?.(); onContinue(); }}>
      <LinearGradient colors={['#020408', '#060B1E', '#080A18']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Animated.View style={{ position: 'absolute', width: 330, height: 330, borderRadius: 165, backgroundColor: 'rgba(168,85,247,0.12)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', transform: [{ scale: pulse }] }} />
        <Animated.View style={{ position: 'absolute', width: 480, height: 480, borderRadius: 240, backgroundColor: 'rgba(236,72,153,0.06)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.1)', transform: [{ scale: pulse }], opacity: 0.55 }} />
        <Animated.View style={{ alignItems: 'center', gap: Spacing.xl, opacity: fade }}>
          <Image source={require('@/assets/images/logo.png')} style={{ width: 110, height: 110 }} contentFit="contain" transition={400} />
          <Text style={spl.heraTitle}>{twText}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Ionicons name="sparkles" size={11} color={Colors.gold} />
            <Text style={spl.tagline}>AI Manifestation Companion</Text>
            <Ionicons name="sparkles" size={11} color={Colors.gold} />
          </View>
        </Animated.View>
        <Animated.Text style={[spl.tap, { opacity: fade }]}>tap anywhere to begin</Animated.Text>
        {onToggleMute ? (
          <View style={{ position: 'absolute', top: insets.top + 12, right: Spacing.lg }} pointerEvents="box-none">
            <MuteBtn isMuted={!!isMuted} onToggle={(e) => { (e as any)?.stopPropagation?.(); onToggleMute(); }} />
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}
const spl = StyleSheet.create({
  heraTitle: { fontSize: 52, color: Colors.textWhite, fontWeight: '900', letterSpacing: 16, textShadowColor: 'rgba(124,58,237,0.95)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 28 },
  tagline: { fontSize: FontSize.sm, color: Colors.gold, fontWeight: '600', letterSpacing: 0.8 },
  tap: { position: 'absolute', bottom: 72, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.26)', fontStyle: 'italic' },

});

// ── Generating Screen (Screen 24) ──────────────────────────────────────────────
function GeneratingScreen({ displayName, onDone }: { displayName: string; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const genText = useTypewriter(
    `Thank you for sharing, ${displayName}. That's all the information I need for now.\n\nGive me a moment to personalize your app experience...`,
    18, 600
  );
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowBar(true), 3800);
    return () => clearTimeout(t);
  }, []);

  return (
    <LinearGradient colors={['#0F0720', '#1A0D2E', '#0F172A']} style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <View style={{ position: 'relative' }}>
            <LinearGradient colors={['#A855F7', '#7C3AED']} style={gs.avatar}>
              <Text style={{ fontSize: FontSize.xl, color: Colors.gold, fontWeight: '800' }}>H</Text>
            </LinearGradient>
            <View style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#0F0720' }} />
          </View>
          <View>
            <Text style={{ fontSize: FontSize.base, color: Colors.textWhite, fontWeight: '700' }}>Hera</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success }} />
              <Text style={{ fontSize: FontSize.xs, color: Colors.success, fontWeight: '500' }}>Processing your answers...</Text>
            </View>
          </View>
        </View>
        <View style={{ borderRadius: 20, borderBottomLeftRadius: 4, overflow: 'hidden' }}>
          <LinearGradient colors={['rgba(168,85,247,0.35)', 'rgba(109,40,217,0.2)']} style={{ padding: Spacing.lg }}>
            <Text style={{ fontSize: FontSize.base, color: 'rgba(255,255,255,0.92)', lineHeight: 24 }}>{genText}</Text>
          </LinearGradient>
        </View>
        {showBar ? (
          <View style={{ gap: Spacing.md }}>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSubtle, textAlign: 'center', fontStyle: 'italic' }}>
              Generating your stories...
            </Text>
            <GenBar onDone={onDone} />
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}
const gs = StyleSheet.create({
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold },
});

// ── Referral Screen (Screen 3) ────────────────────────────────────────────────
// Valid codes — extend this list as needed
const VALID_CODES = new Set(['HERA2024', 'MANIFEST', 'FRIEND10', 'WELCOME7', 'TRIAL7']);

function ReferralScreen({
  referralCode, setReferralCode, onBack, onNext, insets,
}: {
  referralCode: string;
  setReferralCode: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  insets: { top: number; bottom: number };
}) {
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  const handleContinue = useCallback(() => {
    const code = referralCode.trim();
    if (!code) { onNext(); return; } // empty = skip
    if (VALID_CODES.has(code)) {
      setError('');
      setApplied(true);
      setTimeout(() => onNext(), 600); // brief success flash then continue
    } else {
      setError('Invalid referral code. Please check and try again.');
    }
  }, [referralCode, onNext]);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#080A18', '#0D1035', '#131838']} style={{ flex: 1, paddingTop: insets.top }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, paddingHorizontal: Spacing.lg }}>
          <Pressable onPress={onBack} style={[ws.backBtn, { marginTop: 12, marginBottom: Spacing.xl }]} hitSlop={12}>
            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.45)" />
          </Pressable>
          <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.lg }}>
            <Text style={ws.title}>Do you have a{'\n'}referral code?</Text>
            <Text style={ws.sub}>Enter a code from a friend and you both get a bonus week.</Text>
            <View style={{ gap: Spacing.sm }}>
              <TextInput
                value={referralCode}
                onChangeText={t => { setReferralCode(t.toUpperCase()); setError(''); setApplied(false); }}
                placeholder="FRIEND-CODE"
                placeholderTextColor="rgba(255,255,255,0.18)"
                style={[
                  rf.input,
                  error ? { borderColor: Colors.error } : null,
                  applied ? { borderColor: Colors.success } : null,
                ]}
                autoCapitalize="characters"
                maxLength={16}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              {error ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="alert-circle" size={14} color={Colors.error} />
                  <Text style={{ fontSize: FontSize.sm, color: Colors.error, flex: 1 }}>{error}</Text>
                </View>
              ) : null}
              {applied ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                  <Text style={{ fontSize: FontSize.sm, color: Colors.success }}>Code applied! Bonus week added.</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [ws.btnWrap, pressed && { opacity: 0.8 }]}
            >
              <LinearGradient colors={['#A855F7', '#EC4899']} style={ws.btn}>
                <Text style={ws.btnTxt}>{referralCode.trim() ? 'Apply & Continue' : 'Continue'}</Text>
                <Ionicons name="arrow-forward" size={17} color="white" />
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onNext} style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSubtle }}>Skip — I don't have a code</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const PLANS = [
  { id: 'annual' as const, label: 'Annual', price: '$89.99', period: '/ year', monthly: '$7.50/mo', badge: 'Most Popular', highlight: true },
  { id: 'premium' as const, label: 'Monthly', price: '$12.99', period: '/ month', monthly: null, badge: null, highlight: false },
  { id: 'founding' as const, label: 'Founding Member', price: '$7.99', period: '/ month', monthly: null, badge: 'Limited', highlight: false },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { updateUser } = useHera();
  const { purchasePlan } = useSubscription();
  const soundRef       = useRef<Audio.Sound | null>(null);
  const autoStopTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const fadeInInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeOutInterval= useRef<ReturnType<typeof setInterval> | null>(null);

  const [screen, setScreen] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false); // ref so intervals always read current mute state

  // ── Answers ────────────────────────────────────────────────────────────
  const [referralCode, setReferralCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [age, setAge] = useState('');
  const [sexuality, setSexuality] = useState('');
  const [gender, setGender] = useState('');
  const [kids, setKids] = useState('');
  const [goals, setGoals] = useState('');
  const [motivation, setMotivation] = useState('');
  const [obstacles, setObstacles] = useState('');
  const [relationship, setRelationship] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [career, setCareer] = useState('');
  const [workSentiment, setWorkSentiment] = useState('');
  const [selfDesc, setSelfDesc] = useState('');
  const [pastShapes, setPastShapes] = useState('');
  const [dreamLocation, setDreamLocation] = useState('');
  const [homeType, setHomeType] = useState('');
  const [partnerManifest, setPartnerManifest] = useState('');
  const [specificPerson, setSpecificPerson] = useState('');

  const [contactModal, setContactModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'premium' | 'founding'>('annual');

  const { sendOTP, verifyOTPAndLogin } = useAuth();

  const displayName = name.trim() || 'Beautiful Soul';

  // ── Ambient Audio ─────────────────────────────────────────────────────
  const clearAudioTimers = useCallback(() => {
    if (autoStopTimer.current)  { clearTimeout(autoStopTimer.current);   autoStopTimer.current  = null; }
    if (fadeInInterval.current) { clearInterval(fadeInInterval.current); fadeInInterval.current = null; }
    if (fadeOutInterval.current){ clearInterval(fadeOutInterval.current);fadeOutInterval.current = null; }
  }, []);

  const stopAudioNow = useCallback(() => {
    try {
      clearAudioTimers();
      const s = soundRef.current;
      soundRef.current = null;
      if (s) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); }
    } catch {}
  }, [clearAudioTimers]);

  const fadeOutAndStop = useCallback(() => {
    clearAudioTimers();
    const s = soundRef.current;
    if (!s) return;
    soundRef.current = null;
    const STEPS    = 15;
    const INTERVAL = Math.round(AUDIO_FADE_OUT_MS / STEPS);
    let step = 0;
    fadeOutInterval.current = setInterval(async () => {
      step++;
      const vol = Math.max(0, AUDIO_TARGET_VOL * (1 - step / STEPS));
      try { await s.setVolumeAsync(vol); } catch {}
      if (step >= STEPS) {
        clearInterval(fadeOutInterval.current!); fadeOutInterval.current = null;
        s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {});
      }
    }, INTERVAL);
  }, [clearAudioTimers]);

  // ── Mute toggle ──────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      if (soundRef.current) {
        soundRef.current.setVolumeAsync(next ? 0 : AUDIO_TARGET_VOL).catch(() => {});
      }
      return next;
    });
  }, []);

  const startAudio = useCallback(async () => {
    if (soundRef.current) return;
    try {
      if (!Audio?.setAudioModeAsync) return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:     false,
        playsInSilentModeIOS:   true,
        shouldDuckAndroid:      true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: AMBIENT_URL },
        { shouldPlay: true, isLooping: true, volume: 0 }
      );
      soundRef.current = sound;
      const FADE_IN_STEPS    = 10;
      const FADE_IN_INTERVAL = Math.round(AUDIO_FADE_IN_MS / FADE_IN_STEPS);
      let inStep = 0;
      fadeInInterval.current = setInterval(async () => {
        inStep++;
        const vol = Math.min(AUDIO_TARGET_VOL, AUDIO_TARGET_VOL * (inStep / FADE_IN_STEPS));
        try { if (soundRef.current) await soundRef.current.setVolumeAsync(isMutedRef.current ? 0 : vol); } catch {}
        if (inStep >= FADE_IN_STEPS) {
          clearInterval(fadeInInterval.current!); fadeInInterval.current = null;
        }
      }, FADE_IN_INTERVAL);
      autoStopTimer.current = setTimeout(() => fadeOutAndStop(), AUDIO_FULL_PLAY_MS);
    } catch {}
  }, [fadeOutAndStop]);

  useEffect(() => {
    return () => { stopAudioNow(); };
  }, []);



  // ── Navigation ─────────────────────────────────────────────────────────
  const goNext = useCallback(() => { Keyboard.dismiss(); setScreen(s => s + 1); }, []);
  const goBack = useCallback(() => { Keyboard.dismiss(); setScreen(s => Math.max(1, s - 1)); }, []);
  const stopAndGoNext = useCallback(() => { stopAudioNow(); goNext(); }, [stopAudioNow, goNext]);
  const stopAndGoBack = useCallback(() => { stopAudioNow(); goBack(); }, [stopAudioNow, goBack]);

  // ── Shared: persist answers to AsyncStorage then navigate ───────────────
  // Writing to AsyncStorage BEFORE router.replace() ensures the home screen
  // reads the correct name/goals on first mount even before Context re-renders.
  const persistAndNavigate = useCallback(async (dest: '/(tabs)' | '/subscription') => {
    try { stopAudioNow(); } catch {}
    const userName   = name.trim() || 'Beautiful Soul';
    const goalsArr   = goals.trim() ? [goals.trim()] : [];
    const userRecord = { name: userName, goals: goalsArr, focusAreas: [], onboardingComplete: true, streak: 1 };
    await Promise.all([
      AsyncStorage.setItem('@hera_user', JSON.stringify(userRecord)),
      AsyncStorage.setItem('hera_onboarded', 'true'),
    ]).catch(() => {});
    updateUser({ name: userName, goals: goalsArr, focusAreas: [], onboardingComplete: true });
    router.replace(dest);
  }, [name, goals, updateUser, stopAudioNow]);

  const finishOnboarding = useCallback(() => persistAndNavigate('/(tabs)'),    [persistAndNavigate]);
  const handleStartTrial = useCallback(() => persistAndNavigate('/subscription'), [persistAndNavigate]);

  // ════════════════════════════════════════════════════════════════════════
  // SCREENS
  // ════════════════════════════════════════════════════════════════════════

  if (screen === 1) return <SplashScreen onContinue={goNext} onAudioStart={startAudio} isMuted={isMuted} onToggleMute={toggleMute} />;

  // ── Screen 2: Welcome ──────────────────────────────────────────────────
  if (screen === 2) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient colors={['#080A18', '#0D1035', '#131838']} style={{ flex: 1, paddingTop: insets.top }}>
          <ScrollView contentContainerStyle={[ws.scroll, { paddingBottom: 16 }]} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable onPress={stopAndGoBack} style={ws.backBtn} hitSlop={12}>
                <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.45)" />
              </Pressable>
              <MuteBtn isMuted={isMuted} onToggle={toggleMute} />
            </View>
            <View style={ws.hero}>
              <Image source={require('@/assets/images/logo.png')} style={ws.logo} contentFit="contain" transition={300} />
              <View style={ws.badge}>
                <Ionicons name="sparkles" size={10} color={Colors.gold} />
                <Text style={ws.badgeTxt}>AI Manifestation Companion</Text>
              </View>
            </View>
            <Text style={ws.title}>Create the life{'\n'}you desire</Text>
            <Text style={ws.sub}>Your personal AI guide for manifestation, mindset transformation, and becoming your highest self.</Text>
            {[
              { icon: '🔮', t: 'Personalized AI coaching, tailored to you' },
              { icon: '💜', t: 'Daily affirmations & guided visualizations' },
              { icon: '📓', t: 'Reflective journaling & vision boarding' },
              { icon: '✨', t: 'Manifest your dream life, step by step' },
            ].map((f, i) => (
              <View key={i} style={ws.feat}>
                <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                <Text style={ws.featTxt}>{f.t}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Text style={{ fontSize: 13 }}>⭐⭐⭐⭐⭐</Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSubtle, marginLeft: 4 }}>4.9 · 12,400+ reviews</Text>
            </View>
            <Pressable onPress={stopAndGoNext} style={({ pressed }) => [ws.btnWrap, pressed && { opacity: 0.85 }]}>
              <LinearGradient colors={['#A855F7', '#EC4899']} style={ws.btn}>
                <Text style={ws.btnTxt}>Continue</Text>
                <Ionicons name="arrow-forward" size={17} color="white" />
              </LinearGradient>
            </Pressable>

            <Text style={ws.legal}>
              By continuing you agree to our{' '}
              <Text style={ws.legalLink} onPress={() => Linking.openURL('https://downloadhera.com/terms')}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={ws.legalLink} onPress={() => Linking.openURL('https://downloadhera.com/privacy')}>Privacy Policy</Text>
            </Text>
          </ScrollView>

          {/* Fixed login shortcut — always visible at the bottom */}
          <View style={[ws.fixedLoginBar, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              onPress={() => router.push('/login')}
              hitSlop={12}
              style={({ pressed }) => [ws.loginLink, pressed && { opacity: 0.6 }]}
            >
              <Text style={ws.loginLinkTxt}>
                Already have an account?{' '}
                <Text style={ws.loginLinkBold}>Log in</Text>
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ── Screen 3: Referral Code ────────────────────────────────────────────
  if (screen === 3) {
    return (
      <ReferralScreen
        referralCode={referralCode}
        setReferralCode={setReferralCode}
        onBack={goBack}
        onNext={goNext}
        insets={insets}
      />
    );
  }

  if (screen === 4) {
    return (
      <View style={{ flex: 1 }}>
        <QuestionLayout qNum={1} title={`Hello! Welcome to Hera.\n\nThis is your space to manifest the life of your dreams.`} onBack={goBack} onNext={goNext} canNext={true} isMuted={isMuted} onToggleMute={toggleMute}>
          <View style={{ borderRadius: Radius.xl, overflow: 'hidden' }}>
            <LinearGradient colors={['rgba(168,85,247,0.2)', 'rgba(109,40,217,0.1)']} style={{ padding: Spacing.lg }}>
              <Text style={{ fontSize: FontSize.base, color: 'rgba(255,255,255,0.8)', lineHeight: 22, fontStyle: 'italic' }}>
                Your journey to transformation starts here
              </Text>
            </LinearGradient>
          </View>
        </QuestionLayout>
      </View>
    );
  }

  if (screen === 5) {
    return (
      <View style={{ flex: 1 }}>
        <QuestionLayout qNum={2} title="Before we begin, I have a few important questions for you." onBack={goBack} onNext={goNext} canNext={true} isMuted={isMuted} onToggleMute={toggleMute}>
          <View style={il.conf}>
            <Ionicons name="lock-closed" size={18} color={Colors.primaryLight} />
            <Text style={il.confTxt}>
              The more honest you are, the more personal Hera can feel. Everything you share is completely confidential.
            </Text>
          </View>
        </QuestionLayout>
      </View>
    );
  }

  if (screen === 6) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={3} title="First, what should I call you?" onBack={goBack} onNext={goNext} canNext={name.trim().length > 0} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={name} onChange={setName} placeholder="Your name..." /></QuestionLayout></View>);
  }

  if (screen === 7) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={4} title="Where do you live?" onBack={goBack} onNext={goNext} canNext={location.trim().length > 0} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={location} onChange={setLocation} placeholder="City, country..." /></QuestionLayout></View>);
  }

  if (screen === 8) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={5} title="How old are you?" onBack={goBack} onNext={goNext} canNext={age.trim().length > 0} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={age} onChange={v => setAge(v.replace(/[^0-9]/g, ''))} placeholder="Your age..." keyboardType="number-pad" /></QuestionLayout></View>);
  }

  if (screen === 9) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={6} title="What is your sexuality?" onBack={goBack} onNext={goNext} canNext={true} nextLabel="Continue" onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={sexuality} onChange={setSexuality} placeholder="Share however you like (optional)..." /></QuestionLayout></View>);
  }

  // ── Screen 10: Gender ───────────────────────────────────────────────────────
  if (screen === 10) {
    return (
      <View style={{ flex: 1 }}>
        <QuestionLayout qNum={7} title="What's your gender?" onBack={goBack} onNext={goNext} canNext={!!gender} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}>
          {['Female', 'Male', 'Non-binary', 'Prefer not to say'].map(opt => (
            <OptionCard key={opt} label={opt} selected={gender === opt} onSelect={() => setGender(opt)} />
          ))}
        </QuestionLayout>
      </View>
    );
  }

  if (screen === 11) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={8} title="Do you have kids?" onBack={goBack} onNext={goNext} canNext={!!kids} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}><YesNo value={kids} onChange={setKids} /></QuestionLayout></View>);
  }

  if (screen === 12) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={9} title={`${displayName}, what are you hoping changes in your life right now?`} onBack={goBack} onNext={goNext} canNext={goals.trim().length > 0} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={goals} onChange={setGoals} placeholder="Tell Hera what you want to change..." multiline /></QuestionLayout></View>);
  }

  if (screen === 13) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={10} title="Why does this matter so much to you right now?" onBack={goBack} onNext={goNext} canNext={motivation.trim().length > 0} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={motivation} onChange={setMotivation} placeholder="What will change if this came true..." multiline /></QuestionLayout></View>);
  }

  if (screen === 14) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={11} title="What feels like the biggest thing standing in your way right now?" onBack={goBack} onNext={goNext} canNext={obstacles.trim().length > 0} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={obstacles} onChange={setObstacles} placeholder="What's getting in your way..." multiline /></QuestionLayout></View>);
  }

  if (screen === 15) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={12} title="What's your relationship status?" onBack={goBack} onNext={goNext} canNext={!!relationship} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}>{['Single', 'In a relationship', 'Married', "It's complicated"].map(opt => (<OptionCard key={opt} label={opt} selected={relationship === opt} onSelect={() => setRelationship(opt)} />))}</QuestionLayout></View>);
  }

  if (screen === 16) {
    return (
      <View style={{ flex: 1 }}>
        <QuestionLayout qNum={13} title="Who are the people Hera should know matter most to you?" onBack={goBack} onNext={goNext} canNext={true} nextLabel={contacts.length > 0 ? 'Done' : 'Skip'} isMuted={isMuted} onToggleMute={toggleMute}>
          {contacts.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {contacts.map((c, i) => (
                <View key={i} style={il.chip}>
                  <Text style={{ fontSize: FontSize.sm, color: Colors.textWhite, fontWeight: '600' }}>{c.name}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSubtle }}>{c.relationship}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable onPress={() => setContactModal(true)} style={({ pressed }) => [il.addBtn, pressed && { opacity: 0.8 }]}>
            <Ionicons name="person-add" size={16} color={Colors.primaryLight} />
            <Text style={{ fontSize: FontSize.base, color: Colors.primaryLight, fontWeight: '600' }}>+ Add a Person</Text>
          </Pressable>
          <AddContactModal visible={contactModal} onAdd={c => setContacts(p => [...p, c])} onClose={() => setContactModal(false)} />
        </QuestionLayout>
      </View>
    );
  }

  if (screen === 17) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={14} title="What do you do for work?" onBack={goBack} onNext={goNext} canNext={career.trim().length > 0} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={career} onChange={setCareer} placeholder="Your profession..." /></QuestionLayout></View>);
  }

  if (screen === 18) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={15} title="How do you feel about your work?" onBack={goBack} onNext={goNext} canNext={!!workSentiment} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}>{['Love it', "It's fine for now", 'Ready for something new', 'Building on the side'].map(opt => (<OptionCard key={opt} label={opt} selected={workSentiment === opt} onSelect={() => setWorkSentiment(opt)} />))}</QuestionLayout></View>);
  }

  if (screen === 19) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={16} title={`Since we've never met, ${displayName}, what should I know about you to understand you better?`} onBack={goBack} onNext={goNext} canNext={selfDesc.trim().length > 0} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={selfDesc} onChange={setSelfDesc} placeholder="What should Hera know about you..." multiline /></QuestionLayout></View>);
  }

  if (screen === 20) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={17} title="Is there anything from your past that still shapes what you want today?" onBack={goBack} onNext={goNext} canNext={true} nextLabel="Continue" onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={pastShapes} onChange={setPastShapes} placeholder="Share anything you feel comfortable with (optional)..." multiline /></QuestionLayout></View>);
  }

  if (screen === 21) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={18} title="When you imagine your dream life, where are you living?" onBack={goBack} onNext={goNext} canNext={dreamLocation.trim().length > 0} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}><SInput value={dreamLocation} onChange={setDreamLocation} placeholder="City, country, beach, mountains..." /></QuestionLayout></View>);
  }

  if (screen === 22) {
    return (<View style={{ flex: 1 }}><QuestionLayout qNum={19} title="What kind of home would you want to live in?" onBack={goBack} onNext={goNext} canNext={!!homeType} onSkip={goNext} isMuted={isMuted} onToggleMute={toggleMute}><HomeGrid value={homeType} onChange={setHomeType} /></QuestionLayout></View>);
  }

  if (screen === 23) {
    const handleFinishQuestions = () => {
      // Pre-write goals to AsyncStorage so the home screen reads them on first mount
      const userName = name.trim() || 'Beautiful Soul';
      const goalsArr = goals.trim() ? [goals.trim()] : [];
      AsyncStorage.setItem(
        '@hera_user',
        JSON.stringify({ name: userName, goals: goalsArr, focusAreas: [], onboardingComplete: true, streak: 1 })
      ).catch(() => {});
      updateUser({ name: userName, goals: goalsArr, focusAreas: [], onboardingComplete: true });
      goNext();
    };
    return (
      <View style={{ flex: 1 }}>
        <QuestionLayout qNum={20} title="What kind of partner do you want to call in?" onBack={goBack} onNext={handleFinishQuestions} canNext={!!specificPerson} nextLabel="Generate My Profile" isMuted={isMuted} onToggleMute={toggleMute}>
          <SInput value={partnerManifest} onChange={setPartnerManifest} placeholder="Describe your ideal partner..." multiline />
          <View style={il.subQ}>
            <View style={il.subQLine} />
            <Text style={il.subQTxt}>Is there a specific person you're manifesting?</Text>
            <View style={il.subQLine} />
          </View>
          <YesNo value={specificPerson} onChange={setSpecificPerson} />
        </QuestionLayout>
      </View>
    );
  }

  if (screen === 24) {
    return (
      <View style={{ flex: 1 }}>
        <GeneratingScreen displayName={displayName} onDone={handleStartTrial} />
      </View>
    );
  }

  // ── Screen 25: Paywall ──────────────────────────────────────────────────
  const trialEndDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#080A18', '#0D1035', '#131838']} style={{ flex: 1, paddingTop: insets.top }}>
        <ScrollView
          contentContainerStyle={[pw.scroll, { paddingBottom: insets.bottom + 140 }]}
          showsVerticalScrollIndicator={false}
        >
          <Countdown />

          {/* Note from the team */}
          <View style={pw.teamNote}>
            <View style={pw.teamNoteHeader}>
              <Ionicons name="sparkles" size={14} color={Colors.primaryLight} />
              <Text style={pw.teamNoteTitle}>Note from the team</Text>
            </View>
            <Text style={pw.teamNoteTxt}>
              We built Hera because everyone deserves a guide who truly sees them. Your stories and profile are now ready — start your free 7-day trial and experience the transformation for yourself.
            </Text>
            <Text style={pw.teamSig}>— The Hera Team</Text>
          </View>

          <View style={pw.header}>
            <View style={pw.badge}>
              <Ionicons name="gift" size={12} color={Colors.gold} />
              <Text style={pw.badgeTxt}>7-DAY FREE TRIAL</Text>
            </View>
            <Text style={pw.title}>Unlock Your{'\n'}Full Potential</Text>
            <Text style={pw.sub}>
              Your personalized stories are ready. Try Hera Premium free for 7 days — no charge until your trial ends.
            </Text>
          </View>

          <View style={pw.note}>
            <Text style={{ fontSize: 20 }}>💜</Text>
            <Text style={pw.noteTxt}>
              We've crafted a deeply personalized journey just for you, {displayName}. Your profile is ready to guide every step.
            </Text>
          </View>

          <View style={pw.promiseRow}>
            {[
              ['card-outline', 'No charge today'],
              ['close-circle-outline', 'Cancel anytime'],
              ['lock-closed-outline', 'Secure & private'],
            ].map(([icon, t], i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name={icon as any} size={12} color={Colors.success} />
                <Text style={{ fontSize: 11, color: Colors.success, fontWeight: '600' }}>{t}</Text>
              </View>
            ))}
          </View>

          <Text style={pw.planLabel}>CHOOSE YOUR PLAN</Text>
          {PLANS.map(plan => (
            <Pressable
              key={plan.id}
              onPress={() => setSelectedPlan(plan.id)}
              style={({ pressed }) => [pw.plan, plan.highlight && pw.planHL, selectedPlan === plan.id && pw.planSel, pressed && { opacity: 0.88 }]}
            >
              {plan.highlight ? <LinearGradient colors={['rgba(168,85,247,0.1)', 'rgba(236,72,153,0.05)']} style={StyleSheet.absoluteFill} /> : null}
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[pw.planName, selectedPlan === plan.id && { color: Colors.textWhite }]}>{plan.label}</Text>
                  {plan.badge ? (
                    <View style={[pw.planBadge, plan.highlight
                      ? { backgroundColor: Colors.glassGold, borderColor: Colors.borderGold }
                      : { backgroundColor: Colors.glassPurple, borderColor: Colors.border }
                    ]}>
                      <Text style={[{ fontSize: 10, fontWeight: '700' as const }, { color: plan.highlight ? Colors.gold : Colors.primaryLight }]}>
                        {plan.badge}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {plan.monthly ? <Text style={{ fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' }}>{plan.monthly}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 1 }}>
                <Text style={[pw.planPrice, selectedPlan === plan.id && { color: Colors.gold }]}>{plan.price}</Text>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSubtle }}>{plan.period}</Text>
              </View>
              <View style={[pw.radio, selectedPlan === plan.id && pw.radioSel]}>
                {selectedPlan === plan.id ? <View style={pw.radioDot} /> : null}
              </View>
            </Pressable>
          ))}

          <View style={pw.reminderBox}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textSubtle} />
            <Text style={pw.reminderTxt}>
              7-day free trial ends on{' '}
              <Text style={{ color: Colors.textWhite, fontWeight: '600' }}>
                {trialEndDate}
              </Text>
              . Cancel anytime before then — no charge.
            </Text>
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[pw.cta, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Pressable
            onPress={handleStartTrial}
            style={({ pressed }) => [pw.ctaWrap, pressed && { opacity: 0.75 }]}
          >
            <LinearGradient colors={['#A855F7', '#EC4899']} style={pw.ctaBtn}>
              <Ionicons name="sparkles" size={17} color="white" />
              <Text style={pw.ctaTxt}>View My Plan Options</Text>
            </LinearGradient>
          </Pressable>
          <Text style={pw.ctaLegal}>No charge today · Cancel anytime · Secure Apple checkout</Text>
          <View style={pw.footerLinks}>
            <Pressable onPress={() => Linking.openURL('https://downloadhera.com/terms')} hitSlop={10}>
              <Text style={pw.footerLink}>Terms of Use</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ws = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingTop: Spacing.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  hero: { alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  logo: { width: 90, height: 90 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.glassGold, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderGold, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  badgeTxt: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: '700' },
  title: { fontSize: FontSize.xxxl, color: Colors.textWhite, fontWeight: '800', textAlign: 'center', lineHeight: 40 },
  sub: { fontSize: FontSize.base, color: Colors.textMuted, textAlign: 'center', lineHeight: 24 },
  feat: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.glassBg, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.glassBorder },
  featTxt: { fontSize: FontSize.base, color: Colors.textWhite, flex: 1, lineHeight: 21 },
  btnWrap: { borderRadius: Radius.xxl, overflow: 'hidden', ...Shadow.gold },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 17 },
  btnTxt: { fontSize: FontSize.md, color: 'white', fontWeight: '800' },
  appleWrap: { borderRadius: Radius.xxl, overflow: 'hidden' },
  apple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 15, borderRadius: Radius.xxl, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.06)' },
  appleTxt: { fontSize: FontSize.base, color: Colors.textWhite, fontWeight: '700' },
  legal: { fontSize: FontSize.xs, color: Colors.textSubtle, textAlign: 'center', lineHeight: 18 },
  legalLink: { color: Colors.primaryLight, fontWeight: '600' },
  fixedLoginBar: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(8,10,24,0.96)', paddingTop: 10, paddingHorizontal: Spacing.lg },
  loginLink: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)', backgroundColor: 'rgba(168,85,247,0.08)' },
  loginLinkTxt: { fontSize: FontSize.sm, color: 'rgba(192,132,252,0.75)', textAlign: 'center' },
  loginLinkBold: { fontWeight: '700', color: Colors.primaryLight },
});

const rf = StyleSheet.create({
  input: { backgroundColor: Colors.glassBg, borderWidth: 1.5, borderColor: Colors.borderGold, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.xl, color: Colors.gold, textAlign: 'center', fontWeight: '700', letterSpacing: 3 },
});

const il = StyleSheet.create({
  conf: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: 'rgba(168,85,247,0.14)', borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  confTxt: { flex: 1, fontSize: FontSize.base, color: Colors.textMuted, lineHeight: 22 },
  chip: { backgroundColor: Colors.glassPurple, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glassPurple },
  subQ: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  subQLine: { flex: 1, height: 1, backgroundColor: Colors.glassBorder },
  subQTxt: { fontSize: FontSize.sm, color: Colors.textSubtle, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
});

const pw = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.lg, gap: Spacing.lg, paddingTop: Spacing.xl },
  header: { alignItems: 'center', gap: Spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.glassGold, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.borderGold, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  badgeTxt: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: FontSize.xxl, color: Colors.textWhite, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  sub: { fontSize: FontSize.base, color: Colors.textMuted, textAlign: 'center', lineHeight: 24 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: 'rgba(168,85,247,0.18)', borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  noteTxt: { flex: 1, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
  promiseRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm },
  planLabel: { fontSize: FontSize.xs, color: Colors.textSubtle, fontWeight: '700', letterSpacing: 1.2 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, overflow: 'hidden' },
  planHL: { borderColor: 'rgba(168,85,247,0.4)' },
  planSel: { borderColor: Colors.gold, borderWidth: 2 },
  planName: { fontSize: FontSize.base, color: Colors.textMuted, fontWeight: '700' },
  planBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  planPrice: { fontSize: FontSize.lg, color: Colors.textMuted, fontWeight: '800' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: Spacing.sm },
  radioSel: { borderColor: Colors.gold },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold },
  reminderBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.glassBg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.glassBorder, padding: Spacing.md },
  reminderTxt: { flex: 1, fontSize: FontSize.xs, color: Colors.textSubtle, lineHeight: 18 },
  teamNote: { backgroundColor: 'rgba(168,85,247,0.08)', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(168,85,247,0.22)', padding: Spacing.lg, gap: Spacing.sm },
  teamNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamNoteTitle: { fontSize: FontSize.sm, color: Colors.primaryLight, fontWeight: '700' },
  teamNoteTxt: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.72)', lineHeight: 21 },
  teamSig: { fontSize: FontSize.xs, color: Colors.textSubtle, fontStyle: 'italic', textAlign: 'right' },
  cta: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm, backgroundColor: 'rgba(8,10,24,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  ctaWrap: { borderRadius: Radius.xxl, overflow: 'hidden', ...Shadow.gold },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 17 },
  ctaTxt: { fontSize: FontSize.base, color: 'white', fontWeight: '800' },
  ctaLegal: { fontSize: FontSize.xs, color: Colors.textSubtle, textAlign: 'center' },
  footerLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingBottom: 4 },
  footerLink: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.3)', textDecorationLine: 'underline' },
  footerDot: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.2)' },
});
