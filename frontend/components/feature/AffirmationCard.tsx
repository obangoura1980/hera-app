import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius, FontSize, Shadow, ThemeColors } from '@/constants/theme';

interface AffirmationCardProps {
  affirmation: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  category?: string;
  variant?: 'hero' | 'compact';
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  heroCard:    { borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: c.borderGold, alignItems: 'center', gap: Spacing.md },
  goldLine:    { width: 44, height: 3, backgroundColor: c.gold, borderRadius: 2 },
  category:    { fontSize: FontSize.xs, color: c.gold, fontWeight: '700', letterSpacing: 2 },
  heroText:    { fontSize: FontSize.md, color: '#FFFFFF', fontWeight: '500', textAlign: 'center', lineHeight: 28, fontStyle: 'italic' },
  favBtn:      { padding: Spacing.sm },
  compactCard: { backgroundColor: c.glassBg, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  compactText: { flex: 1, fontSize: FontSize.sm, color: c.textMuted, fontStyle: 'italic', lineHeight: 20 },
});

export function AffirmationCard({ affirmation, isFavorite, onToggleFavorite, category, variant = 'compact' }: AffirmationCardProps) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);

  if (variant === 'hero') {
    return (
      <LinearGradient colors={['rgba(91,33,182,0.88)', 'rgba(59,7,100,0.95)']} style={[styles.heroCard, Shadow.gold]}>
        <View style={styles.goldLine} />
        {category && <Text style={styles.category}>{category.toUpperCase()}</Text>}
        <Text style={styles.heroText}>"{affirmation}"</Text>
        {onToggleFavorite && (
          <Pressable onPress={onToggleFavorite} style={styles.favBtn} hitSlop={8}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? c.gold : 'rgba(255,255,255,0.5)'}
            />
          </Pressable>
        )}
      </LinearGradient>
    );
  }

  return (
    <View style={styles.compactCard}>
      <Text style={styles.compactText} numberOfLines={2}>"{affirmation}"</Text>
      {onToggleFavorite && (
        <Pressable onPress={onToggleFavorite} hitSlop={8}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? c.gold : c.textSubtle}
          />
        </Pressable>
      )}
    </View>
  );
}
