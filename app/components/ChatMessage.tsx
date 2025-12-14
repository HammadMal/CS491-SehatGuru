import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Markdown from 'react-native-markdown-display';
import type { Message } from '../types/chat.types';
import { Colors } from '../constants/colors';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.botContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        {isUser ? (
          <Text style={[styles.text, styles.userText]}>{message.content}</Text>
        ) : (
          <Markdown
            style={{
              body: {
                color: Colors.textPrimary,
                fontSize: 15,
                lineHeight: 22,
              },
              paragraph: {
                marginTop: 0,
                marginBottom: 8,
              },
              strong: {
                fontWeight: '700',
                color: Colors.textPrimary,
              },
              em: {
                fontStyle: 'italic',
              },
              bullet_list: {
                marginBottom: 8,
              },
              ordered_list: {
                marginBottom: 8,
              },
              list_item: {
                marginBottom: 4,
              },
              code_inline: {
                backgroundColor: Colors.background,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                fontSize: 14,
                fontFamily: 'monospace',
              },
              code_block: {
                backgroundColor: Colors.background,
                padding: 12,
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'monospace',
              },
            }}
          >
            {message.content}
          </Markdown>
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  botContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderBottomLeftRadius: 6,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
    color: Colors.textLight,
    fontWeight: '500',
  },
  timestampUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
