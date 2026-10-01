import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius, FontSize, ThemeColors } from '@/constants/theme';
import { VisionItem } from '@/contexts/HeraContext';

interface Props { item: VisionItem; onDelete?: () => void; style?: any; }

const createStyles = (c: ThemeColors) => StyleSheet.create({
  card:         { borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  image:        { width: '100%', height: 210 },
  overlay:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, gap: 6 },
  catBadge:     { alignSelf: 'flex-start', backgroundColor: c.glassGold, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: c.borderGold },
  catText:      { fontSize: FontSize.xs, color: c.gold, fontWeight: '600' },
  title:        { fontSize: FontSize.lg, color: '#FFFFFF', fontWeight: '700' },
  desc:         { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.78)', lineHeight: 18 },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  progressBg:   { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: c.gold, borderRadius: 2 },
  progressText: { fontSize: FontSize.xs, color: c.gold, fontWeight: '600', width: 32 },
  deleteBtn:    { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
});

const VISION_FALLBACKS: Record<string, string> = {
  Lifestyle:  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80',
  Wealth:     'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&q=80',
  Health:     'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
  Career:     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  Love:       'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80',
  Travel:     'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=80',
  default:    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
};

export function VisionCard({ item, onDelete, style }: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [imgError, setImgError] = useState(false);

  const imageSource = imgError || !item.imageUrl
    ? { uri: VISION_FALLBACKS[item.category] ?? VISION_FALLBACKS.default }
    : { uri: item.imageUrl };

  return (
    <View style={[styles.card, style]}>
      <Image source={imageSource} style={styles.image} contentFit="cover" transition={300} onError={() => setImgError(true)} />
      <LinearGradient colors={['transparent', 'rgba(10,10,20,0.96)']} style={styles.overlay}>
        <View style={styles.catBadge}>
          <Text style={styles.catText}>{item.category}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${item.progress}%` as any }]} />
          </View>
          <Text style={styles.progressText}>{item.progress}%</Text>
        </View>
      </LinearGradient>
      {onDelete && (
        <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
          <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.78)" />
        </Pressable>
      )}
    </View>
  );
}
