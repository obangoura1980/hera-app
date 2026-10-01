import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal,
  KeyboardAvoidingView, Platform, Animated, PanResponder, Dimensions, GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHera } from '@/hooks/useHera';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/template';
import { useFocusEffect } from 'expo-router';
import ReAnimated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Spacing, Radius, FontSize } from '@/constants/theme';
import type { VisionItem } from '@/contexts/HeraContext';

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_PAD = Spacing.lg;
const COL_GAP = Spacing.sm;
const COL_W = (SCREEN_W - SIDE_PAD * 2 - COL_GAP) / 2;

// Filter chips = superset of all creation categories
const FILTER_CATS = ['All', 'Lifestyle', 'Wealth', 'Health', 'Career', 'Love', 'Travel', 'Family'];
const ALL_CATS    = ['Lifestyle', 'Wealth', 'Health', 'Career', 'Love', 'Travel', 'Family'];

const CAT_COLOR: Record<string, string> = {
  Lifestyle: '#9B8AFB',
  Wealth:    '#F4D35E',
  Health:    '#65B891',
  Career:    '#F59E0B',
  Love:      '#EC4899',
  Travel:    '#06B6D4',
  Family:    '#C084FC',
};

const PLACEHOLDER_IMGS = [
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&q=80',
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
];

const IMG_H_OPTIONS = [205, 162, 228, 172, 192, 150];
function getImgH(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return IMG_H_OPTIONS[h % IMG_H_OPTIONS.length];
}
type ColItem = { item: VisionItem; imgH: number };
function buildCols(items: VisionItem[]): [ColItem[], ColItem[]] {
  const L: ColItem[] = []; const R: ColItem[] = [];
  let lH = 0; let rH = 0;
  for (const item of items) {
    const imgH = getImgH(item.id);
    const cardH = imgH + 88 + COL_GAP;
    if (lH <= rH) { L.push({ item, imgH }); lH += cardH; }
    else          { R.push({ item, imgH }); rH += cardH; }
  }
  return [L, R];
}

// ── ProgressSlider ─────────────────────────────────────────────────────────────
const THUMB_SIZE = 24;

function ProgressSlider({
  value,
  onChange,
  accentColor,
}: {
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}) {
  const { colors: c } = useTheme();
  const trackRef = useRef<View>(null);
  const trackXRef = useRef(0);   // absolute page-X of track start
  const trackWRef = useRef(200); // track width
  const [, forceRender] = useState(0);

  // Measure track on layout and whenever the modal opens
  const measureTrack = useCallback(() => {
    trackRef.current?.measureInWindow((px, _py, width) => {
      if (width > 0) {
        trackXRef.current = px;
        trackWRef.current = width;
        forceRender(n => n + 1); // refresh thumb position after measurement
      }
    });
  }, []);

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  const handleTouch = useCallback((pageX: number) => {
    const rel = pageX - trackXRef.current;
    const pct = clamp((rel / trackWRef.current) * 100);
    onChange(pct);
  }, [onChange]);

  const thumbLeft = Math.max(
    0,
    Math.min(trackWRef.current - THUMB_SIZE, (value / 100) * trackWRef.current - THUMB_SIZE / 2),
  );

  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: FontSize.sm, color: c.textMuted, fontWeight: '600' }}>Current Progress</Text>
        <Text style={{ fontSize: FontSize.lg, color: accentColor, fontWeight: '800' }}>{value}%</Text>
      </View>

      {/* Invisible hit area — captures all touch/drag events */}
      <View
        ref={trackRef}
        onLayout={measureTrack}
        style={{ height: 44, justifyContent: 'center', position: 'relative' }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e: GestureResponderEvent) => {
          measureTrack();
          handleTouch(e.nativeEvent.pageX);
        }}
        onResponderMove={(e: GestureResponderEvent) => {
          handleTouch(e.nativeEvent.pageX);
        }}
        onResponderTerminationRequest={() => false}
      >
        {/* Track background */}
        <View style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: c.border }} />
        {/* Filled portion */}
        <View
          style={{
            position: 'absolute', left: 0, height: 6, borderRadius: 3,
            backgroundColor: accentColor,
            width: `${value}%` as any,
          }}
        />
        {/* Thumb */}
        <View
          style={{
            position: 'absolute',
            width: THUMB_SIZE, height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: accentColor,
            borderWidth: 3, borderColor: 'white',
            top: (44 - THUMB_SIZE) / 2,
            left: thumbLeft,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 6,
            elevation: 4,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: FontSize.xs, color: c.textSubtle }}>Just started</Text>
        <Text style={{ fontSize: FontSize.xs, color: c.textSubtle }}>Achieved! 🏆</Text>
      </View>
    </View>
  );
}

