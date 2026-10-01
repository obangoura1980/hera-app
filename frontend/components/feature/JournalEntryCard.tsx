import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius, FontSize, ThemeColors } from '@/constants/theme';
import { JournalEntry } from '@/contexts/HeraContext';

const MOOD_EMOJIS = ['', '😔', '😕', '😊', '😁', '🤩'];
const TYPE_COLORS: Record<string, string> = {
  gratitude: '#10B981', reflection: '#7C3AED', wins: '#D4AF37', daily: '#3B82F6',
};
const TYPE_LABELS: Record<string, string> = {
  gratitude: 'Gratitude', reflection: 'Reflection', wins: 'Daily Win', daily: 'Daily',
};

interface Props { entry: JournalEntry; onDelete?: () => void; onPress?: () => void; }

const createStyles = (c: ThemeColors) => StyleSheet.create({
  card:    { backgroundColor: c.card, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: c.border, gap: Spacing.sm, marginBottom: Spacing.sm },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  right:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge:   { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt:{ fontSize: FontSize.xs, fontWeight: '600', letterSpacing: 0.3 },
  mood:    { fontSize: 17 },
  title:   { fontSize: FontSize.md, color: c.textWhite, fontWeight: '600', flexShrink: 1 },
  content: { fontSize: FontSize.sm, color: c.textMuted, lineHeight: 20, flexShrink: 1 },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date:    { fontSize: FontSize.xs, color: c.textSubtle },
});

export function JournalEntryCard({ entry, onDelete, onPress }: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const dateStr = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const color = TYPE_COLORS[entry.type] || c.primaryLight;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress ? { opacity: 0.82, transform: [{ scale: 0.985 }] } : undefined]}
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.badgeTxt, { color }]}>{TYPE_LABELS[entry.type]}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.mood}>{MOOD_EMOJIS[entry.mood]}</Text>
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={15} color={c.textSubtle} />
            </Pressable>
          )}
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{entry.title}</Text>
      <Text style={styles.content} numberOfLines={3} ellipsizeMode="tail">{entry.content}</Text>
      <View style={styles.footer}>
        <Text style={styles.date}>{dateStr}</Text>
        {onPress && <Ionicons name="chevron-forward" size={13} color={c.textSubtle} />}
      </View>
    </Pressable>
  );
}
