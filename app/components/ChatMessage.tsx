import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import Markdown from 'react-native-markdown-display';
import type { Message } from '../types/chat.types';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowBot,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Bot avatar dot */}
      {!isUser && (
        <View style={styles.botAvatar}>
          <Image source={require('../assets/images/Guru.png')} style={{ width: 22, height: 22, borderRadius: 11 }} resizeMode="contain" />
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        {isUser ? (
          <Text style={styles.userText}>{message.content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        )}
        <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
          {new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </Animated.View>
  );
};

const markdownStyles = {
  body:        { color: Colors.textPrimary, fontSize: 15, lineHeight: 22, fontFamily: Fonts.regular },
  paragraph:   { marginTop: 0, marginBottom: 8 },
  strong:      { fontWeight: '700' as const, fontFamily: Fonts.bold, color: Colors.textPrimary },
  em:          { fontStyle: 'italic' as const },
  bullet_list: { marginBottom: 8 },
  ordered_list:{ marginBottom: 8 },
  list_item:   { marginBottom: 4 },
  code_inline: {
    backgroundColor: '#f3f4f6', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4,
    fontSize: 13, fontFamily: 'monospace',
  },
  code_block: {
    backgroundColor: '#f3f4f6', padding: 12,
    borderRadius: 10, fontSize: 13, fontFamily: 'monospace',
  },
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  rowUser: { justifyContent: 'flex-end' },
  rowBot:  { justifyContent: 'flex-start' },

  botAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },

  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 5,
  },
  botBubble: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#eef0f3',
    borderBottomLeftRadius: 5,
  },

  userText: { fontSize: 15, lineHeight: 22, color: '#fff', fontFamily: Fonts.regular },

  timestamp: {
    fontSize: 10, marginTop: 5,
    color: Colors.textLight, fontWeight: '500', fontFamily: Fonts.medium, alignSelf: 'flex-end',
  },
  timestampUser: { color: 'rgba(255,255,255,0.65)' },
});
