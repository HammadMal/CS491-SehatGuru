import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard,
  Modal, FlatList, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Crypto from 'expo-crypto';
import { Audio } from 'expo-av';

import { useChatStore } from '../../store/useChatStore';
import { useMealPlanStore } from '../../store/useMealPlanStore';
import { chatAPI } from '../../services/chat.api';
import { ChatMessage } from '../../components/ChatMessage';
import { MealPlanActions } from '../../components/MealPlanActions';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { OnboardingContext } from '../../context/OnboardingContext';
import { AuthContext } from '../../context/AuthContext';
import { getItem } from '../../utils/storage';
import { API_BASE_URL } from '../../config';
import { parseMealPlan } from '../../utils/mealPlanParser';
import { saveMealPlanToFirestore } from '../../services/mealPlans.firestore';
import type { Message, ChatSession, UserContext } from '../../types/chat.types';
import type { MealPlanItem } from '../../types/meal.types';

/* ── Suggestion chips ── */
const SUGGESTIONS = [
  { icon: 'food-variant',  color: '#f97316', bg: '#fff7ed', text: 'Biryani calories?' },
  { icon: 'heart-pulse',   color: '#ef4444', bg: '#fff5f5', text: 'Diet for diabetics' },
  { icon: 'dumbbell',      color: '#3b82f6', bg: '#eff6ff', text: 'High protein dishes' },
  { icon: 'scale',         color: '#8b5cf6', bg: '#f5f3ff', text: 'Weight loss tips' },
];

