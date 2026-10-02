import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHera } from '@/hooks/useHera';
import { useTheme } from '@/hooks/useTheme';
import { JOURNAL_PROMPTS } from '@/services/heraAI';
import { Spacing, Radius, FontSize, ThemeColors } from '@/constants/theme';
import { JournalEntryCard } from '@/components/feature/JournalEntryCard';
import { MoodSelector } from '@/components/feature/MoodSelector';
import { Button } from '@/components/ui/Button';
import { useAlert } from '@/template';
import { useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';



type JType = 'all' | 'gratitude' | 'reflection' | 'wins' | 'daily';
const TABS: { key: JType; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '📋' },
  { key: 'gratitude', label: 'Gratitude', emoji: '🙏' },
  { key: 'reflection', label: 'Reflect', emoji: '🌀' },
  { key: 'wins', label: 'Wins', emoji: '🏆' },
  { key: 'daily', label: 'Daily', emoji: '☀️' },
];
const TYPE_OPTS = [
  { key: 'gratitude' as const, label: '🙏 Gratitude' },
  { key: 'reflection' as const, label: '🌀 Reflect' },
  { key: 'wins' as const, label: '🏆 Win' },
  { key: 'daily' as const, label: '☀️ Daily' },
];
const MOOD_EMOJIS = ['', '😔', '😕', '😊', '😁', '🤩'];
const TYPE_COLORS: Record<string, string> = {
  gratitude: '#65B891', reflection: '#9B8AFB', wins: '#F4D35E', daily: '#60A5FA',
};
const TYPE_LABELS: Record<string, string> = {
  gratitude: '🙏 Gratitude', reflection: '🌀 Reflection', wins: '🏆 Daily Win', daily: '☀️ Daily',
};

