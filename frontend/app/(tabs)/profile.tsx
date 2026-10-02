import React, { useState, useCallback, useRef, useMemo, Component, ReactNode, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch, Modal, Linking, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@/src/utils/async-storage';
import { FunctionsHttpError } from '@/template/core/supabase-types';
import { Image } from 'expo-image';
import { useHera } from '@/hooks/useHera';
import {
  pickAvatarImage,
  uploadAvatar,
  removeAvatar,
  loadAvatarUrl,
} from '@/services/avatarService';
import { api } from '@/src/api';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { useAuth, useAlert } from '@/template';
import { Spacing, Radius, FontSize, ThemeColors } from '@/constants/theme';
import { requestNotificationPermissions, formatTime } from '@/services/notificationService';
import { ActivityIndicator } from 'react-native';
import { NotifSetting } from '@/contexts/HeraContext';
import type { SyncStatus } from '@/services/syncService';
import { resetOnboardingProgress } from '@/src/onboarding-progress';

// ── Error Boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; }
class ProfileErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.warn('[ProfileScreen] render error:', err.message); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, width: '100%', backgroundColor: '#080A18', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="settings-outline" size={40} color="#A855F7" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#A855F7', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Settings</Text>
          <Text style={{ color: 'rgba(192,132,252,0.6)', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
            Something went wrong loading your profile. Please restart the app.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const ACHIEVEMENTS = [
  { icon: '🌟', label: 'First Steps', unlocked: true },
  { icon: '🔥', label: 'Week Warrior', unlocked: true },
  { icon: '💜', label: 'Soul Writer', unlocked: true },
  { icon: '🔮', label: 'Vision Keeper', unlocked: true },
  { icon: '✨', label: 'Affirmer', unlocked: false },
  { icon: '🦋', label: 'Transformer', unlocked: false },
  { icon: '👑', label: 'Manifestor', unlocked: false },
  { icon: '🌙', label: 'Night Owl', unlocked: false },
];
const MORNING_PRESETS = [
  { hour: 5, minute: 0 }, { hour: 5, minute: 30 }, { hour: 6, minute: 0 }, { hour: 6, minute: 30 },
  { hour: 7, minute: 0 }, { hour: 7, minute: 30 }, { hour: 8, minute: 0 }, { hour: 8, minute: 30 },
  { hour: 9, minute: 0 }, { hour: 9, minute: 30 }, { hour: 10, minute: 0 },
];
const EVENING_PRESETS = [
  { hour: 17, minute: 0 }, { hour: 17, minute: 30 }, { hour: 18, minute: 0 }, { hour: 18, minute: 30 },
  { hour: 19, minute: 0 }, { hour: 19, minute: 30 }, { hour: 20, minute: 0 }, { hour: 20, minute: 30 },
  { hour: 21, minute: 0 }, { hour: 21, minute: 30 }, { hour: 22, minute: 0 },
];
type PickerType = 'morning' | 'evening';

function formatLastSync(iso: string | null): string {
  if (!iso) return 'Never synced';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

// ── Static modal styles (always dark for overlay context) ─────────────────────
const mSt = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, overflow: 'hidden' },
  sheetInner: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 36 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(168,85,247,0.35)', alignSelf: 'center', marginBottom: Spacing.sm },
  title:      { fontSize: FontSize.lg, color: '#FFFFFF', fontWeight: '700' },
  subtitle:   { fontSize: FontSize.xs, color: 'rgba(192,132,252,0.6)', marginTop: 2 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: 'rgba(168,85,247,0.06)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', padding: Spacing.md },
  helpRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: 'rgba(168,85,247,0.06)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', padding: Spacing.md },
  infoIcon:   { width: 34, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoTitle:  { fontSize: FontSize.sm, color: '#FFFFFF', fontWeight: '600' },
  infoDesc:   { fontSize: FontSize.xs, color: 'rgba(192,132,252,0.65)', lineHeight: 17, marginTop: 2 },
  linkRow:    { flexDirection: 'row', gap: Spacing.sm },
  linkBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: 'rgba(168,85,247,0.06)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' },
  linkTxt:    { fontSize: FontSize.sm, color: '#C084FC', fontWeight: '600' },
  versionRow: { alignItems: 'center', paddingVertical: Spacing.sm },
  versionTxt: { fontSize: FontSize.xs, color: 'rgba(192,132,252,0.4)' },
  closeBtn:   { backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: Radius.xl, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' },
  closeTxt:   { fontSize: FontSize.base, color: '#C084FC', fontWeight: '700' },
});

// Delete modal always dark
const delSt = StyleSheet.create({
  centeredWrap:     { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  card:             { width: '100%', borderRadius: Radius.xxl, borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.35)', padding: Spacing.xl, gap: Spacing.lg, alignItems: 'center' },
  iconCircle:       { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 2, borderColor: 'rgba(248,113,113,0.35)', alignItems: 'center', justifyContent: 'center' },
  title:            { fontSize: FontSize.xl, color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  subtitle:         { fontSize: FontSize.sm, color: 'rgba(192,132,252,0.7)', textAlign: 'center', lineHeight: 20 },
  warningBox:       { width: '100%', backgroundColor: 'rgba(248,113,113,0.07)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)', padding: Spacing.md, gap: 6 },
  warningItem:      { fontSize: FontSize.sm, color: 'rgba(192,132,252,0.7)', lineHeight: 20 },
  confirmWrap:      { width: '100%', gap: Spacing.sm },
  confirmLabel:     { fontSize: FontSize.sm, color: 'rgba(192,132,252,0.7)', textAlign: 'center', lineHeight: 20 },
  confirmInput:     { borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.3)', borderRadius: Radius.lg, padding: Spacing.md, fontSize: FontSize.base, textAlign: 'center', fontWeight: '700', letterSpacing: 3 },
  confirmInputReady:{ borderColor: '#F87171', backgroundColor: 'rgba(248,113,113,0.08)' },
  actions:          { width: '100%', gap: Spacing.sm },
  cancelBtn:        { paddingVertical: 14, borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)', backgroundColor: 'rgba(168,85,247,0.06)', alignItems: 'center' },
  cancelTxt:        { fontSize: FontSize.base, color: '#FFFFFF', fontWeight: '700' },
  deleteConfirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: Radius.xl, backgroundColor: '#F87171' },
  deleteConfirmTxt: { fontSize: FontSize.base, color: 'white', fontWeight: '700' },
  legalNote:        { fontSize: FontSize.xs, color: 'rgba(192,132,252,0.4)', textAlign: 'center', lineHeight: 17 },
  otpBoxRow:        { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  otpBox:           { width: 58, height: 68, borderRadius: Radius.xl, borderWidth: 2, borderColor: '#3A3A50', backgroundColor: '#1E1E2E', fontSize: 28, color: '#FFFFFF', textAlign: 'center', fontWeight: '800' },
  otpBoxFilled:     { borderColor: '#A855F7', backgroundColor: '#1E1E2E' },
  otpBoxFocused:    { borderColor: '#8B5CF6', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.65, shadowRadius: 10, elevation: 10 },
  otpHint:          { fontSize: FontSize.xs, color: 'rgba(192,132,252,0.5)', marginTop: 2 },
  resendBtn:        { alignItems: 'center', paddingVertical: Spacing.sm },
  resendTxt:        { fontSize: FontSize.sm, color: '#C084FC', fontWeight: '600' },
});

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container:       { flex: 1, width: '100%', backgroundColor: c.background ?? '#080A18' },
  scroll:          { flex: 1 },
  content:         { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, zIndex: 100, elevation: 10 },
  topBarTitle:     { fontSize: FontSize.lg, color: c.textWhite, fontWeight: '700', flex: 1, textAlign: 'center' },
  topBarBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  profileCard:     { borderRadius: Radius.xxl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: c.border },
  avatarWrap:      { position: 'relative', alignSelf: 'center' },
  avatar:          { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.gold },
  avatarText:      { fontSize: FontSize.xxl, color: c.gold, fontWeight: '800' },
  avatarImg:       { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: c.gold },
  avatarCameraBtn: { position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.background },
  removeAvatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  profileName:     { fontSize: FontSize.xl, color: c.textWhite, fontWeight: '700', textAlign: 'center', flexShrink: 1, maxWidth: '85%' },
  streakBadge:     { backgroundColor: c.glassGold, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: c.borderGold },
  streakText:      { fontSize: FontSize.sm, color: c.gold, fontWeight: '600' },
  goalsRow:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, alignSelf: 'stretch' },
  goalBadge:       { backgroundColor: c.glassPurple, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: c.border, maxWidth: '48%', flexDirection: 'row', alignItems: 'flex-end' },
  goalBadgeText:   { fontSize: FontSize.xs, color: c.primaryLight, fontWeight: '600', textTransform: 'capitalize', flexShrink: 1 },
  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard:        { flex: 1, minWidth: '45%', backgroundColor: c.card, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: c.border, gap: 4 },
  statVal:         { fontSize: FontSize.xl, color: c.gold, fontWeight: '700' },
  statLabel:       { fontSize: FontSize.xs, color: c.textMuted, textAlign: 'center', lineHeight: 16 },
  section:         { gap: Spacing.md },
  sectionTitle:    { fontSize: FontSize.sm, color: c.textSubtle, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  achieveGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  achieveItem:     { width: '22%', alignItems: 'center', gap: 5, padding: Spacing.sm, backgroundColor: c.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border },
  achieveIcon:     { fontSize: 24 },
  achieveLabel:    { fontSize: FontSize.xs - 1, color: c.textMuted, textAlign: 'center', fontWeight: '500' },
  focusRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  focusBadge:      { backgroundColor: c.glassPurple, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: c.border, maxWidth: '48%' },
  focusBadgeText:  { fontSize: FontSize.sm, color: c.primaryLight, fontWeight: '600', textTransform: 'capitalize', flexShrink: 1 },
  settingsCard:    { backgroundColor: c.card, borderRadius: Radius.xl, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  settingRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  settingDivider:  { borderBottomWidth: 1, borderBottomColor: c.border },
  settingLeft:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1, flexShrink: 1, minWidth: 0 },
  settingIcon:     { width: 34, height: 34, borderRadius: Radius.md, backgroundColor: c.glassPurple, alignItems: 'center', justifyContent: 'center' },
  settingLabel:    { fontSize: FontSize.base, color: c.textWhite, fontWeight: '500', flexShrink: 1 },
  settingRight:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 0 },
  upgradeText:     { color: c.gold, fontWeight: '600' },
  reminderBlock:   { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  reminderHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  reminderDesc:    { fontSize: FontSize.sm, color: c.textSubtle, marginTop: 2, flexShrink: 1 },
  timeRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: c.glassBg, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: c.border, alignSelf: 'flex-start' },
  timeText:        { fontSize: FontSize.sm, color: c.gold, fontWeight: '700' },
  timeEdit:        { fontSize: FontSize.sm, color: c.textSubtle, marginLeft: 4 },
  notifNote:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.sm },
  notifNoteText:   { fontSize: FontSize.xs, color: c.textSubtle, flex: 1, lineHeight: 16 },
  resetBtn:        { alignItems: 'center', paddingVertical: Spacing.sm },
  resetText:       { fontSize: FontSize.sm, color: c.textSubtle, fontWeight: '500' },
  deleteBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm },
  deleteText:      { fontSize: FontSize.sm, color: c.error, fontWeight: '600' },
  version:         { textAlign: 'center', fontSize: FontSize.xs, color: c.textSubtle, paddingBottom: Spacing.sm },
  syncRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  syncLeft:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1, minWidth: 0 },
  syncDot:         { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  syncTextWrap:    { gap: 2, flexShrink: 1, minWidth: 0 },
  syncBtn:         { width: 32, height: 32, borderRadius: 16, backgroundColor: c.glassBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  signedRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  signedLeft:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  signedAvatar:    { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  signedLabel:     { fontSize: FontSize.sm, color: c.textWhite, fontWeight: '600' },
  signedEmail:     { fontSize: FontSize.xs, color: c.textSubtle, flexShrink: 1, maxWidth: 180 },
  signOutBtn:      { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.lg, backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.border },
  signOutText:     { fontSize: FontSize.xs, color: c.error, fontWeight: '600' },
  signInWrap:      { margin: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden' },
  signInBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: Radius.lg },
  signInText:      { fontSize: FontSize.base, color: 'white', fontWeight: '700' },
  dividerLine:     { height: 1, backgroundColor: c.border },
  // Subscription
  subCard:         { borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: c.borderGold },
  subInner:        { padding: Spacing.lg },
  subBadge:        { alignSelf: 'flex-start', backgroundColor: c.glassGold, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: c.borderGold },
  subBadgeTxt:     { fontSize: FontSize.xs, color: c.gold, fontWeight: '700' },
  subPlanName:     { fontSize: FontSize.base, color: c.textWhite, fontWeight: '700', flexShrink: 1 },
  subPlanSub:      { fontSize: FontSize.xs, color: c.textSubtle, lineHeight: 17, flexShrink: 1 },
  manageBtn:       { backgroundColor: c.glassGold, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.borderGold },
  manageTxt:       { fontSize: FontSize.sm, color: c.gold, fontWeight: '700' },
  upgradeCard:     { borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: c.borderGold },
  upgradeInner:    { padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  upgradeLeft:     { flex: 1, gap: 6 },
  upgradeTitle:    { fontSize: FontSize.base, color: c.textWhite, fontWeight: '700' },
  upgradeDesc:     { fontSize: FontSize.xs, color: c.textMuted, lineHeight: 17 },
  upgradePill:     { backgroundColor: c.glassBg, paddingHorizontal: Spacing.sm + 2, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: c.border },
  upgradePillTxt:  { fontSize: 10, color: c.textSubtle },
  upgradeBtn:      { paddingHorizontal: Spacing.lg, paddingVertical: 11, borderRadius: Radius.lg },
  upgradeBtnTxt:   { fontSize: FontSize.sm, color: 'white', fontWeight: '700' },
});

// ── Time Picker Modal ─────────────────────────────────────────────────────────
function TimePickerModal({ visible, type, current, onConfirm, onClose }: { visible: boolean; type: PickerType; current: NotifSetting; onConfirm: (h: number, m: number) => void; onClose: () => void }) {
  const { colors: c, isDark } = useTheme();
  const presets = type === 'morning' ? MORNING_PRESETS : EVENING_PRESETS;
  const [selected, setSelected] = useState({ hour: current.hour, minute: current.minute });
  const modalBg = isDark ? (['#0D0F22', '#080A18'] as const) : (['#FFFFFF', '#F5F3FF'] as const);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={mSt.overlay} onPress={onClose} />
      <View style={mSt.sheet}>
        <LinearGradient colors={modalBg} style={{ padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xl + 8 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: Spacing.sm }} />
          <Text style={[mSt.title, { color: c.textWhite }]}>{type === 'morning' ? '☀️ Morning Reminder' : '🌙 Evening Reminder'}</Text>
          <Text style={{ fontSize: FontSize.sm, color: c.textMuted, textAlign: 'center', marginTop: -6 }}>Choose your daily reminder time</Text>
          <View style={{ alignSelf: 'center', backgroundColor: c.glassGold, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: c.borderGold, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginVertical: Spacing.sm }}>
            <Text style={{ fontSize: FontSize.xxxl, color: c.gold, fontWeight: '800', letterSpacing: 1 }}>{formatTime(selected.hour, selected.minute)}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2, gap: Spacing.sm }}>
            {presets.map((p, i) => {
              const isActive = p.hour === selected.hour && p.minute === selected.minute;
              return (
                <Pressable key={i} onPress={() => setSelected(p)} style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: isActive ? c.gold : c.border, backgroundColor: isActive ? c.glassGold : c.glassBg }}>
                  <Text style={{ fontSize: FontSize.sm, color: isActive ? c.gold : c.textMuted, fontWeight: isActive ? '700' : '500' }}>{formatTime(p.hour, p.minute)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.glassBg, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: c.border }}>
            <Ionicons name="sparkles" size={14} color={c.gold} />
            <Text style={{ fontSize: FontSize.sm, color: c.textMuted, flex: 1, lineHeight: 18 }}>A fresh affirmation from your goals will be delivered daily</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
            <Pressable onPress={onClose} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.glassBg, borderRadius: Radius.xl, borderWidth: 1, borderColor: c.border }}>
              <Text style={{ fontSize: FontSize.base, color: c.textMuted, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onConfirm(selected.hour, selected.minute)} style={{ flex: 2, borderRadius: Radius.xl, overflow: 'hidden' }}>
              <LinearGradient colors={['#A855F7', '#EC4899']} style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: FontSize.base, color: 'white', fontWeight: '700' }}>Set Reminder</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

