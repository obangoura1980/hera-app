import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius, FontSize, ThemeColors } from '@/constants/theme';

interface ChatBubbleProps {
  message: string;
  role: 'user' | 'hera';
  timestamp?: string;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container:  { flexDirection: 'row', marginBottom: Spacing.md, paddingHorizontal: Spacing.md },
  heraRow:    { alignItems: 'flex-start' },
  userRow:    { justifyContent: 'flex-end' },
  avatar:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm, borderWidth: 1.5, borderColor: c.gold, flexShrink: 0 },
  avatarText: { color: c.gold, fontWeight: '700', fontSize: FontSize.base },
  wrapper:    { gap: 4 },
  heraBubble: { backgroundColor: c.card, borderRadius: Radius.xl, borderTopLeftRadius: Radius.sm, borderWidth: 1, borderColor: c.border, padding: Spacing.md },
  userBubble: { borderRadius: Radius.xl, borderTopRightRadius: Radius.sm, padding: Spacing.md },
  heraText:   { color: c.textWhite, fontSize: FontSize.base, lineHeight: 24 },
  userText:   { color: '#FFFFFF', fontSize: FontSize.base, lineHeight: 24 },
  time:       { fontSize: FontSize.xs, color: c.textSubtle, marginTop: 2 },
});

export function ChatBubble({ message, role, timestamp }: ChatBubbleProps) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const isHera = role === 'hera';

  return (
    <View style={[styles.container, isHera ? styles.heraRow : styles.userRow]}>
      {isHera && (
        <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.avatar}>
          <Text style={styles.avatarText}>H</Text>
        </LinearGradient>
      )}
      <View style={[styles.wrapper, isHera ? { maxWidth: '80%' } : { maxWidth: '78%' }]}>
        {isHera ? (
          <View style={styles.heraBubble}>
            <Text style={styles.heraText}>{message}</Text>
          </View>
        ) : (
          <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.userBubble}>
            <Text style={styles.userText}>{message}</Text>
          </LinearGradient>
        )}
        {timestamp && (
          <Text style={[styles.time, !isHera && { textAlign: 'right' }]}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );
}