export default function ChatbotScreen() {
  const [inputText, setInputText]         = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isRecording, setIsRecording]     = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [pendingMealPlanMessageId, setPendingMealPlanMessageId] = useState<string | null>(null);
  const [pendingMealPlanMarkdown, setPendingMealPlanMarkdown]   = useState<string | null>(null);
  const [mealPlanSaving, setMealPlanSaving] = useState(false);

  const recordingRef  = useRef<Audio.Recording | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef      = useRef<TextInput>(null);
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const pulseLoop     = useRef<Animated.CompositeAnimation | null>(null);

  const {
    messages, isLoading, sessions,
    addMessage, setLoading, createNewSession,
    loadSession, deleteSession, initSessions,
  } = useChatStore();

  const onboardingContext = useContext(OnboardingContext);
  const authContext       = useContext(AuthContext);

  const userContext: UserContext | undefined = useMemo(() => {
    if (!onboardingContext?.onboardingData) return undefined;
    return chatAPI.buildUserContext(
      onboardingContext.onboardingData,
      authContext?.user?.daily_calorie_goal ?? undefined,
    );
  }, [onboardingContext?.onboardingData, authContext?.user?.daily_calorie_goal]);

  useEffect(() => { initSessions(); }, []);

  /* Keyboard listeners */
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  /* Auto-scroll on new messages */
  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messages]);

  /* Mic pulse animation */
  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 550, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 550, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  /* ── Handlers (unchanged logic) ── */
  const handleNewChat = () => {
    if (messages.length === 0) return;
    Alert.alert('New Chat', 'Start a new conversation? Your current chat will be saved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'New Chat', onPress: () => createNewSession() },
    ]);
  };

  const handleLoadSession = (session: ChatSession) => {
    setHistoryVisible(false);
    loadSession(session.id);
  };

  const handleDeleteSession = (id: string) => {
    Alert.alert('Delete Chat', 'Delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  };

  const formatDate = (iso: string) => {
    const date    = new Date(iso);
    const diffMs  = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleMicPress = async () => {
    if (isRecording) {
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        recordingRef.current = null;
        setIsRecording(false);
        if (!uri) return;
        setIsTranscribing(true);
        const token    = await getItem('access_token');
        const formData = new FormData();
        formData.append('audio', { uri, type: 'audio/mp4', name: 'voice.m4a' } as any);
        const res = await fetch(`${API_BASE_URL}/api/chat/transcribe`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.transcript) setInputText(data.transcript);
        } else {
          const err = await res.json().catch(() => ({}));
          Alert.alert('Error', err.detail || `Server error ${res.status}`);
        }
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Could not transcribe audio.');
      } finally {
        setIsTranscribing(false);
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      }
      return;
    }
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'Microphone permission is needed for voice input.');
      return;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    recordingRef.current = recording;
    setIsRecording(true);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    const userMessage: Message = {
      id: Crypto.randomUUID(), content: inputText.trim(),
      sender: 'user', timestamp: new Date(),
    };
    addMessage(userMessage);
    const currentMessage = inputText.trim();
    setInputText('');
    inputRef.current?.blur();
    setLoading(true);
    try {
      const chatHistory = messages.slice(0, -1).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      const response = await chatAPI.sendMessage(currentMessage, userContext, true, chatHistory);
      const botMessage: Message = {
        id: Crypto.randomUUID(), content: response.response,
        sender: 'bot', timestamp: new Date(),
      };
      addMessage(botMessage);
      if (response.intent === 'meal_plan_generation') {
        setPendingMealPlanMessageId(botMessage.id);
        setPendingMealPlanMarkdown(response.response);
      } else {
        setPendingMealPlanMessageId(null);
        setPendingMealPlanMarkdown(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to get response. Please try again.');
      addMessage({
        id: Crypto.randomUUID(),
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        sender: 'bot', timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMealPlanApprove = async () => {
    if (!pendingMealPlanMarkdown || !authContext?.user?.id) return;
    const parsed = parseMealPlan(pendingMealPlanMarkdown);
    if (!parsed.length) {
      Alert.alert('Error', 'Could not read the meal plan. Please try again.');
      return;
    }
    setMealPlanSaving(true);
    try {
      const planId = Crypto.randomUUID();
      const now    = new Date().toISOString();
      const items: MealPlanItem[] = parsed.map((p) => ({
        id: Crypto.randomUUID(), userId: authContext.user!.id,
        ...p, planId, logged: false, createdAt: now,
      }));
      await saveMealPlanToFirestore(items);
      useMealPlanStore.getState().addPlanItems(items);
      setPendingMealPlanMessageId(null);
      setPendingMealPlanMarkdown(null);
      Alert.alert('Saved!', 'Meal plan saved. View it in the Meal Plans tab.');
    } catch {
      Alert.alert('Error', 'Failed to save meal plan. Please try again.');
    } finally {
      setMealPlanSaving(false);
    }
  };

  const canSend = !!inputText.trim() && !isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerBtn, messages.length === 0 && { opacity: 0.4 }]}
            onPress={handleNewChat}
            disabled={messages.length === 0}
          >
            <Ionicons name="add" size={21} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerAvatarWrap}>
              <View style={styles.headerAvatar}>
                <MaterialCommunityIcons name="robot-outline" size={19} color="#fff" />
              </View>
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={styles.headerTitle}>SehatGuru</Text>
              <Text style={styles.headerSub}>Nutrition Expert · AI</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.headerBtn} onPress={() => setHistoryVisible(true)}>
            <Ionicons name="time-outline" size={21} color={Colors.primary} />
            {sessions.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{sessions.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Messages ── */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: keyboardHeight > 0 ? 20 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            /* ── Empty state ── */
            <View style={styles.empty}>
              <View style={styles.emptyAvatarRing}>
                <View style={styles.emptyAvatarInner}>
                  <MaterialCommunityIcons name="robot-outline" size={46} color={Colors.primary} />
                </View>
              </View>
              <Text style={styles.emptyTitle}>SehatGuru</Text>
              <Text style={styles.emptySub}>Your Pakistani nutrition expert</Text>

              <Text style={styles.tryLabel}>Try asking</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {SUGGESTIONS.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.chip, { backgroundColor: s.bg }]}
                    onPress={() => { setInputText(s.text); inputRef.current?.focus(); }}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons name={s.icon as any} size={16} color={s.color} />
                    <Text style={[styles.chipText, { color: s.color }]}>{s.text}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            messages.map((message) => (
              <React.Fragment key={message.id}>
                <ChatMessage message={message} />
                {message.id === pendingMealPlanMessageId && (
                  <MealPlanActions
                    loading={mealPlanSaving}
                    onApprove={handleMealPlanApprove}
                    onReject={() => {
                      setPendingMealPlanMessageId(null);
                      setPendingMealPlanMarkdown(null);
                    }}
                  />
                )}
              </React.Fragment>
            ))
          )}

          {/* ── Typing indicator ── */}
          {isLoading && (
            <View style={styles.typingRow}>
              <View style={styles.typingAvatar}>
                <MaterialCommunityIcons name="robot-outline" size={13} color="#fff" />
              </View>
              <View style={styles.typingBubble}>
                <View style={styles.dots}>
                  <View style={[styles.dot, { opacity: 0.4 }]} />
                  <View style={[styles.dot, { opacity: 0.65 }]} />
                  <View style={[styles.dot, { opacity: 0.9 }]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Input bar ── */}
        <View style={styles.inputBar}>
          <View style={styles.inputPill}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me anything…"
              placeholderTextColor={Colors.placeholder}
              multiline
              maxLength={2000}
              editable={!isLoading}
              onFocus={() =>
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200)
              }
            />

            {/* Mic button — pulses when recording */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.micBtn, isRecording && styles.micBtnActive]}
                onPress={handleMicPress}
                disabled={isLoading || isTranscribing}
                activeOpacity={0.8}
              >
                {isTranscribing
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Ionicons
                      name={isRecording ? 'stop' : 'mic'}
                      size={18}
                      color={isRecording ? '#fff' : Colors.primary}
                    />
                }
              </TouchableOpacity>
            </Animated.View>

            {/* Send button */}
            <TouchableOpacity
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={17} color={canSend ? '#fff' : Colors.disabled} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── History bottom sheet ── */}
      <Modal
        visible={historyVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHistoryVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setHistoryVisible(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Previous Chats</Text>
            <View style={styles.sheetCountPill}>
              <Text style={styles.sheetCountText}>{sessions.length} / 5</Text>
            </View>
          </View>

          {sessions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <MaterialCommunityIcons name="chat-outline" size={40} color={Colors.disabled} />
              <Text style={styles.emptyHistoryText}>No saved chats yet</Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sessionRow}
                  onPress={() => handleLoadSession(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sessionIcon}>
                    <MaterialCommunityIcons name="robot-outline" size={17} color={Colors.primary} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.sessionMeta}>
                      {item.messages.length} messages · {formatDate(item.updatedAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sessionDelete}
                    onPress={() => handleDeleteSession(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6FA' },
  flex: { flex: 1 },

  /* ── Header ── */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F3F6FA',
    paddingVertical: 10, paddingHorizontal: 14,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#4ade80',
    borderWidth: 2, borderColor: '#fff',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', fontFamily: Fonts.extrabold, color: '#111', letterSpacing: -0.2 },
  headerSub:   { fontSize: 11, color: Colors.placeholder, marginTop: 1, fontWeight: '500', fontFamily: Fonts.medium },
  badge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: Colors.primary, borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', fontFamily: Fonts.bold },

  /* ── Messages ── */
  messagesList:   { flex: 1 },
  messagesContent:{ paddingTop: 20, flexGrow: 1 },

  /* ── Empty state ── */
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingTop: 40,
  },
  emptyAvatarRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2.5, borderColor: `${Colors.primary}30`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 5,
  },
  emptyAvatarInner: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: `${Colors.primary}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle:  { fontSize: 26, fontWeight: '800', fontFamily: Fonts.extrabold, color: '#111', letterSpacing: -0.5 },
  emptySub:    { fontSize: 14, color: Colors.placeholder, marginTop: 6, marginBottom: 32, fontFamily: Fonts.regular },
  tryLabel:    { fontSize: 12, fontWeight: '700', fontFamily: Fonts.bold, color: '#9ca3af', letterSpacing: 0.8, marginBottom: 14, textTransform: 'uppercase' },
  chipsRow:    { gap: 10, paddingHorizontal: 4, paddingBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600', fontFamily: Fonts.semibold },

  /* ── Typing indicator ── */
  typingRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 14, paddingVertical: 8, gap: 8,
  },
  typingAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  typingBubble: {
    backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 16,
    borderRadius: 20, borderBottomLeftRadius: 5,
    borderWidth: 1, borderColor: '#eef0f3',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

  /* ── Input bar ── */
  inputBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
    paddingHorizontal: 14, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 8,
  },
  inputPill: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#F3F6FA',
    borderRadius: 26, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 6, paddingVertical: 6, gap: 4,
  },
  input: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 15, maxHeight: 100,
    color: Colors.textPrimary, lineHeight: 20, fontFamily: Fonts.regular,
  },
  micBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: '#ef4444' },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#e5e7eb',
    shadowOpacity: 0, elevation: 0,
  },

  /* ── History modal ── */
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 12, maxHeight: '60%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 20,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sheetTitle:     { fontSize: 17, fontWeight: '800', fontFamily: Fonts.extrabold, color: '#111' },
  sheetCountPill: {
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  sheetCountText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.bold, color: Colors.primary },
  emptyHistory:   { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyHistoryText:{ fontSize: 15, color: Colors.textLight, fontFamily: Fonts.regular },

  sessionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12,
  },
  sessionIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionInfo:   { flex: 1 },
  sessionTitle:  { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 3 },
  sessionMeta:   { fontSize: 12, color: Colors.textLight, fontFamily: Fonts.regular },
  sessionDelete: { padding: 4 },
});