// ── Profile Screen ────────────────────────────────────────────────────────────
function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark, toggleTheme } = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const { user, updateUser, journalEntries, visionItems, favoriteAffirmations, notifMorning, notifEvening, updateNotifMorning, updateNotifEvening, syncStatus, lastSyncedAt, syncNow, isAuthenticated } = useHera();
  const { user: authUser, logout } = useAuth();
  const { showAlert } = useAlert();
  const { isSubscribed, isTrial, plan, planLabel, subscriptionEnd, openPortal } = useSubscription();

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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Load saved avatar from the profile
  useEffect(() => {
    if (!authUser?.id) return;
    loadAvatarUrl().then(setAvatarUrl).catch(() => {});
  }, [authUser?.id]);

  const handlePickAvatar = useCallback(async () => {
    if (!authUser?.id) {
      showAlert('Sign In Required', 'Please sign in to upload a custom avatar.');
      return;
    }
    const picked = await pickAvatarImage();
    if (picked.status === 'cancelled') return;
    if (picked.status === 'denied') {
      showAlert(
        'Photo Access Needed',
        'Allow photo access to choose a profile picture.',
        picked.canAskAgain
          ? [{ text: 'OK' }]
          : [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }],
      );
      return;
    }
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(picked.uri, picked.name, picked.type);
      setAvatarUrl(url);
    } catch (e: any) {
      showAlert('Upload Failed', e.message || 'Could not upload photo. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  }, [authUser, showAlert]);

  const handleRemoveAvatar = useCallback(() => {
    showAlert('Remove Photo', 'Reset to the default crystal avatar?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await removeAvatar();
            setAvatarUrl(null);
          } catch (e: any) {
            showAlert('Error', e.message || 'Could not remove photo.');
          }
        },
      },
    ]);
  }, [authUser, showAlert]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>('morning');
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [goalDetail, setGoalDetail] = useState<string | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'otp' | 'success'>('confirm');
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [deletionEmail, setDeletionEmail] = useState('');
  const [focusedOtpIndex, setFocusedOtpIndex] = useState<number | null>(null);
  const otpRefs = useRef<any[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);
  const otpString = otpCode.join('');

  // Defensive data access with fallbacks
  const safeUser = user ?? { name: '', goals: [], focusAreas: [], onboardingComplete: false, streak: 1 };
  const displayName = safeUser?.name || 'Beautiful Soul';
  const initials = displayName.split(' ').slice(0, 2).map((n: string) => n[0] || '').join('').toUpperCase() || 'H';
  const safeGoals = safeUser?.goals ?? [];
  const safeFocusAreas = safeUser?.focusAreas ?? [];
  const safeStreak = safeUser?.streak ?? 1;
  const safeJournalCount = journalEntries?.length ?? 0;
  const safeVisionCount = visionItems?.length ?? 0;
  const safeFavCount = favoriteAffirmations?.length ?? 0;

  const handleOtpChange = useCallback((text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otpCode]; next[index] = digit; setOtpCode(next);
    if (digit && index < 3) otpRefs.current[index + 1]?.focus();
  }, [otpCode]);

  const handleOtpKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      const next = [...otpCode]; next[index - 1] = ''; setOtpCode(next); otpRefs.current[index - 1]?.focus();
    }
  }, [otpCode]);

  const handleSendDeletionOTP = useCallback(async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') { showAlert('Confirmation Required', 'Please type DELETE in the field to confirm.'); return; }
    setDeleteLoading(true);
    try {
      const { getSupabaseClient } = await import('@/template');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      // No cloud session — delete local data only (no OTP needed)
      if (!session) {
        setDeleteStep('success');
        setDeleteLoading(false);
        return;
      }

      const email = session.user.email ?? '';
      if (!email) { showAlert('Error', 'Unable to retrieve account email.'); setDeleteLoading(false); return; }
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) { showAlert('Error', error.message || 'Failed to send verification code.'); setDeleteLoading(false); return; }
      setDeletionEmail(email); setOtpCode(['', '', '', '']); setDeleteStep('otp');
      startResendCooldown();
    } catch (e: any) { showAlert('Error', e.message || 'Something went wrong.'); }
    finally { setDeleteLoading(false); }
  }, [deleteConfirmText, logout, showAlert]);

  const handleVerifyAndDelete = useCallback(async () => {
    if (otpString.length < 4) return;
    setOtpLoading(true);
    try {
      const { getSupabaseClient } = await import('@/template');
      const supabase = getSupabaseClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: deletionEmail, token: otpString, type: 'email' });
      if (verifyError) { showAlert('Invalid Code', 'The code is incorrect or expired.'); setOtpCode(['', '', '', '']); otpRefs.current[0]?.focus(); return; }
      const { error } = await supabase.functions.invoke('delete-account', {});
      if (error) { let msg = error.message; if (error instanceof FunctionsHttpError) { try { msg = await error.context?.text() || msg; } catch {} } showAlert('Deletion Failed', msg || 'Unable to delete account.'); return; }
      setDeleteStep('success');
    } catch (e: any) { showAlert('Error', e.message || 'Something went wrong.'); }
    finally { setOtpLoading(false); }
  }, [otpCode, deletionEmail, logout, showAlert]);

  const handleResendDeletionOTP = useCallback(async () => {
    if (!deletionEmail || resendCooldown > 0) return;
    try {
      const { getSupabaseClient } = await import('@/template');
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({ email: deletionEmail, options: { shouldCreateUser: false } });
      if (!error) {
        setOtpCode(['', '', '', '']);
        startResendCooldown();
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch {}
  }, [deletionEmail, resendCooldown, startResendCooldown]);

  // Auto-cleanup and redirect after successful account deletion
  useEffect(() => {
    if (deleteStep !== 'success') return;
    const timer = setTimeout(async () => {
      await AsyncStorage.clear().catch(() => {});
      resetOnboardingProgress();
      try { await logout(); } catch {}
      setDeleteVisible(false);
      router.replace('/onboarding');
    }, 2800);
    return () => clearTimeout(timer);
  }, [deleteStep, logout]);

  const handleReset = () => {
    showAlert('Reset Journey', 'This will clear all your manifestation preferences and restart your onboarding. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive', onPress: async () => {
          try {
            // 1. Wipe every Hera AsyncStorage key
            await AsyncStorage.multiRemove([
              'hera_onboarded',
              '@hera_user',
              '@hera_journal',
              '@hera_vision',
              '@hera_chat',
              '@hera_mood_today',
              '@hera_favorites',
              '@hera_last_open',
              '@hera_notif_settings',
              '@hera_last_sync',
            ]);

            // 2. Reset in-memory context state to defaults
            updateUser({ name: '', goals: [], focusAreas: [], onboardingComplete: false, streak: 1 });

            // 3. If signed in, wipe backend records too
            if (authUser?.id) await api('/account/reset', { method: 'POST' }).catch(() => {});
            resetOnboardingProgress();
          } catch {}

          // 4. Navigate to onboarding
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const handleSignOut = () => {
    showAlert('Sign Out', 'Your data will remain on this device. Sign out of cloud sync?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const handleToggle = useCallback(async (type: PickerType, value: boolean) => {
    if (value) {
      if (Platform.OS === 'web') { showAlert('Mobile Only', 'Daily reminders work in the Hera app on your phone.'); return; }
      const perm = await requestNotificationPermissions();
      if (perm === 'unavailable') {
        showAlert('Preview Limitation', 'Daily reminders work in the installed Hera app on your phone. They can\'t run inside the Expo Go preview.', [{ text: 'OK' }]);
        return;
      }
      if (perm !== 'granted') {
        showAlert(
          'Turn On Reminders',
          'Allow notifications so Hera can send your daily affirmation.',
          perm === 'blocked'
            ? [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
            : [{ text: 'OK' }],
        );
        return;
      }
      setPickerType(type); setPickerVisible(true);
    } else {
      if (type === 'morning') await updateNotifMorning({ ...notifMorning, enabled: false });
      else await updateNotifEvening({ ...notifEvening, enabled: false });
    }
  }, [notifMorning, notifEvening, updateNotifMorning, updateNotifEvening, showAlert]);

  const handlePickerConfirm = useCallback(async (hour: number, minute: number) => {
    setPickerVisible(false);
    const setting: NotifSetting = { enabled: true, hour, minute };
    if (pickerType === 'morning') await updateNotifMorning(setting);
    else await updateNotifEvening(setting);
    showAlert('Reminder Set! 🔔', `Your ${pickerType} affirmation is scheduled for ${formatTime(hour, minute)} every day.`);
  }, [pickerType, updateNotifMorning, updateNotifEvening, showAlert]);

  const statusConfig: Record<SyncStatus, { color: string; icon: string; label: string }> = {
    idle:    { color: c.textSubtle, icon: 'cloud-outline', label: formatLastSync(lastSyncedAt) },
    syncing: { color: c.primary,    icon: 'sync',          label: 'Syncing…' },
    success: { color: c.success,    icon: 'cloud-done',    label: formatLastSync(lastSyncedAt) },
    error:   { color: c.error,      icon: 'cloud-offline', label: 'Sync failed — tap to retry' },
  };
  const syncCfg = statusConfig[syncStatus];

  const bgColors = isDark ? (['#080A18', '#0F1025', '#131838'] as const) : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);
  const profileGradient = isDark ? (['rgba(168,85,247,0.18)', 'rgba(109,40,217,0.1)'] as const) : (['rgba(196,112,122,0.1)', 'rgba(196,112,122,0.04)'] as const);
  const avatarGradient: [string, string, string] = isDark ? ['#A855F7', '#7C3AED', '#5B21B6'] : ['#C4707A', '#D4939A', '#F5C2C7'];

  return (
    <Animated.View style={[s.container, { backgroundColor: c.background ?? '#080A18' }, screenAnimStyle]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Sticky top navigation bar */}
      <View style={[s.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [s.topBarBtn, pressed && { opacity: 0.65 }]}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={18} color={c.textSubtle} />
        </Pressable>
        <Text style={s.topBarTitle}>Settings</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [s.topBarBtn, { backgroundColor: c.glassPurple, borderColor: c.border }, pressed && { opacity: 0.65 }]}
          accessibilityLabel="Done"
        >
          <Ionicons name="checkmark" size={18} color={c.primary} />
        </Pressable>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingTop: Spacing.sm, paddingBottom: insets.bottom + 90 }]} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <LinearGradient colors={profileGradient} style={s.profileCard}>
          <View style={s.avatarWrap}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={s.avatarImg}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient colors={avatarGradient} style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </LinearGradient>
            )}
            <Pressable
              onPress={handlePickAvatar}
              disabled={avatarUploading}
              style={({ pressed }) => [s.avatarCameraBtn, pressed && { opacity: 0.75 }]}
              accessibilityLabel="Upload profile photo"
              hitSlop={8}
            >
              {avatarUploading
                ? <ActivityIndicator size={12} color="white" />
                : <Ionicons name="camera" size={13} color="white" />}
            </Pressable>
          </View>
          <Text style={s.profileName} numberOfLines={2} ellipsizeMode="tail">{displayName}</Text>
          <View style={s.streakBadge}><Text style={s.streakText}>🔥 {safeStreak}-day streak</Text></View>
          {avatarUrl ? (
            <Pressable onPress={handleRemoveAvatar} style={({ pressed }) => [s.removeAvatarBtn, pressed && { opacity: 0.65 }]}>
              <Ionicons name="trash-outline" size={12} color={c.textSubtle} />
              <Text style={{ fontSize: FontSize.xs, color: c.textSubtle }}>Remove Photo</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handlePickAvatar} disabled={avatarUploading} style={({ pressed }) => [s.removeAvatarBtn, pressed && { opacity: 0.65 }]}>
              <Ionicons name="cloud-upload-outline" size={12} color={c.primaryLight} />
              <Text style={{ fontSize: FontSize.xs, color: c.primaryLight }}>Upload Photo</Text>
            </Pressable>
          )}
          {safeGoals.length > 0 && (
            <View style={s.goalsRow}>
              {safeGoals.slice(0, 4).map((g, i) => (
                <Pressable key={i} style={s.goalBadge} onPress={() => setGoalDetail(g)} accessibilityLabel={`Goal: ${g}. Tap to read in full`}>
                  <Text style={s.goalBadgeText} numberOfLines={1}>{g}</Text>
                  {g.length > 42 ? <Text style={{ fontSize: 9, color: c.textSubtle, fontWeight: '700', flexShrink: 0 }} numberOfLines={1}> See more</Text> : null}
                </Pressable>
              ))}
            </View>
          )}
        </LinearGradient>

        {/* Goal detail — full text in a translucent container */}
        <Modal visible={!!goalDetail} transparent animationType="fade" onRequestClose={() => setGoalDetail(null)}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}
            onPress={() => setGoalDetail(null)}
          >
            <Pressable
              onPress={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 420, borderRadius: Radius.xl, borderWidth: 1, borderColor: c.border,
                backgroundColor: isDark ? 'rgba(18,20,42,0.82)' : 'rgba(255,255,255,0.88)',
                padding: Spacing.lg, gap: Spacing.md,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={14} color={c.primaryLight} />
                <Text style={{ fontSize: FontSize.sm, color: c.primaryLight, fontWeight: '700' }}>What you're manifesting</Text>
              </View>
              <Text style={{ fontSize: FontSize.base, color: c.textWhite, lineHeight: 22 }}>{goalDetail}</Text>
              <Pressable onPress={() => setGoalDetail(null)} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
                <Text style={{ fontSize: FontSize.xs, color: c.textSubtle, fontWeight: '600' }}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Subscription */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Your Plan</Text>
          {isSubscribed ? (
            <View style={s.subCard}>
              <LinearGradient colors={plan === 'yearly' ? ['rgba(168,85,247,0.14)', 'rgba(109,40,217,0.07)'] : [c.glassGold, 'rgba(244,114,182,0.04)']} style={s.subInner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={s.subBadge}><Text style={s.subBadgeTxt}>{isTrial ? '🔮 Free Trial' : plan === 'yearly' ? '✨ Annual' : '👑 Monthly'}</Text></View>
                    <Text style={s.subPlanName}>Hera {planLabel}</Text>
                    {subscriptionEnd ? <Text style={s.subPlanSub}>Renews {new Date(subscriptionEnd).toLocaleDateString()}</Text> : null}
                  </View>
                  <Pressable onPress={openPortal} style={({ pressed }) => [s.manageBtn, pressed && { opacity: 0.75 }]}><Text style={s.manageTxt}>App Store</Text></Pressable>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <Pressable onPress={() => router.push('/subscription')} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]} accessibilityLabel="Upgrade to premium">
              <View style={s.upgradeCard}>
                <LinearGradient colors={[c.glassGold, c.glassPurple]} style={s.upgradeInner}>
                  <View style={s.upgradeLeft}>
                    <Text style={s.upgradeTitle}>Start Your Free Trial ✨</Text>
                    <Text style={s.upgradeDesc}>Unlock unlimited AI coaching, visualizations, and more</Text>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {['No payment today', 'Cancel anytime'].map((t, i) => <View key={i} style={s.upgradePill}><Text style={s.upgradePillTxt}>{t}</Text></View>)}
                    </View>
                  </View>
                  <LinearGradient colors={[c.gold, c.primaryDark]} style={s.upgradeBtn}><Text style={s.upgradeBtnTxt}>Try Free</Text></LinearGradient>
                </LinearGradient>
              </View>
            </Pressable>
          )}
        </View>

        {/* Cloud Sync */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Cloud Sync</Text>
          <View style={s.settingsCard}>
            <View style={s.syncRow}>
              <View style={s.syncLeft}>
                <View style={[s.syncDot, { backgroundColor: syncCfg.color + '25', borderColor: syncCfg.color + '55' }]}>
                  <Ionicons name={syncCfg.icon as any} size={14} color={syncCfg.color} />
                </View>
                <View style={s.syncTextWrap}>
                  <Text style={{ fontSize: FontSize.sm, color: syncCfg.color, fontWeight: '600' }} numberOfLines={1}>{isAuthenticated ? 'Cloud Sync' : 'Local Only'}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: c.textSubtle }} numberOfLines={1}>{isAuthenticated ? syncCfg.label : 'Sign in to enable sync'}</Text>
                </View>
              </View>
              {isAuthenticated && syncStatus !== 'syncing' && <Pressable onPress={syncNow} hitSlop={12} style={s.syncBtn}><Ionicons name="refresh" size={16} color={c.textSubtle} /></Pressable>}
            </View>
            <View style={s.dividerLine} />
            {isAuthenticated ? (
              <View style={s.signedRow}>
                <View style={s.signedLeft}>
                  <LinearGradient colors={[c.primary, c.primaryDark]} style={s.signedAvatar}><Ionicons name="person" size={14} color="white" /></LinearGradient>
                  <View>
                    <Text style={s.signedLabel}>Signed in</Text>
                    <Text style={s.signedEmail} numberOfLines={1}>{authUser?.email ?? 'Hera account'}</Text>
                  </View>
                </View>
                <Pressable onPress={handleSignOut} hitSlop={10} style={s.signOutBtn}><Text style={s.signOutText}>Sign out</Text></Pressable>
              </View>
            ) : (
              <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [s.signInWrap, pressed && { opacity: 0.85 }]}>
                <LinearGradient colors={[c.primary, c.primaryDark]} style={s.signInBtn}>
                  <Ionicons name="cloud-upload" size={16} color="white" />
                  <Text style={s.signInText}>Sign in to enable cloud sync</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          {[
            { val: safeJournalCount, label: 'Journal\nEntries' },
            { val: safeVisionCount,  label: 'Vision\nItems' },
            { val: safeFavCount,     label: 'Saved\nAffirmations' },
            { val: safeStreak,       label: 'Day\nStreak' },
          ].map((stat, i) => (
            <View key={i} style={s.statCard}>
              <Text style={s.statVal}>{stat.val}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Achievements</Text>
          <View style={s.achieveGrid}>
            {ACHIEVEMENTS.map((a, i) => (
              <View key={i} style={[s.achieveItem, !a.unlocked && { opacity: 0.45 }]}>
                <Text style={[s.achieveIcon, !a.unlocked && { opacity: 0.3 }]}>{a.icon}</Text>
                <Text style={[s.achieveLabel, !a.unlocked && { color: c.textSubtle }]}>{a.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Focus Areas */}
        {safeFocusAreas.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Focus Areas</Text>
            <View style={s.focusRow}>
              {safeFocusAreas.map((f, i) => <View key={i} style={s.focusBadge}><Text style={s.focusBadgeText} numberOfLines={1}>{f}</Text></View>)}
            </View>
          </View>
        )}

        {/* Appearance — Theme Toggle */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Appearance</Text>
          <View style={s.settingsCard}>
            <View style={s.settingRow}>
              <View style={s.settingLeft}>
                <View style={[s.settingIcon, { backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(108,92,231,0.1)', flexShrink: 0 }]}>
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={17} color={c.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.settingLabel} numberOfLines={1}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: c.textSubtle, marginTop: 1 }}>
                    {isDark ? 'Ethereal deep space' : 'Warm airy feel'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: c.border, true: c.primary + 'AA' }}
                thumbColor={isDark ? c.primaryLight : '#FFFFFF'}
              />
            </View>
          </View>
        </View>

        {/* Daily Reminders */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Daily Reminders</Text>
          <View style={s.settingsCard}>
            <View style={[s.reminderBlock, s.settingDivider]}>
              <View style={s.reminderHeader}>
                <View style={s.settingLeft}>
                  <View style={[s.settingIcon, { backgroundColor: 'rgba(245,158,11,0.12)', flexShrink: 0 }]}>
                    <Ionicons name="sunny" size={17} color={c.warning} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.settingLabel} numberOfLines={1}>Morning Affirmation</Text>
                    <Text style={s.reminderDesc} numberOfLines={1}>Daily uplift to start your day</Text>
                  </View>
                </View>
                <Switch value={notifMorning.enabled} onValueChange={v => handleToggle('morning', v)} trackColor={{ false: c.border, true: c.primary }} thumbColor="white" />
              </View>
              {notifMorning.enabled && (
                <Pressable onPress={() => { setPickerType('morning'); setPickerVisible(true); }} style={s.timeRow}>
                  <Ionicons name="time-outline" size={15} color={c.gold} />
                  <Text style={s.timeText}>{formatTime(notifMorning.hour, notifMorning.minute)}</Text>
                  <Text style={s.timeEdit}>Change</Text>
                </Pressable>
              )}
            </View>
            <View style={s.reminderBlock}>
              <View style={s.reminderHeader}>
                <View style={s.settingLeft}>
                  <View style={[s.settingIcon, { backgroundColor: 'rgba(168,85,247,0.15)', flexShrink: 0 }]}>
                    <Ionicons name="moon" size={17} color={c.primaryLight} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.settingLabel} numberOfLines={1}>Evening Reflection</Text>
                    <Text style={s.reminderDesc} numberOfLines={1}>Wind down with intention</Text>
                  </View>
                </View>
                <Switch value={notifEvening.enabled} onValueChange={v => handleToggle('evening', v)} trackColor={{ false: c.border, true: c.primary }} thumbColor="white" />
              </View>
              {notifEvening.enabled && (
                <Pressable onPress={() => { setPickerType('evening'); setPickerVisible(true); }} style={s.timeRow}>
                  <Ionicons name="time-outline" size={15} color={c.primaryLight} />
                  <Text style={[s.timeText, { color: c.primaryLight }]}>{formatTime(notifEvening.hour, notifEvening.minute)}</Text>
                  <Text style={s.timeEdit}>Change</Text>
                </Pressable>
              )}
            </View>
          </View>
          <View style={s.notifNote}>
            <Ionicons name="sparkles" size={13} color={c.gold} />
            <Text style={s.notifNoteText}>Affirmations are personalized based on your goals and focus areas</Text>
          </View>
        </View>

        {/* Account */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <View style={s.settingsCard}>
            {[
              { icon: 'diamond', iconBg: 'rgba(244,114,182,0.12)', iconColor: c.gold, label: 'Hera Premium', right: isSubscribed ? 'Active' : 'Upgrade', onPress: () => router.push('/subscription'), divider: true },
              { icon: 'shield-checkmark', iconBg: c.glassPurple, iconColor: c.primaryLight, label: 'Privacy & Data', right: null, onPress: () => setPrivacyVisible(true), divider: true },
              { icon: 'help-circle', iconBg: c.glassPurple, iconColor: c.primaryLight, label: 'Help & Support', right: null, onPress: () => setHelpVisible(true), divider: true },
            ].map((item, i) => (
              <Pressable key={i} onPress={item.onPress} style={({ pressed }) => [s.settingRow, item.divider && s.settingDivider, pressed && { opacity: 0.75 }]}>
                <View style={s.settingLeft}>
                  <View style={[s.settingIcon, { backgroundColor: item.iconBg, flexShrink: 0 }]}><Ionicons name={item.icon as any} size={17} color={item.iconColor} /></View>
                  <Text style={s.settingLabel} numberOfLines={1}>{item.label}</Text>
                </View>
                <View style={s.settingRight}>
                  {item.right ? <Text style={s.upgradeText}>{item.right}</Text> : null}
                  <Ionicons name="chevron-forward" size={15} color={c.textSubtle} />
                </View>
              </Pressable>
            ))}

          </View>
        </View>

        {/* Legal & Terms */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Legal & Terms</Text>
          <View style={s.settingsCard}>
            <Pressable
              onPress={() => Linking.openURL('https://app.notion.com/p/Hera-Terms-of-Use-EULA-3ccf86af27cf808eb8c3ee4bcae433d8')}
              style={({ pressed }) => [s.settingRow, s.settingDivider, pressed && { opacity: 0.75 }]}
            >
              <View style={s.settingLeft}>
                <View style={[s.settingIcon, { backgroundColor: 'rgba(168,85,247,0.12)', flexShrink: 0 }]}>
                  <Ionicons name="document-text" size={17} color={c.primaryLight} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.settingLabel} numberOfLines={1}>Terms of Service (EULA)</Text>
                  <Text style={{ fontSize: FontSize.xs, color: c.textSubtle, marginTop: 1 }} numberOfLines={1}>Apple Standard License Agreement</Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={15} color={c.textSubtle} />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://downloadhera.com/privacy')}
              style={({ pressed }) => [s.settingRow, pressed && { opacity: 0.75 }]}
            >
              <View style={s.settingLeft}>
                <View style={[s.settingIcon, { backgroundColor: 'rgba(52,211,153,0.1)', flexShrink: 0 }]}>
                  <Ionicons name="shield-checkmark" size={17} color="#34D399" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.settingLabel} numberOfLines={1}>Privacy Policy</Text>
                  <Text style={{ fontSize: FontSize.xs, color: c.textSubtle, marginTop: 1 }} numberOfLines={1}>How we protect your data</Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={15} color={c.textSubtle} />
            </Pressable>
          </View>
        </View>

        <Pressable onPress={handleReset} style={s.resetBtn}><Text style={s.resetText}>Reset Journey</Text></Pressable>
        <Pressable onPress={handleSignOut} style={[s.deleteBtn, { marginBottom: -Spacing.sm }]}>
          <Ionicons name="log-out-outline" size={14} color={c.textMuted} />
          <Text style={[s.deleteText, { color: c.textMuted }]}>Log Out</Text>
        </Pressable>
        <Pressable onPress={() => { setDeleteConfirmText(''); setDeleteStep('confirm'); setOtpCode(['', '', '', '']); setDeleteVisible(true); }} style={s.deleteBtn}>
          <Ionicons name="trash-outline" size={14} color={c.error} />
          <Text style={s.deleteText}>Delete Account</Text>
        </Pressable>
        <Text style={s.version}>Hera v1.0.0 • Made with love ✨</Text>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => !deleteLoading && !otpLoading && deleteStep !== 'success' && setDeleteVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={[mSt.overlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]} onPress={() => !deleteLoading && !otpLoading && deleteStep !== 'success' && setDeleteVisible(false)} />
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <LinearGradient colors={['#0D0F22', '#080A18']} style={delSt.card}>
            {deleteStep === 'confirm' && (
              <>
                <View style={delSt.iconCircle}><Ionicons name="warning" size={28} color="#F87171" /></View>
                <Text style={delSt.title}>Delete Account</Text>
                <Text style={delSt.subtitle}>This action is <Text style={{ color: '#F87171', fontWeight: '700' }}>permanent and irreversible</Text>. All your data will be erased immediately.</Text>
                <View style={delSt.warningBox}>
                  {['All journal entries', 'All vision board items', 'Entire chat history', 'Cloud sync data', 'Your Hera account'].map((item, i) => <Text key={i} style={delSt.warningItem}>{item}</Text>)}
                </View>
                <View style={delSt.confirmWrap}>
                  <Text style={delSt.confirmLabel}>Type <Text style={{ color: '#F87171', fontWeight: '800', fontFamily: 'monospace' }}>DELETE</Text> to confirm</Text>
                  <TextInput value={deleteConfirmText} onChangeText={setDeleteConfirmText} placeholder="Type DELETE here" placeholderTextColor={isDark ? 'rgba(192,132,252,0.3)' : 'rgba(26,10,20,0.3)'} style={[delSt.confirmInput, { backgroundColor: isDark ? 'rgba(168,85,247,0.06)' : 'rgba(0,0,0,0.05)', color: isDark ? '#FFFFFF' : '#1A0A14' }, deleteConfirmText.trim().toUpperCase() === 'DELETE' && delSt.confirmInputReady]} autoCapitalize="characters" autoCorrect={false} editable={!deleteLoading} />
                </View>
                <View style={delSt.actions}>
                  <Pressable onPress={() => setDeleteVisible(false)} disabled={deleteLoading} style={({ pressed }) => [delSt.cancelBtn, pressed && { opacity: 0.75 }]}><Text style={delSt.cancelTxt}>Keep My Account</Text></Pressable>
                  <Pressable onPress={handleSendDeletionOTP} disabled={deleteLoading || deleteConfirmText.trim().toUpperCase() !== 'DELETE'} style={({ pressed }) => [delSt.deleteConfirmBtn, (deleteLoading || deleteConfirmText.trim().toUpperCase() !== 'DELETE') && { opacity: 0.45 }, pressed && { opacity: 0.75 }]}>
                    <Ionicons name="shield-checkmark" size={15} color="white" />
                    <Text style={delSt.deleteConfirmTxt}>{deleteLoading ? 'Sending Code...' : 'Delete Forever'}</Text>
                  </Pressable>
                </View>
                <Text style={delSt.legalNote}>Need help instead? Contact support@hera.app</Text>
              </>
            )}
            {deleteStep === 'otp' && (
              <>
                <View style={[delSt.iconCircle, { borderColor: 'rgba(168,85,247,0.4)', backgroundColor: 'rgba(168,85,247,0.12)' }]}><Ionicons name="mail" size={28} color="#C084FC" /></View>
                <Text style={delSt.title}>Verify Your Identity</Text>
                <Text style={[delSt.subtitle, { marginBottom: 4 }]}>{`A 4-digit code has been sent to\n`}<Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{deletionEmail}</Text></Text>
                <View style={{ width: '100%', alignItems: 'center', gap: Spacing.sm }}>
                  <View style={delSt.otpBoxRow}>
                    {[0, 1, 2, 3].map(i => (
                      <TextInput
                        key={i}
                        ref={r => { otpRefs.current[i] = r; }}
                        value={otpCode[i]}
                        onChangeText={t => handleOtpChange(t, i)}
                        onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                        onFocus={() => setFocusedOtpIndex(i)}
                        onBlur={() => setFocusedOtpIndex(null)}
                        keyboardType="number-pad"
                        maxLength={1}
                        style={[
                          delSt.otpBox,
                          otpCode[i] ? delSt.otpBoxFilled : undefined,
                          focusedOtpIndex === i ? delSt.otpBoxFocused : undefined,
                        ]}
                        autoFocus={i === 0}
                        editable={!otpLoading}
                        selectTextOnFocus
                      />
                    ))}
                  </View>
                  <Text style={delSt.otpHint}>{otpString.length}/4 digits entered</Text>
                </View>
                <View style={delSt.actions}>
                  <Pressable onPress={() => { setDeleteStep('confirm'); setOtpCode(['', '', '', '']); }} disabled={otpLoading} style={({ pressed }) => [delSt.cancelBtn, pressed && { opacity: 0.75 }]}><Text style={delSt.cancelTxt}>Back</Text></Pressable>
                  <Pressable onPress={handleVerifyAndDelete} disabled={otpLoading || otpString.length < 4} style={({ pressed }) => [delSt.deleteConfirmBtn, (otpLoading || otpString.length < 4) && { opacity: 0.45 }, pressed && { opacity: 0.75 }]}>
                    <Ionicons name="trash" size={15} color="white" />
                    <Text style={delSt.deleteConfirmTxt}>{otpLoading ? 'Verifying...' : 'Verify & Delete'}</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={handleResendDeletionOTP}
                  disabled={resendCooldown > 0 || otpLoading}
                  hitSlop={12}
                  style={[delSt.resendBtn, (resendCooldown > 0 || otpLoading) && { opacity: 0.42 }]}
                >
                  {resendCooldown > 0 ? (
                    <Text style={[delSt.resendTxt, { color: 'rgba(192,132,252,0.4)' }]}>Resend in {resendCooldown}s</Text>
                  ) : (
                    <Text style={delSt.resendTxt}>Resend code</Text>
                  )}
                </Pressable>
              </>
            )}
            {deleteStep === 'success' && (
              <>
                <View style={[delSt.iconCircle, { borderColor: 'rgba(52,211,153,0.45)', backgroundColor: 'rgba(52,211,153,0.12)', width: 72, height: 72, borderRadius: 36 }]}>
                  <Ionicons name="checkmark-circle" size={36} color="#34D399" />
                </View>
                <Text style={[delSt.title, { color: '#34D399', fontSize: FontSize.xl }]}>Account Deleted</Text>
                <Text style={[delSt.subtitle, { lineHeight: 22 }]}>
                  Your account and data have been{' '}
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>permanently deleted.</Text>
                </Text>
                <View style={[delSt.warningBox, { borderColor: 'rgba(52,211,153,0.2)', backgroundColor: 'rgba(52,211,153,0.06)', gap: 8 }]}>
                  {['Journal entries cleared', 'Vision board cleared', 'Chat history cleared', 'Cloud data removed', 'Account permanently removed'].map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark" size={13} color="#34D399" />
                      <Text style={[delSt.warningItem, { color: 'rgba(52,211,153,0.85)' }]}>{item}</Text>
                    </View>
                  ))}
                </View>
                <Text style={{ fontSize: FontSize.sm, color: 'rgba(192,132,252,0.5)', textAlign: 'center', fontStyle: 'italic' }}>
                  Returning to welcome screen...
                </Text>
              </>
            )}
          </LinearGradient>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <TimePickerModal visible={pickerVisible} type={pickerType} current={pickerType === 'morning' ? notifMorning : notifEvening} onConfirm={handlePickerConfirm} onClose={() => setPickerVisible(false)} />

      {/* Privacy Modal */}
      <Modal visible={privacyVisible} transparent animationType="fade" onRequestClose={() => setPrivacyVisible(false)}>
        <Pressable style={mSt.overlay} onPress={() => setPrivacyVisible(false)} />
        <View style={mSt.sheet}>
          <LinearGradient colors={isDark ? ['#0D0F22', '#080A18'] : ['#FFFFFF', '#F5F3FF']} style={mSt.sheetInner}>
            <View style={mSt.handle} />
            <View style={mSt.headerRow}>
              <View style={[mSt.headerIcon, { backgroundColor: 'rgba(168,85,247,0.18)' }]}><Ionicons name="shield-checkmark" size={22} color="#C084FC" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[mSt.title, { color: c.textWhite }]}>Privacy & Data</Text>
                <Text style={[mSt.subtitle, { color: c.textSubtle }]}>How Hera protects your journey</Text>
              </View>
            </View>
            {[
              { icon: 'lock-closed', color: '#34D399', title: 'End-to-End Security', desc: 'Your journal entries and chats are protected with row-level security — only you can access your data.' },
              { icon: 'eye-off', color: '#C084FC', title: 'No Data Selling', desc: 'Hera never sells your personal data to third parties. Your journey is yours alone.' },
              { icon: 'cloud', color: '#F472B6', title: 'Cloud Storage', desc: 'When signed in, your data is encrypted and stored securely in Hera Cloud. You can delete it anytime.' },
              { icon: 'person-remove', color: '#EC4899', title: 'Delete Your Data', desc: 'You can request full data deletion at any time by contacting support@hera.app.' },
            ].map((item, i) => (
              <View key={i} style={mSt.infoRow}>
                <View style={[mSt.infoIcon, { backgroundColor: item.color + '20' }]}><Ionicons name={item.icon as any} size={16} color={item.color} /></View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[mSt.infoTitle, { color: c.textWhite }]}>{item.title}</Text>
                  <Text style={[mSt.infoDesc, { color: c.textMuted }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
            <View style={mSt.linkRow}>
              <Pressable onPress={() => Linking.openURL('https://app.notion.com/p/Hera-Terms-of-Use-EULA-3ccf86af27cf808eb8c3ee4bcae433d8')} style={mSt.linkBtn}><Ionicons name="document-outline" size={14} color="#C084FC" /><Text style={mSt.linkTxt}>Terms of Use</Text></Pressable>
            </View>
            <Pressable onPress={() => setPrivacyVisible(false)} style={({ pressed }) => [mSt.closeBtn, pressed && { opacity: 0.75 }]}><Text style={mSt.closeTxt}>Done</Text></Pressable>
          </LinearGradient>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={helpVisible} transparent animationType="fade" onRequestClose={() => setHelpVisible(false)}>
        <Pressable style={mSt.overlay} onPress={() => setHelpVisible(false)} />
        <View style={mSt.sheet}>
          <LinearGradient colors={isDark ? ['#0D0F22', '#080A18'] : ['#FFFFFF', '#F5F3FF']} style={mSt.sheetInner}>
            <View style={mSt.handle} />
            <View style={mSt.headerRow}>
              <View style={[mSt.headerIcon, { backgroundColor: 'rgba(244,114,182,0.15)' }]}><Ionicons name="help-circle" size={22} color="#F472B6" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[mSt.title, { color: c.textWhite }]}>Help & Support</Text>
                <Text style={[mSt.subtitle, { color: c.textSubtle }]}>We are here for you</Text>
              </View>
            </View>
            {[
              { icon: 'mail', color: '#F472B6', label: 'Email Support', sub: 'support@hera.app', onPress: () => Linking.openURL('mailto:support@hera.app') },
              { icon: 'chatbubble-ellipses', color: '#C084FC', label: 'Live Chat', sub: 'Chat with the Hera team', onPress: () => {} },
              { icon: 'book', color: '#34D399', label: 'FAQs & Guides', sub: 'Answers to common questions', onPress: () => {} },
              { icon: 'star', color: '#EC4899', label: 'Rate Hera', sub: 'Share your experience', onPress: () => Linking.openURL('https://apps.apple.com/app/hera') },
            ].map((item, i) => (
              <Pressable key={i} onPress={item.onPress} style={({ pressed }) => [mSt.helpRow, pressed && { opacity: 0.75 }]}>
                <View style={[mSt.infoIcon, { backgroundColor: item.color + '20' }]}><Ionicons name={item.icon as any} size={16} color={item.color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[mSt.infoTitle, { color: c.textWhite }]}>{item.label}</Text>
                  <Text style={[mSt.infoDesc, { color: c.textMuted }]}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={c.textSubtle} />
              </Pressable>
            ))}
            <View style={mSt.versionRow}><Text style={mSt.versionTxt}>Hera v1.0.0 • Made with love</Text></View>
            <Pressable onPress={() => setHelpVisible(false)} style={({ pressed }) => [mSt.closeBtn, pressed && { opacity: 0.75 }]}><Text style={mSt.closeTxt}>Done</Text></Pressable>
          </LinearGradient>
        </View>
      </Modal>
    </Animated.View>
  );
}

export default function ProfileScreenWrapper() {
  return (
    <ProfileErrorBoundary>
      <ProfileScreen />
    </ProfileErrorBoundary>
  );
}
