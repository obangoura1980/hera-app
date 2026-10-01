import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, FontSize, Shadow } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', style, textStyle, disabled, loading }: ButtonProps) {
  const pad = { sm: { paddingVertical: 10, paddingHorizontal: 20 }, md: { paddingVertical: 14, paddingHorizontal: 28 }, lg: { paddingVertical: 17, paddingHorizontal: 36 } }[size];
  const fs = { sm: FontSize.sm, md: FontSize.base, lg: FontSize.md }[size];
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[{ opacity: isDisabled ? 0.5 : 1 }, style]}>
        {({ pressed }) => (
          <LinearGradient colors={['#7C3AED', '#5B21B6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.base, pad, { opacity: pressed ? 0.85 : 1 }, Shadow.card]}>
            {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={[styles.primaryText, { fontSize: fs }, textStyle]}>{title}</Text>}
          </LinearGradient>
        )}
      </Pressable>
    );
  }

  if (variant === 'gold') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[{ opacity: isDisabled ? 0.5 : 1 }, style]}>
        {({ pressed }) => (
          <LinearGradient colors={['#EDD95C', '#D4AF37', '#B8941F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.base, pad, { opacity: pressed ? 0.85 : 1 }, Shadow.gold]}>
            {loading ? <ActivityIndicator color="#0F172A" size="small" /> : <Text style={[styles.goldText, { fontSize: fs }, textStyle]}>{title}</Text>}
          </LinearGradient>
        )}
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [styles.base, pad, styles.secondaryBtn, { opacity: pressed ? 0.7 : isDisabled ? 0.5 : 1 }, style]}>
        <Text style={[styles.secondaryText, { fontSize: fs }, textStyle]}>{title}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [styles.base, pad, { opacity: pressed ? 0.6 : isDisabled ? 0.4 : 1 }, style]}>
      <Text style={[styles.ghostText, { fontSize: fs }, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, gap: 8 },
  primaryText: { color: Colors.textWhite, fontWeight: '600', letterSpacing: 0.3 },
  goldText: { color: Colors.midnight, fontWeight: '700', letterSpacing: 0.3 },
  secondaryBtn: { borderWidth: 1.5, borderColor: Colors.glassBorder, backgroundColor: Colors.glassBg },
  secondaryText: { color: Colors.textWhite, fontWeight: '500' },
  ghostText: { color: Colors.textMuted, fontWeight: '500' },
});
