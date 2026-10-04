/**
 * Edit Profile — update the name and every answer collected during onboarding
 * without re-running the onboarding flow.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useHera } from '@/hooks/useHera';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/template';
import { Spacing, Radius, FontSize } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';

type Field = { key: string; label: string; placeholder: string; multiline?: boolean; numeric?: boolean; options?: string[] };

const SECTIONS: { title: string; fields: Field[] }[] = [
  { title: 'About You', fields: [
    { key: 'location', label: 'Where you live', placeholder: 'City, country...' },
    { key: 'age', label: 'Age', placeholder: 'Your age...', numeric: true },
    { key: 'gender', label: 'Gender', placeholder: '', options: ['Female', 'Male', 'Non-binary', 'Prefer not to say'] },
    { key: 'sexuality', label: 'Sexuality', placeholder: 'Share how you identify...' },
    { key: 'kids', label: 'Kids', placeholder: '', options: ['Yes', 'No'] },
    { key: 'selfDesc', label: 'How you describe yourself', placeholder: 'What should Hera know about you...', multiline: true },
  ] },
  { title: 'Your Intentions', fields: [
    { key: 'motivation', label: 'What motivates you', placeholder: 'Your motivation...', multiline: true },
    { key: 'obstacles', label: 'What holds you back', placeholder: 'Your obstacles...', multiline: true },
    { key: 'pastShapes', label: 'How your past shapes you', placeholder: 'Your story...', multiline: true },
  ] },
  { title: 'Love & Relationships', fields: [
    { key: 'relationship', label: 'Relationship status', placeholder: '', options: ['Single', 'In a relationship', 'Married', "It's complicated"] },
    { key: 'partnerManifest', label: 'Partner you want to call in', placeholder: 'Describe them...', multiline: true },
    { key: 'specificPerson', label: 'Manifesting a specific person?', placeholder: '', options: ['Yes', 'No'] },
  ] },
  { title: 'Career & Home', fields: [
    { key: 'career', label: 'What you do', placeholder: 'Your work...' },
    { key: 'workSentiment', label: 'How you feel about work', placeholder: '', options: ['Love it', "It's fine for now", 'Ready for something new', 'Building on the side'] },
    { key: 'dreamLocation', label: 'Dream place to live', placeholder: 'Anywhere in the world...' },
    { key: 'homeType', label: 'Dream home', placeholder: '', options: ['penthouse', 'beach', 'loft', 'cottage', 'mansion', 'cabin', 'tiny', 'farm'] },
  ] },
];

const HOME_LABELS: Record<string, string> = {
  penthouse: 'Luxury Penthouse', beach: 'Beachfront Villa', loft: 'Modern Loft', cottage: 'Cozy Cottage',
  mansion: 'Suburban Mansion', cabin: 'Cabin', tiny: 'Tiny Home', farm: 'Farmhouse',
};

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const { user, updateUser } = useHera();
  const { showAlert } = useAlert();
  const s = makeStyles(c);

  const [name, setName] = useState(user.name ?? '');
  const [goals, setGoals] = useState((user.goals ?? []).join('\n'));
  const [profile, setProfile] = useState<Record<string, string>>({ ...(user.profile ?? {}) });

  const setField = (k: string, v: string) => setProfile(p => ({ ...p, [k]: v }));

  const save = () => {
    if (!name.trim()) { showAlert('Name Required', 'Please enter your name.'); return; }
    const goalsArr = goals.split('\n').map(g => g.trim()).filter(Boolean);
    updateUser({ name: name.trim(), goals: goalsArr, profile });
    showAlert('Profile Updated', 'Your details have been saved.', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const renderField = (f: Field) => {
    const v = profile[f.key] ?? '';
    return (
      <View key={f.key} style={s.field}>
        <Text style={s.label}>{f.label}</Text>
        {f.options ? (
          <View style={s.chips}>
            {f.options.map(o => {
              const sel = v === o;
              return (
                <Pressable key={o} onPress={() => setField(f.key, sel ? '' : o)} style={[s.chip, sel && s.chipSel]} accessibilityLabel={`${f.label}: ${o}`}>
                  <Text style={[s.chipTxt, sel && s.chipTxtSel]}>{HOME_LABELS[o] ?? o}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <TextInput
            value={v}
            onChangeText={t => setField(f.key, t)}
            placeholder={f.placeholder}
            placeholderTextColor={c.textSubtle}
            keyboardType={f.numeric ? 'number-pad' : 'default'}
            multiline={f.multiline}
            style={[s.input, f.multiline && s.multi]}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={18} color={c.textWhite} />
        </Pressable>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <Text style={s.sectionTitle}>Basics</Text>
          <View style={s.field}>
            <Text style={s.label}>Name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Your name..." placeholderTextColor={c.textSubtle} style={s.input} autoCapitalize="words" accessibilityLabel="Name" />
          </View>
          <View style={s.field}>
            <Text style={s.label}>What you're manifesting (one per line)</Text>
            <TextInput value={goals} onChangeText={setGoals} placeholder="Your goals..." placeholderTextColor={c.textSubtle} style={[s.input, s.multi]} multiline accessibilityLabel="Goals" />
          </View>
        </View>

        {SECTIONS.map(sec => (
          <View key={sec.title} style={s.card}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            {sec.fields.map(renderField)}
          </View>
        ))}
      </KeyboardAwareScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={save} style={({ pressed }) => [s.saveWrap, pressed && { opacity: 0.85 }]} accessibilityLabel="Save changes">
          <LinearGradient colors={[c.primary, c.primaryDark]} style={s.saveBtn}>
            <Ionicons name="checkmark" size={18} color="white" />
            <Text style={s.saveTxt}>Save Changes</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: c.textWhite },
  scroll: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: c.card, borderRadius: Radius.xl, borderWidth: 1, borderColor: c.border, padding: Spacing.md, gap: Spacing.md },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1.2, color: c.textSubtle, textTransform: 'uppercase' },
  field: { gap: 6 },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: c.textMuted },
  input: { backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.border, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.base, color: c.textWhite },
  multi: { minHeight: 90, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.glassBg },
  chipSel: { borderColor: c.primary, backgroundColor: c.glassPurple },
  chipTxt: { fontSize: FontSize.sm, color: c.textMuted, fontWeight: '500' },
  chipTxtSel: { color: c.primary, fontWeight: '700' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, backgroundColor: c.background },
  saveWrap: { borderRadius: Radius.xxl, overflow: 'hidden' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 16 },
  saveTxt: { color: 'white', fontSize: FontSize.base, fontWeight: '700' },
});