// ── VisionImage — robust image with fallback ───────────────────────────────────
function VisionImage({
  uri,
  style,
  fallbackAccent,
}: {
  uri: string;
  style: any;
  fallbackAccent?: string;
}) {
  const [errored, setErrored] = useState(false);
  const { colors: c } = useTheme();

  // Normalise the URI — strip leading/trailing whitespace
  const cleanUri = uri?.trim() ?? '';
  const isValid = cleanUri.startsWith('http://') || cleanUri.startsWith('https://');

  // Pick a stable fallback based on URI hash
  const fallbackUri = useMemo(() => {
    let h = 0;
    for (const ch of cleanUri) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
    return PLACEHOLDER_IMGS[h % PLACEHOLDER_IMGS.length];
  }, [cleanUri]);

  const resolvedUri = (!isValid || errored) ? fallbackUri : cleanUri;

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={style}
      contentFit="cover"
      transition={300}
      onError={() => setErrored(true)}
      cachePolicy="memory-disk"
    />
  );
}

// ── MasonryCard ────────────────────────────────────────────────────────────────
const MasonryCard = React.memo(function MasonryCard({
  item,
  imgH,
  onPress,
}: {
  item: VisionItem;
  imgH: number;
  onPress: () => void;
}) {
  const { colors: c } = useTheme();
  const accent = CAT_COLOR[item.category] ?? c.gold;
  const daysLeft = useMemo(() => {
    if (!item.targetDate) return null;
    const d = new Date(item.targetDate);
    if (isNaN(d.getTime())) return null;
    const diff = Math.ceil((d.getTime() - Date.now()) / 864e5);
    return diff > 0 ? diff : null;
  }, [item.targetDate]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: COL_W,
          backgroundColor: c.card,
          borderRadius: Radius.xl,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: c.border,
        },
        pressed && { opacity: 0.86 },
      ]}
    >
      <View style={{ height: imgH, overflow: 'hidden', backgroundColor: accent + '14' }}>
        <VisionImage uri={item.imageUrl} style={StyleSheet.absoluteFill} fallbackAccent={accent} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, backgroundColor: accent + '2C', borderColor: accent + '60' }}>
          <Text style={{ fontSize: 10, color: accent, fontWeight: '700', letterSpacing: 0.3 }}>{item.category}</Text>
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.07)' }}>
          <View style={{ height: '100%', borderRadius: 1, backgroundColor: accent, width: `${item.progress}%` as any }} />
        </View>
      </View>
      <View style={{ padding: Spacing.sm + 2, gap: 5 }}>
        <Text style={{ fontSize: FontSize.sm, color: c.textWhite, fontWeight: '600', lineHeight: 19 }} numberOfLines={2}>{item.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={{ fontSize: FontSize.xs, color: accent, fontWeight: '700' }}>{item.progress}%</Text>
          {daysLeft !== null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="time-outline" size={10} color={c.textSubtle} />
              <Text style={{ fontSize: 10, color: c.textSubtle }}>{daysLeft}d</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

// ── SwipeCard ──────────────────────────────────────────────────────────────────
const DELETE_W = 76;
function SwipeCard({
  item,
  imgH,
  onDelete,
  onPress,
}: {
  item: VisionItem;
  imgH: number;
  onDelete: () => void;
  onPress: () => void;
}) {
  const tx = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.8,
    onPanResponderMove: (_, gs) => {
      tx.setValue(Math.max(-DELETE_W, Math.min(0, (isOpen.current ? -DELETE_W : 0) + gs.dx)));
    },
    onPanResponderRelease: (_, gs) => {
      const finalX = (isOpen.current ? -DELETE_W : 0) + gs.dx;
      if (finalX < -DELETE_W / 2) {
        Animated.spring(tx, { toValue: -DELETE_W, useNativeDriver: true }).start();
        isOpen.current = true;
      } else {
        Animated.spring(tx, { toValue: 0, useNativeDriver: true }).start();
        isOpen.current = false;
      }
    },
  })).current;

  const handleDeletePress = () => {
    Animated.timing(tx, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => { isOpen.current = false; });
    onDeleteRef.current();
  };

  return (
    <View style={{ marginBottom: COL_GAP }}>
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: COL_GAP, width: DELETE_W, borderTopRightRadius: Radius.xl, borderBottomRightRadius: Radius.xl, overflow: 'hidden' }}>
        <Pressable onPress={handleDeletePress} style={{ flex: 1 }}>
          <LinearGradient colors={['#EF4444', '#B91C1C']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Ionicons name="trash-outline" size={19} color="white" />
            <Text style={{ fontSize: FontSize.xs, color: 'white', fontWeight: '700' }}>Remove</Text>
          </LinearGradient>
        </Pressable>
      </View>
      <Animated.View style={{ transform: [{ translateX: tx }] }} {...pan.panHandlers}>
        <MasonryCard item={item} imgH={imgH} onPress={onPress} />
      </Animated.View>
    </View>
  );
}

