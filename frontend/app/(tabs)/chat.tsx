import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHera } from '@/hooks/useHera';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/template';
import { streamHeraResponse } from '@/services/heraAI';
import { Spacing, Radius, FontSize, ThemeColors } from '@/constants/theme';
import { ChatBubble } from '@/components/feature/ChatBubble';
import { FREE_CHAT_LIMIT } from '@/contexts/SubscriptionContext';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const SUGGESTIONS = [
  "Help me manifest my dream life",
  "I need morning motivation",
  "Guide me through a visualization",
  "Help me overcome limiting beliefs",
  "I want to set powerful goals",
  "I need emotional support today",
];

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: c.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface },
  heraInfo:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heraName:        { fontSize: FontSize.base, color: c.textWhite, fontWeight: '700' },
  statusRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusText:      { fontSize: FontSize.xs, color: c.textMuted },
  headerRight:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  limitBadge:      { backgroundColor: c.glassGold, paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: c.borderGold },
  limitTxt:        { fontSize: FontSize.xs, color: c.gold, fontWeight: '700' },
  messages:        { flex: 1 },
  messagesContent: { paddingTop: Spacing.md, paddingBottom: Spacing.md },
  suggestionsSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm },
  suggestionsLabel:{ fontSize: FontSize.sm, color: c.textMuted, textAlign: 'center', marginBottom: Spacing.sm },
  suggestionsRow:  { paddingHorizontal: Spacing.sm, gap: Spacing.sm },
  chip:            { backgroundColor: c.glassPurple, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: c.border },
  chipText:        { fontSize: FontSize.sm, color: c.textMuted, fontWeight: '500' },
  typingRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  typingBubble:    { backgroundColor: c.card, borderRadius: Radius.xl, borderTopLeftRadius: Radius.sm, borderWidth: 1, borderColor: c.border, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  dotsRow:         { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: c.textMuted },
  limitNudge:      { marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: Radius.xl, overflow: 'hidden' },
  limitNudgeInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, borderColor: c.borderGold },
  limitNudgeTxt:   { flex: 1, fontSize: FontSize.sm, color: c.textMuted, lineHeight: 18 },
  inputArea:       { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: c.border, gap: 6, backgroundColor: c.surface },
  inputRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  input:           { flex: 1, backgroundColor: c.card, borderRadius: Radius.xl, borderWidth: 1, borderColor: c.border, paddingHorizontal: Spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: FontSize.base, color: c.textWhite, maxHeight: 120 },
  countBar:        { fontSize: 10, color: c.textSubtle, textAlign: 'center', letterSpacing: 0.3 },
  upgradeLink:     { color: c.gold, fontWeight: '600' },
  poweredBy:       { fontSize: 10, color: c.textSubtle, textAlign: 'center', letterSpacing: 0.3 },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const { chatHistory, addMessage, clearChat, user } = useHera();
  const { canSendChat, isSubscribed, dailyChatCount, showPaywall, incrementChatCount } = useSubscription();
  const { showAlert } = useAlert();

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef(false);
  // Auto-scroll: only auto-scroll when the user hasn't manually scrolled up
  const userScrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { initialMessage, msgTimestamp } = useLocalSearchParams<{ initialMessage?: string; msgTimestamp?: string }>();
  const lastTimestampRef = useRef('');

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

  const scrollToBottom = useCallback((force = false) => {
    if (force || !userScrollingRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, []);

  // Only auto-scroll when a new AI chunk arrives (streaming) — not when user scrolls up
  useEffect(() => {
    if (streamingText) scrollToBottom();
  }, [streamingText]);

  // Always scroll to bottom when a complete message is added (new user or new hera msg)
  useEffect(() => {
    scrollToBottom(true);
  }, [chatHistory.length]);

  const handleScrollBegin = useCallback(() => {
    userScrollingRef.current = true;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
  }, []);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    // Re-enable auto-scroll only if user scrolled back near the bottom (within 60px)
    if (distanceFromBottom < 60) {
      userScrollingRef.current = false;
    }
    // Safety: reset after 5s of inactivity regardless
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => { userScrollingRef.current = false; }, 5000);
  }, []);

  const handleClearChat = useCallback(() => {
    showAlert('Clear Conversation', 'Start a fresh conversation with Hera?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          // Reset user-scroll lock so the welcome message is visible after clear
          userScrollingRef.current = false;
          clearChat();
        },
      },
    ]);
  }, [clearChat, showAlert]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || streaming) return;
    if (!canSendChat) { showPaywall('AI Chat Limit'); return; }

    setInput('');
    abortRef.current = false;
    addMessage({ role: 'user', content: msg });
    incrementChatCount();
    setStreaming(true);
    setStreamingText('');

    const contextMessages = chatHistory
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({ role: m.role === 'hera' ? 'assistant' : 'user', content: m.content }));
    contextMessages.push({ role: 'user', content: msg });

    try {
      await streamHeraResponse({
        messages: contextMessages,
        userName: user.name,
        goals: user.goals,
        focusAreas: user.focusAreas,
        onChunk: (_delta, accumulated) => {
          if (!abortRef.current) setStreamingText(accumulated);
        },
      });
      setStreamingText(prev => {
        if (prev && !abortRef.current) addMessage({ role: 'hera', content: prev });
        return '';
      });
    } catch {
      setStreamingText('');
      addMessage({ role: 'hera', content: "I'm here with you always. Let me try again in a moment. 💜" });
    } finally {
      setStreaming(false);
    }
  };

  // Auto-send message received from home screen
  useEffect(() => {
    if (initialMessage && msgTimestamp && msgTimestamp !== lastTimestampRef.current) {
      lastTimestampRef.current = msgTimestamp;
      const timeout = setTimeout(() => send(initialMessage), 420);
      return () => clearTimeout(timeout);
    }
  }, [msgTimestamp]);

  const isFirstMessage = chatHistory.length <= 1;
  const showStreamBubble = streaming && streamingText.length > 0;
  const remainingChats = Math.max(0, FREE_CHAT_LIMIT - dailyChatCount);
  const showLimitBar = !isSubscribed;

  const avatarColors: [string, string] = isDark ? ['#A855F7', '#7C3AED'] : ['#6C5CE7', '#4834D4'];
  const bgColors = isDark ? (['#080A18', '#0F1025', '#131838'] as const) : (['#FDE8EA', '#F9D5D9', '#F5C2C7'] as const);

  return (
    <Animated.View style={[s.container, screenAnimStyle]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={s.heraInfo}>
          <LinearGradient colors={avatarColors} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.gold }}>
            <Text style={{ fontSize: FontSize.md, color: c.gold, fontWeight: '700' }}>H</Text>
          </LinearGradient>
          <View>
            <Text style={s.heraName}>Hera</Text>
            <View style={s.statusRow}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: streaming ? c.gold : c.success }} />
              <Text style={s.statusText}>{streaming ? 'Responding…' : 'Always with you'}</Text>
            </View>
          </View>
        </View>
        <View style={s.headerRight}>
          {showLimitBar && (
            <View style={s.limitBadge}>
              <Text style={[s.limitTxt, remainingChats === 0 && { color: c.error }]}>
                {remainingChats}/{FREE_CHAT_LIMIT}
              </Text>
            </View>
          )}
          <Pressable onPress={handleClearChat} hitSlop={12}>
            <Ionicons name="ellipsis-horizontal" size={22} color={c.textMuted} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={s.messages}
          contentContainerStyle={s.messagesContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={handleScrollBegin}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
        >
          {isFirstMessage && (
            <View style={s.suggestionsSection}>
              <Text style={s.suggestionsLabel}>What is on your heart today?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.suggestionsRow}>
                {SUGGESTIONS.map((sg, i) => (
                  <Pressable key={i} onPress={() => send(sg)} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}>
                    <Text style={s.chipText}>{sg}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {chatHistory.map(m => (
            <ChatBubble key={m.id} message={m.content} role={m.role} timestamp={m.timestamp} />
          ))}

          {showStreamBubble && <ChatBubble key="streaming" message={streamingText} role="hera" />}

          {streaming && !showStreamBubble && (
            <View style={s.typingRow}>
              <LinearGradient colors={avatarColors} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.gold }}>
                <Text style={{ fontSize: FontSize.sm, color: c.gold, fontWeight: '700' }}>H</Text>
              </LinearGradient>
              <View style={s.typingBubble}>
                <View style={s.dotsRow}>
                  {[0, 1, 2].map(d => <View key={d} style={[s.dot, { opacity: 1 - d * 0.28 }]} />)}
                </View>
              </View>
            </View>
          )}

          {!isSubscribed && remainingChats === 0 && !streaming && (
            <Pressable onPress={() => showPaywall('AI Chat Limit')} style={s.limitNudge}>
              <LinearGradient colors={isDark ? ['rgba(244,211,94,0.12)', 'rgba(244,211,94,0.05)'] : ['rgba(201,162,39,0.1)', 'rgba(201,162,39,0.03)']} style={s.limitNudgeInner}>
                <Ionicons name="sparkles" size={16} color={c.gold} />
                <Text style={s.limitNudgeTxt}>Daily limit reached. Start your free trial for unlimited conversations.</Text>
                <Ionicons name="chevron-forward" size={14} color={c.gold} />
              </LinearGradient>
            </Pressable>
          )}
        </ScrollView>

        {/* Input — sits above the floating capsule nav bar (~90pt tall) */}
        <View style={[s.inputArea, { paddingBottom: Math.max(insets.bottom, 16) + 90 }]}>
          <View style={s.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={canSendChat ? 'Message Hera…' : 'Daily limit reached — upgrade for unlimited'}
              placeholderTextColor={canSendChat ? c.textSubtle : c.error + '88'}
              style={[s.input, !canSendChat && { borderColor: 'rgba(239,68,68,0.25)' }]}
              multiline
              maxLength={800}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => send()}
            />
            <Pressable
              onPress={() => canSendChat ? send() : showPaywall('AI Chat Limit')}
              disabled={!input.trim() && canSendChat || streaming}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <LinearGradient
                colors={
                  !canSendChat ? [c.gold, c.gold + 'CC'] :
                  input.trim() && !streaming ? [c.primary, c.primaryDark] :
                  [c.glassBorder, c.glassBorder]
                }
                style={s.sendBtn}
              >
                <Ionicons name={canSendChat ? 'send' : 'sparkles'} size={18} color="white" />
              </LinearGradient>
            </Pressable>
          </View>

          {showLimitBar && canSendChat ? (
            <Text style={s.countBar}>
              {remainingChats} free {remainingChats === 1 ? 'message' : 'messages'} remaining today{' · '}
              <Text style={s.upgradeLink}>Upgrade for unlimited</Text>
            </Text>
          ) : (
            <Text style={s.poweredBy}>Powered by OnSpace AI · GPT-5</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
