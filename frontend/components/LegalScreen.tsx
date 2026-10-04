/** Shared layout for in-app legal documents (Privacy Policy, Terms & Conditions). */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius, FontSize } from '@/constants/theme';

export type LegalSection = { heading: string; body: string };

export function LegalScreen({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  return (
    <View style={[st.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={st.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back"
          style={[st.iconBtn, { backgroundColor: c.glassBg, borderColor: c.border }]}>
          <Ionicons name="arrow-back" size={18} color={c.textWhite} />
        </Pressable>
        <Text style={[st.title, { color: c.textWhite }]}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={[st.updated, { color: c.textSubtle }]}>Last updated: {updated}</Text>
        <Text style={[st.body, { color: c.textMuted }]}>{intro}</Text>
        {sections.map((sec, i) => (
          <View key={i} style={[st.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[st.heading, { color: c.textWhite }]}>{`${i + 1}. ${sec.heading}`}</Text>
            <Text style={[st.body, { color: c.textMuted }]}>{sec.body}</Text>
          </View>
        ))}
        <Text style={[st.updated, { color: c.textSubtle, textAlign: 'center' }]}>Questions? Contact support@hera.app</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: FontSize.lg, fontWeight: '700' },
  scroll: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  updated: { fontSize: FontSize.xs },
  card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md, gap: 6 },
  heading: { fontSize: FontSize.base, fontWeight: '700' },
  body: { fontSize: FontSize.sm, lineHeight: 21 },
});