// ── VisionFormModal — shared by Add + Edit ─────────────────────────────────────
interface FormModalProps {
  visible: boolean;
  initial?: VisionItem | null;
  onClose: () => void;
  onSave: (item: Omit<VisionItem, 'id' | 'createdAt'>) => void;
  mode?: 'add' | 'edit';
}

function VisionFormModal({ visible, initial, onClose, onSave, mode = 'add' }: FormModalProps) {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [cat, setCat]           = useState('Lifestyle');
  const [imgUrl, setImgUrl]     = useState('');
  const [progress, setProgress] = useState(0);
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setDesc(initial?.description ?? '');
      setCat(initial?.category ?? 'Lifestyle');
      setImgUrl(initial?.imageUrl ?? '');
      setProgress(initial?.progress ?? 0);
      setTargetDate(initial?.targetDate ?? '');
    }
  }, [visible, initial]);

  const accent = CAT_COLOR[cat] ?? c.gold;
  const previewUri = imgUrl.trim().startsWith('http') ? imgUrl.trim() : null;

  const handleSave = () => {
    if (!title.trim()) return;
    const seed = (title.charCodeAt(0) + title.length) % PLACEHOLDER_IMGS.length;
    onSave({
      title: title.trim(),
      description: desc.trim() || title.trim(),
      category: cat,
      imageUrl: previewUri ?? PLACEHOLDER_IMGS[seed],
      targetDate: targetDate.trim() || new Date(Date.now() + 365 * 864e5).toISOString().split('T')[0],
      progress,
    });
  };

  const bgColors = isDark
    ? (['#080A18', '#0F1025', '#131838'] as const)
    : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: SIDE_PAD,
              gap: Spacing.lg,
              paddingTop: insets.top + Spacing.md,
              paddingBottom: insets.bottom + Spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                onPress={onClose}
                hitSlop={14}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.glassBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border }}
              >
                <Ionicons name="arrow-back" size={20} color={c.textMuted} />
              </Pressable>
              <Text style={{ fontSize: FontSize.lg, color: c.textWhite, fontWeight: '700' }}>
                {mode === 'edit' ? 'Edit Vision' : 'New Vision'}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Image preview */}
            <View style={{ height: 200, borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
              {previewUri ? (
                <>
                  <VisionImage uri={previewUri} style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', padding: Spacing.md }]}>
                    <View style={{ alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, backgroundColor: accent + '28', borderColor: accent + '65' }}>
                      <Text style={{ fontSize: FontSize.xs, color: accent, fontWeight: '700' }}>{cat}</Text>
                    </View>
                  </LinearGradient>
                </>
              ) : (
                <LinearGradient colors={[accent + '18', accent + '06']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm }}>
                  <Ionicons name="image-outline" size={46} color={accent + '55'} />
                  <Text style={{ fontSize: FontSize.sm, color: accent + '77' }}>Image preview</Text>
                </LinearGradient>
              )}
            </View>

            {/* Image URL */}
            <View style={{ gap: Spacing.sm }}>
              <Text style={{ fontSize: FontSize.sm, color: c.textMuted, fontWeight: '600' }}>Image URL</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: previewUri ? accent + '55' : c.border }}>
                <Ionicons name="link-outline" size={15} color={c.textSubtle} style={{ marginLeft: Spacing.md }} />
                <TextInput
                  value={imgUrl}
                  onChangeText={setImgUrl}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={c.textSubtle}
                  style={{ flex: 1, paddingVertical: Spacing.md, paddingRight: Spacing.sm, fontSize: FontSize.sm, color: c.textWhite }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                {imgUrl.length > 0 && (
                  <Pressable onPress={() => setImgUrl('')} hitSlop={10} style={{ padding: Spacing.md }}>
                    <Ionicons name="close-circle" size={16} color={c.textSubtle} />
                  </Pressable>
                )}
              </View>
              <Text style={{ fontSize: FontSize.xs, color: c.textSubtle, marginTop: -2 }}>Leave blank for a curated placeholder</Text>
            </View>

            {/* Dream Title */}
            <View style={{ gap: Spacing.sm }}>
              <Text style={{ fontSize: FontSize.sm, color: c.textMuted, fontWeight: '600' }}>Dream Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What do you desire to manifest?"
                placeholderTextColor={c.textSubtle}
                style={{ backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.base, color: c.textWhite }}
              />
            </View>

            {/* Description */}
            <View style={{ gap: Spacing.sm }}>
              <Text style={{ fontSize: FontSize.sm, color: c.textMuted, fontWeight: '600' }}>Vision Description</Text>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="Describe this dream in vivid detail..."
                placeholderTextColor={c.textSubtle}
                style={{ backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.base, color: c.textWhite, minHeight: 80, textAlignVertical: 'top', paddingTop: Spacing.md }}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Category */}
            <View style={{ gap: Spacing.sm }}>
              <Text style={{ fontSize: FontSize.sm, color: c.textMuted, fontWeight: '600' }}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                {ALL_CATS.map(cc => {
                  const isActive = cc === cat;
                  const color = CAT_COLOR[cc] ?? c.gold;
                  return (
                    <Pressable
                      key={cc}
                      onPress={() => setCat(cc)}
                      style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: isActive ? color + '88' : c.border, backgroundColor: isActive ? color + '22' : c.glassBg }}
                    >
                      <Text style={{ fontSize: FontSize.sm, color: isActive ? color : c.textMuted, fontWeight: isActive ? '700' : '500' }}>{cc}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Progress slider */}
            <View style={{ backgroundColor: c.glassBg, borderRadius: Radius.xl, borderWidth: 1, borderColor: c.border, padding: Spacing.lg }}>
              <ProgressSlider value={progress} onChange={setProgress} accentColor={accent} />
            </View>

            {/* Target Date */}
            <View style={{ gap: Spacing.sm }}>
              <Text style={{ fontSize: FontSize.sm, color: c.textMuted, fontWeight: '600' }}>Target Date (optional)</Text>
              <TextInput
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.textSubtle}
                style={{ backgroundColor: c.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.base, color: c.textWhite }}
              />
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Pressable
                onPress={onClose}
                style={{ flex: 1, paddingVertical: 15, alignItems: 'center', backgroundColor: c.glassBg, borderRadius: Radius.xl, borderWidth: 1, borderColor: c.border }}
              >
                <Text style={{ fontSize: FontSize.base, color: c.textMuted, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={!title.trim()}
                style={({ pressed }) => [
                  { flex: 2.4, borderRadius: Radius.xl, overflow: 'hidden' },
                  !title.trim() && { opacity: 0.38 },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <LinearGradient colors={[accent, accent + 'BB']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 15 }}>
                  <Ionicons name="sparkles" size={17} color="white" />
                  <Text style={{ fontSize: FontSize.base, color: 'white', fontWeight: '700' }}>
                    {mode === 'edit' ? 'Save Changes' : 'Add to Vision Board'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── VisionDetailModal — view + edit + delete ───────────────────────────────────
function VisionDetailModal({
  item,
  visible,
  onClose,
  onEdit,
  onDelete,
}: {
  item: VisionItem | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (item: VisionItem) => void;
  onDelete: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();
  const { showAlert } = useAlert();

  if (!item) return null;

  const accent = CAT_COLOR[item.category] ?? c.gold;
  const daysLeft = (() => {
    if (!item.targetDate) return null;
    const d = new Date(item.targetDate);
    if (isNaN(d.getTime())) return null;
    const diff = Math.ceil((d.getTime() - Date.now()) / 864e5);
    return diff;
  })();
  const bgColors = isDark
    ? (['#080A18', '#0F1025', '#131838'] as const)
    : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);

  const handleDelete = () => {
    showAlert('Remove Vision', `Remove "${item.title}" from your vision board?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { onClose(); onDelete(item.id); } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero image */}
          <View style={{ height: 300, position: 'relative' }}>
            <VisionImage uri={item.imageUrl} style={{ width: '100%', height: 300 }} />
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.75)']}
              style={StyleSheet.absoluteFill}
            />
            {/* Top actions */}
            <View style={{ position: 'absolute', top: insets.top + Spacing.sm, left: SIDE_PAD, right: SIDE_PAD, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable
                onPress={onClose}
                hitSlop={14}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
              >
                <Ionicons name="arrow-back" size={20} color="white" />
              </Pressable>
              <Pressable
                onPress={handleDelete}
                hitSlop={14}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}
              >
                <Ionicons name="trash-outline" size={18} color="white" />
              </Pressable>
            </View>
            {/* Category badge */}
            <View style={{ position: 'absolute', bottom: Spacing.lg, left: SIDE_PAD, paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, backgroundColor: accent + '33', borderColor: accent + '70' }}>
              <Text style={{ fontSize: FontSize.sm, color: accent, fontWeight: '700' }}>{item.category}</Text>
            </View>
          </View>

          {/* Content */}
          <View style={{ paddingHorizontal: SIDE_PAD, paddingTop: Spacing.xl, gap: Spacing.lg }}>
            {/* Title + meta */}
            <View style={{ gap: Spacing.sm }}>
              <Text style={{ fontSize: FontSize.xxl, color: c.textWhite, fontWeight: '700', lineHeight: 34 }}>{item.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' }}>
                {daysLeft !== null && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.glassBg, borderRadius: Radius.full, paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, borderWidth: 1, borderColor: c.border }}>
                    <Ionicons name="time-outline" size={13} color={c.textMuted} />
                    <Text style={{ fontSize: FontSize.xs, color: c.textMuted }}>
                      {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Today!' : `${Math.abs(daysLeft)} days ago`}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: accent + '18', borderRadius: Radius.full, paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, borderWidth: 1, borderColor: accent + '40' }}>
                  <Ionicons name="sparkles" size={13} color={accent} />
                  <Text style={{ fontSize: FontSize.xs, color: accent, fontWeight: '600' }}>{item.progress}% manifested</Text>
                </View>
              </View>
            </View>

            {/* Description */}
            {item.description ? (
              <View style={{ backgroundColor: c.glassBg, borderRadius: Radius.xl, borderWidth: 1, borderColor: c.border, padding: Spacing.lg }}>
                <Text style={{ fontSize: FontSize.base, color: c.textMuted, lineHeight: 24 }}>{item.description}</Text>
              </View>
            ) : null}

            {/* Progress bar */}
            <View style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: FontSize.sm, color: c.textMuted, fontWeight: '600' }}>Manifestation Progress</Text>
                <Text style={{ fontSize: FontSize.lg, color: accent, fontWeight: '800' }}>{item.progress}%</Text>
              </View>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: c.border, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 5, backgroundColor: accent, width: `${item.progress}%` as any }} />
              </View>
              {item.progress >= 100 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: accent + '18', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: accent + '40', marginTop: 4 }}>
                  <Text style={{ fontSize: 18 }}>🏆</Text>
                  <Text style={{ flex: 1, fontSize: FontSize.sm, color: accent, fontWeight: '600' }}>
                    You manifested this! Celebrate this beautiful win.
                  </Text>
                </View>
              )}
            </View>

            {/* Target date */}
            {item.targetDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: c.glassBg, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: c.border }}>
                <Ionicons name="calendar-outline" size={18} color={c.textMuted} />
                <View>
                  <Text style={{ fontSize: FontSize.xs, color: c.textSubtle }}>Target date</Text>
                  <Text style={{ fontSize: FontSize.sm, color: c.textMuted, fontWeight: '600', marginTop: 1 }}>{item.targetDate}</Text>
                </View>
              </View>
            )}

            {/* Edit button */}
            <Pressable
              onPress={() => onEdit(item)}
              style={({ pressed }) => [{ borderRadius: Radius.xl, overflow: 'hidden', marginTop: Spacing.sm }, pressed && { opacity: 0.88 }]}
            >
              <LinearGradient
                colors={[accent, accent + 'BB']}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 16 }}
              >
                <Ionicons name="create-outline" size={18} color="white" />
                <Text style={{ fontSize: FontSize.base, color: 'white', fontWeight: '700' }}>Edit Vision</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function VisionScreen() {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();
  const { visionItems, addVisionItem, deleteVisionItem, updateUser } = useHera();
  const { showAlert } = useAlert();

  const screenOpacity = useSharedValue(0);
  const screenSlide   = useSharedValue(10);
  useFocusEffect(
    useCallback(() => {
      screenOpacity.value = 0;
      screenSlide.value   = 10;
      screenOpacity.value = withTiming(1, { duration: 280 });
      screenSlide.value   = withTiming(0, { duration: 280 });
    }, [])
  );
  const screenAnimStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: screenSlide.value }],
  }));

  const [filterCat, setFilterCat] = useState('All');
  const [showAddModal, setShowAddModal]         = useState(false);
  const [detailItem, setDetailItem]             = useState<VisionItem | null>(null);
  const [editItem, setEditItem]                 = useState<VisionItem | null>(null);
  const [showDetailModal, setShowDetailModal]   = useState(false);
  const [showEditModal, setShowEditModal]       = useState(false);

  const filtered   = useMemo(() => filterCat === 'All' ? visionItems : visionItems.filter(v => v.category === filterCat), [visionItems, filterCat]);
  const [leftCol, rightCol] = useMemo(() => buildCols(filtered), [filtered]);
  const manifested = useMemo(() => visionItems.filter(v => v.progress >= 100).length, [visionItems]);

  const handleDelete = useCallback((id: string) => {
    deleteVisionItem(id);
  }, [deleteVisionItem]);

  const handleCardPress = useCallback((item: VisionItem) => {
    setDetailItem(item);
    setShowDetailModal(true);
  }, []);

  const handleEditFromDetail = useCallback((item: VisionItem) => {
    setShowDetailModal(false);
    setEditItem(item);
    setShowEditModal(true);
  }, []);

  const handleAdd = useCallback((item: Omit<VisionItem, 'id' | 'createdAt'>) => {
    addVisionItem(item);
    setShowAddModal(false);
  }, [addVisionItem]);

  // Edit: delete old + re-add with same ID pattern (context doesn't expose update, so we remove+add)
  const handleSaveEdit = useCallback((updated: Omit<VisionItem, 'id' | 'createdAt'>) => {
    if (!editItem) return;
    deleteVisionItem(editItem.id);
    addVisionItem(updated);
    setShowEditModal(false);
    setEditItem(null);
  }, [editItem, deleteVisionItem, addVisionItem]);

  const bgColors = isDark
    ? (['#080A18', '#0F1025', '#131838'] as const)
    : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);

  return (
    <ReAnimated.View style={[{ flex: 1, backgroundColor: c.background }, screenAnimStyle]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIDE_PAD, paddingBottom: Spacing.md, paddingTop: insets.top + Spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.xxl, color: c.textWhite, fontWeight: '700' }}>Vision Board</Text>
          <Text style={{ fontSize: FontSize.sm, color: c.textMuted, marginTop: 2 }}>Your dreams made visible</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          {manifested > 0 && (
            <View style={{ backgroundColor: c.glassGold, paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: c.borderGold }}>
              <Text style={{ fontSize: FontSize.xs, color: c.gold, fontWeight: '600' }}>🏆 {manifested} manifested</Text>
            </View>
          )}
          <Pressable onPress={() => setShowAddModal(true)} style={({ pressed }) => [{ borderRadius: Radius.full, overflow: 'hidden' }, pressed && { opacity: 0.82 }]}>
            <LinearGradient colors={[c.primary, c.primaryDark]} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={24} color="white" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Filter chips — includes all categories matching creation options */}
      <View style={{ paddingBottom: Spacing.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SIDE_PAD, gap: Spacing.sm }}>
          {FILTER_CATS.map(cc => {
            const isActive = cc === filterCat;
            const color = cc === 'All' ? c.gold : (CAT_COLOR[cc] ?? c.gold);
            return (
              <Pressable
                key={cc}
                onPress={() => setFilterCat(cc)}
                style={{ paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: isActive ? color + '88' : c.border, backgroundColor: isActive ? color + '18' : c.glassBg }}
              >
                <Text style={{ fontSize: FontSize.sm, color: isActive ? color : c.textMuted, fontWeight: isActive ? '700' : '500' }}>{cc}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {filtered.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIDE_PAD, paddingBottom: Spacing.sm, gap: 5 }}>
          <Ionicons name="swap-horizontal-outline" size={12} color={c.textSubtle} />
          <Text style={{ flex: 1, fontSize: FontSize.xs, color: c.textSubtle, fontStyle: 'italic' }}>Tap to view · Swipe left to remove</Text>
          <Text style={{ fontSize: FontSize.xs, color: c.textSubtle }}>{filtered.length} vision{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SIDE_PAD, paddingTop: 2, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 80, gap: Spacing.md }}>
            <Text style={{ fontSize: 52 }}>🔮</Text>
            <Text style={{ fontSize: FontSize.xl, color: c.textWhite, fontWeight: '700', textAlign: 'center' }}>Your vision board awaits</Text>
            <Text style={{ fontSize: FontSize.base, color: c.textMuted, textAlign: 'center', lineHeight: 24, paddingHorizontal: Spacing.lg }}>
              {filterCat === 'All'
                ? 'Add your first dream and watch the universe conspire in your favor'
                : `No ${filterCat} visions yet — add one to begin`}
            </Text>
            <Pressable onPress={() => setShowAddModal(true)} style={({ pressed }) => [{ borderRadius: Radius.full, overflow: 'hidden', marginTop: Spacing.sm }, pressed && { opacity: 0.85 }]}>
              <LinearGradient colors={[c.primary, c.primaryDark]} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md }}>
                <Ionicons name="add-circle" size={18} color="white" />
                <Text style={{ fontSize: FontSize.base, color: 'white', fontWeight: '700' }}>Add Vision</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: COL_GAP }}>
            <View style={{ flex: 1 }}>
              {leftCol.map(({ item, imgH }) => (
                <SwipeCard
                  key={item.id}
                  item={item}
                  imgH={imgH}
                  onPress={() => handleCardPress(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </View>
            <View style={{ flex: 1 }}>
              {rightCol.map(({ item, imgH }) => (
                <SwipeCard
                  key={item.id}
                  item={item}
                  imgH={imgH}
                  onPress={() => handleCardPress(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add modal */}
      <VisionFormModal
        visible={showAddModal}
        initial={null}
        onClose={() => setShowAddModal(false)}
        onSave={handleAdd}
        mode="add"
      />

      {/* Detail modal */}
      <VisionDetailModal
        item={detailItem}
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEditFromDetail}
        onDelete={handleDelete}
      />

      {/* Edit modal */}
      <VisionFormModal
        visible={showEditModal}
        initial={editItem}
        onClose={() => { setShowEditModal(false); setEditItem(null); }}
        onSave={handleSaveEdit}
        mode="edit"
      />
    </ReAnimated.View>
  );
}
