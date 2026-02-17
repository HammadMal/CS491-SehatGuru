import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

import { useChatStore } from '../../store/useChatStore';
import { chatAPI } from '../../services/chat.api';
import { ChatMessage } from '../../components/ChatMessage';
import { Colors } from '../../constants/colors';
import { OnboardingContext } from '../../context/OnboardingContext';
import { AuthContext } from '../../context/AuthContext';
import type { Message, UserContext } from '../../types/chat.types';

export default function ChatbotScreen() {
  const [inputText, setInputText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const { messages, isLoading, addMessage, setLoading } = useChatStore();
  const onboardingContext = useContext(OnboardingContext);
  const authContext = useContext(AuthContext);

  // Build user context from onboarding data for personalized RAG responses
  const userContext: UserContext | undefined = useMemo(() => {
    if (!onboardingContext?.onboardingData) return undefined;
    return chatAPI.buildUserContext(
      onboardingContext.onboardingData,
      authContext?.user?.daily_calorie_goal ?? undefined,
    );
  }, [onboardingContext?.onboardingData, authContext?.user?.daily_calorie_goal]);

  // Keyboard listeners for better scroll handling
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Crypto.randomUUID(),
      content: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    // Add user message to store
    addMessage(userMessage);
    const currentMessage = inputText.trim();
    setInputText('');

    // Blur input to hide keyboard
    inputRef.current?.blur();

    // Set loading state
    setLoading(true);

    try {
      // Call API to get bot response with user context for personalized RAG responses
      const response = await chatAPI.sendMessage(currentMessage, userContext);

      // Add bot response to store
      const botMessage: Message = {
        id: Crypto.randomUUID(),
        content: response.response,
        sender: 'bot',
        timestamp: new Date(),
      };

      addMessage(botMessage);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to get response. Please try again.'
      );

      // Add error message from bot
      const errorMessage: Message = {
        id: Crypto.randomUUID(),
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="nutrition" size={20} color={Colors.primary} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>SehatGuru</Text>
            <Text style={styles.headerSubtitle}>Your Pakistani Nutrition Expert • AI Powered</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: keyboardHeight > 0 ? 20 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="leaf" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>SehatGuru</Text>
              <Text style={styles.emptyStateText}>
                Get personalized Pakistani nutrition advice based on dietary guidelines
              </Text>
              <View style={styles.suggestionContainer}>
                <Text style={styles.suggestionLabel}>Try asking:</Text>
                {[
                  '🍚 How many calories are in biryani?',
                  '🥗 What should a diabetic person eat?',
                  '💪 High protein Pakistani dishes for fitness',
                ].map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionBubble}
                    onPress={() => {
                      setInputText(suggestion.substring(3));
                      inputRef.current?.focus();
                    }}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBubble}>
                <View style={styles.dotContainer}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me anything..."
              placeholderTextColor={Colors.placeholder}
              multiline
              maxLength={2000}
              editable={!isLoading}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 200);
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons
                name="send"
                size={18}
                color={!inputText.trim() || isLoading ? Colors.disabled : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.backgroundLight,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: 20,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptyStateText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestionContainer: {
    width: '100%',
    alignItems: 'stretch',
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestionBubble: {
    backgroundColor: Colors.backgroundLight,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  loadingBubble: {
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderBottomLeftRadius: 6,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
  inputContainer: {
    backgroundColor: Colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.background,
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
});