// ── Detail View ───────────────────────────────────────────────────────────────
interface DetailViewProps {
  entry: { id: string; date: string; title: string; content: string; mood: number; type: string };
  onClose: () => void;
  onDelete: () => void;
}
function DetailView({ entry, onClose, onDelete }: DetailViewProps) {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();
  const typeColor = TYPE_COLORS[entry.type] || c.primaryLight;
  const typeLabel = TYPE_LABELS[entry.type] || entry.type;
  const dateStr = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = new Date(entry.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const wordCount = entry.content.trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={onClose} hitSlop={12} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-down" size={20} color={c.textMuted} />
          </Pressable>
          <View style={{ paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, backgroundColor: typeColor + '18', borderColor: typeColor + '50' }}>
            <Text style={{ fontSize: FontSize.sm, color: typeColor, fontWeight: '700' }}>{typeLabel}</Text>
          </View>
          <Pressable onPress={onDelete} hitSlop={12} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trash-outline" size={18} color={c.error} />
          </Pressable>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: Spacing.lg, paddingTop: Spacing.md, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.glassBg, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md }}>
          {[
            { content: MOOD_EMOJIS[entry.mood] || '😊', label: 'Mood', emoji: true },
            { content: null, label: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), icon: 'calendar-outline' },
            { content: null, label: timeStr, icon: 'time-outline' },
            { content: null, label: `${wordCount}w · ${readMin}min`, icon: 'document-text-outline' },
          ].map((item, i, arr) => (
            <React.Fragment key={i}>
              <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                {item.emoji ? <Text style={{ fontSize: 18 }}>{item.content}</Text> : <Ionicons name={item.icon as any} size={16} color={c.textSubtle} />}
                <Text style={{ fontSize: FontSize.xs, color: c.textSubtle, textAlign: 'center' }}>{item.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={{ width: 1, height: 28, backgroundColor: c.border }} />}
            </React.Fragment>
          ))}
        </View>
        <Text style={{ fontSize: FontSize.sm, color: c.textSubtle, fontWeight: '500' }}>{dateStr}</Text>
        <Text style={{ fontSize: FontSize.xxl, color: c.textWhite, fontWeight: '700', lineHeight: 34 }}>{entry.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: typeColor }} />
          <View style={{ flex: 1, height: 1.5, borderRadius: 1, backgroundColor: typeColor + '30' }} />
        </View>
        <Text style={{ fontSize: FontSize.base, color: c.textMuted, lineHeight: 28, letterSpacing: 0.15 }}>{entry.content}</Text>
        {entry.mood > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, borderColor: typeColor + '35', backgroundColor: typeColor + '0A' }}>
            <Text style={{ fontSize: 26, marginTop: 2 }}>{MOOD_EMOJIS[entry.mood]}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: FontSize.sm, color: typeColor, fontWeight: '700' }}>Mood when written</Text>
              <Text style={{ fontSize: FontSize.sm, color: c.textMuted, lineHeight: 19 }}>
                {entry.mood === 1 ? 'You were going through something tough. That takes courage to document.' :
                 entry.mood === 2 ? 'A quieter day — and that is perfectly okay.' :
                 entry.mood === 3 ? 'You were in a balanced, steady space.' :
                 entry.mood === 4 ? 'You were feeling great — that energy shows.' :
                 'You were radiating peak energy when you wrote this!'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: c.background },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title:         { fontSize: FontSize.xxl, color: c.textWhite, fontWeight: '700' },
  subtitle:      { fontSize: FontSize.sm, color: c.textMuted, marginTop: 2 },
  addGradient:   { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full },
  statsRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, marginHorizontal: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, borderColor: c.border, marginBottom: Spacing.md },
  statItem:      { flex: 1, alignItems: 'center', gap: 2 },
  divider:       { width: 1, height: 30, backgroundColor: c.border },
  statVal:       { fontSize: FontSize.xl, color: c.textWhite, fontWeight: '700' },
  statLabel:     { fontSize: FontSize.xs, color: c.textMuted },
  filterWrap:    { marginBottom: Spacing.sm },
  filterRow:     { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  tab:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, borderRadius: Radius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.glassBg },
  tabActive:     { borderColor: c.primaryLight, backgroundColor: c.glassPurple },
  tabEmoji:      { fontSize: 13 },
  tabText:       { fontSize: FontSize.sm, color: c.textMuted, fontWeight: '500' },
  tabTextActive: { color: c.primaryLight, fontWeight: '600' },
  list:          { flex: 1 },
  listContent:   { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  empty:         { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyEmoji:    { fontSize: 52 },
  emptyTitle:    { fontSize: FontSize.xl, color: c.textWhite, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: FontSize.base, color: c.textMuted, textAlign: 'center', lineHeight: 24, paddingHorizontal: Spacing.lg },
  emptyBtn:      { marginTop: Spacing.md },
  // Modal
  modalContent:  { padding: Spacing.xl, gap: Spacing.md },
  handle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: Spacing.sm },
  modalTitle:    { fontSize: FontSize.xl, color: c.textWhite, fontWeight: '700', textAlign: 'center' },
  typeRow:       { gap: Spacing.sm },
  typeChip:      { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, borderRadius: Radius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.glassBg },
  typeChipActive:{ borderColor: c.primaryLight, backgroundColor: c.glassPurple },
  typeText:      { fontSize: FontSize.sm, color: c.textMuted, fontWeight: '500' },
  typeTextActive:{ color: c.primaryLight, fontWeight: '600' },
  promptCard:    { backgroundColor: c.glassBg, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, padding: Spacing.md, gap: 4 },
  promptText:    { fontSize: FontSize.sm, color: c.textMuted, fontStyle: 'italic', lineHeight: 20 },
  promptHint:    { fontSize: FontSize.xs, color: c.primaryLight, fontWeight: '600' },
  input:         { backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.base, color: c.textWhite },
  contentInput:  { minHeight: 120, textAlignVertical: 'top' },
  moodLabel:     { fontSize: FontSize.sm, color: c.textMuted, fontWeight: '600' },
  modalActions:  { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  // Detail modal
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  detailSheet:   { maxHeight: '92%', borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, overflow: 'hidden' },
});

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const { journalEntries, addJournalEntry, deleteJournalEntry } = useHera();
  const { showAlert } = useAlert();

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

  const [filter, setFilter] = useState<JType>('all');
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState<'gratitude' | 'reflection' | 'wins' | 'daily'>('gratitude');
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryMood, setEntryMood] = useState(3);
  const [detailEntry, setDetailEntry] = useState<(typeof journalEntries)[0] | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const openDetail = useCallback((entry: (typeof journalEntries)[0]) => { setDetailEntry(entry); setDetailVisible(true); }, []);
  const closeDetail = useCallback(() => { setDetailVisible(false); setTimeout(() => setDetailEntry(null), 300); }, []);

  const filtered = useMemo(() => filter === 'all' ? journalEntries : journalEntries.filter(e => e.type === filter), [journalEntries, filter]);
  const prompt = useMemo(() => { const list = JOURNAL_PROMPTS[entryType] || JOURNAL_PROMPTS.daily; return list[Math.floor(Math.random() * list.length)]; }, [entryType]);
  const avgMood = useMemo(() => { if (!journalEntries.length) return 0; return Math.round(journalEntries.reduce((a, e) => a + e.mood, 0) / journalEntries.length); }, [journalEntries]);

  const handleSave = useCallback(() => {
    const trimmedContent = entryContent.trim();
    if (!trimmedContent) return;
    addJournalEntry({ title: entryTitle.trim() || 'My Entry', content: trimmedContent, mood: entryMood, type: entryType });
    // Reset form
    setEntryTitle('');
    setEntryContent('');
    setEntryMood(3);
    setEntryType('gratitude');
    setShowModal(false);
    // Reset filter to 'all' so the new entry is always visible
    setFilter('all');
  }, [entryContent, entryTitle, entryMood, entryType, addJournalEntry]);
  const handleDelete = (id: string) => {
    showAlert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            deleteJournalEntry(id);
          },
        },
      ]
    );
  };
  const handleCloseModal = useCallback(() => { setEntryTitle(''); setEntryContent(''); setEntryMood(3); setEntryType('gratitude'); setShowModal(false); }, []);

  const STATS = [
    { val: journalEntries.length, label: 'Entries' },
    { val: avgMood > 0 ? MOOD_EMOJIS[avgMood] : '—', label: 'Avg Mood' },
    { val: journalEntries.filter(e => e.type === 'gratitude').length, label: 'Gratitude' },
    { val: journalEntries.filter(e => e.type === 'wins').length, label: 'Wins' },
  ];

  const bgColors = isDark ? (['#080A18', '#0F1025', '#131838'] as const) : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);
  const modalBgColors = isDark ? (['#0D0F22', '#080A18'] as const) : (['#FFFFFF', '#FEF0F2'] as const);

  return (
    <Animated.View style={[s.container, screenAnimStyle]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      <View style={[{ paddingTop: insets.top + Spacing.sm }]}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Journal</Text>
            <Text style={s.subtitle}>Your sacred space for reflection</Text>
          </View>
          <Pressable onPress={() => setShowModal(true)} style={{ borderRadius: Radius.full }} hitSlop={8}>
            <LinearGradient colors={[c.primary, c.primaryDark]} style={[s.addGradient, { overflow: 'hidden', borderRadius: Radius.full }]}>
              <Ionicons name="add" size={22} color="white" />
            </LinearGradient>
          </Pressable>
        </View>

        <View style={s.statsRow}>
          {STATS.map((stat, i) => (
            <React.Fragment key={i}>
              <View style={s.statItem}>
                <Text style={s.statVal}>{stat.val}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
              {i < STATS.length - 1 && <View style={s.divider} />}
            </React.Fragment>
          ))}
        </View>

        <View style={s.filterWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {TABS.map(t => (
              <Pressable key={t.key} onPress={() => setFilter(t.key)} style={[s.tab, filter === t.key && s.tabActive]}>
                <Text style={s.tabEmoji}>{t.emoji}</Text>
                <Text style={[s.tabText, filter === t.key && s.tabTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <FlatList
        style={s.list}
        data={filtered}
        keyExtractor={e => e.id}
        renderItem={({ item }) => (
          <JournalEntryCard entry={item} onPress={() => openDetail(item)} onDelete={() => handleDelete(item.id)} />
        )}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📓</Text>
            <Text style={s.emptyTitle}>Begin your journey here</Text>
            <Text style={s.emptySubtitle}>Every entry is a step forward in your transformation</Text>
            <Button title="Write First Entry" onPress={() => setShowModal(true)} variant="primary" style={s.emptyBtn} />
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={closeDetail}>
        <Pressable style={s.detailOverlay} onPress={closeDetail}>
          <Pressable style={s.detailSheet} onPress={e => e.stopPropagation()}>
            <LinearGradient colors={modalBgColors} style={{ flex: 1 }}>
              {detailEntry ? <DetailView entry={detailEntry} onClose={closeDetail} onDelete={() => { const idToDelete = detailEntry.id; closeDetail(); setTimeout(() => handleDelete(idToDelete), 350); }} /> : null}
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Entry Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={handleCloseModal}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCloseModal} />
          <View style={{ borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, overflow: 'hidden', paddingBottom: insets.bottom + Spacing.lg }}>
            <LinearGradient colors={modalBgColors} style={s.modalContent}>
              <View style={s.handle} />
              <Text style={s.modalTitle}>New Entry</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeRow}>
                {TYPE_OPTS.map(t => (
                  <Pressable key={t.key} onPress={() => setEntryType(t.key)} style={[s.typeChip, entryType === t.key && s.typeChipActive]}>
                    <Text style={[s.typeText, entryType === t.key && s.typeTextActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={s.promptCard}>
                <Text style={s.promptText}>💡 "{prompt}"</Text>
                <Text style={s.promptHint}>Use as inspiration</Text>
              </View>

              <TextInput value={entryTitle} onChangeText={setEntryTitle} placeholder="Title (optional)" placeholderTextColor={c.textSubtle} style={s.input} />
              <TextInput value={entryContent} onChangeText={setEntryContent} placeholder="Write freely, without judgment..." placeholderTextColor={c.textSubtle} style={[s.input, s.contentInput]} multiline numberOfLines={5} autoFocus textAlignVertical="top" />
              <Text style={s.moodLabel}>How are you feeling?</Text>
              <MoodSelector selected={entryMood} onSelect={setEntryMood} />
              <View style={s.modalActions}>
                <Button title="Cancel" onPress={handleCloseModal} variant="ghost" style={{ flex: 1 }} />
                <Button title="Save Entry" onPress={handleSave} variant="primary" style={{ flex: 2 }} disabled={!entryContent.trim()} />
              </View>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Animated.View>
  );
}
