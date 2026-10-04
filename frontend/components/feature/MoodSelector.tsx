import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius, FontSize, ThemeColors } from '@/constants/theme';

const MOODS = [
  { value: 1, emoji: '😔', label: 'Low' },
  { value: 2, emoji: '😕', label: 'Okay' },
  { value: 3, emoji: '😊', label: 'Good' },
  { value: 4, emoji: '😁', label: 'Great' },
  { value: 5, emoji: '🤩', label: 'Amazing' },
];

interface MoodSelectorProps {
  selected: number | null;
  onSelect: (mood: number) => void;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  row:           { flexDirection: 'row', gap: Spacing.xs },
  btn:           { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: 2, borderRadius: Radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.glassBg, gap: 4 },
  selected:      { borderColor: c.gold, backgroundColor: c.glassGold },
  emoji:         { fontSize: 22 },
  label:         { fontSize: FontSize.xs, color: c.textMuted, fontWeight: '500' },
  labelSelected: { color: c.gold },
});

export function MoodSelector({ selected, onSelect }: MoodSelectorProps) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);

  return (
    <View style={styles.row}>
      {MOODS.map(m => (
        <Pressable
          key={m.value}
          onPress={() => onSelect(m.value)}
          style={[styles.btn, selected === m.value && styles.selected]}
        >
          <Text style={styles.emoji}>{m.emoji}</Text>
          <Text style={[styles.label, selected === m.value && styles.labelSelected]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{m.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
