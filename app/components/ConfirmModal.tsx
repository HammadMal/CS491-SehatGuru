import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../constants/fonts';

export type ConfirmModalVariant = 'danger' | 'success' | 'info';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancel"). Pass null to hide it. */
  cancelLabel?: string | null;
  /** Controls button colour. 'danger' = red, 'success' = green, 'info' = green */
  variant?: ConfirmModalVariant;
  /** Ionicons name for the header icon */
  icon?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  icon,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const isDestructive = variant === 'danger';
  const confirmColor = isDestructive ? '#ef4444' : '#22c55e';
  const iconBg       = isDestructive ? '#fef2f2' : '#f0fdf4';
  const iconColor    = isDestructive ? '#ef4444' : '#22c55e';

  const defaultIcon = isDestructive ? 'trash-outline' : 'checkmark-circle-outline';
  const displayIcon = icon ?? defaultIcon;

  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Stop propagation so tapping the card doesn't dismiss */}
        <Pressable style={styles.card} onPress={() => {}}>

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Ionicons name={displayIcon as any} size={28} color={iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.btnRow}>
            {cancelLabel !== null && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: confirmColor },
                cancelLabel === null && styles.confirmBtnFull,
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },

  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },

  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.semibold,
    color: '#374151',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmBtnFull: {
    flex: 1,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: '#fff',
  },
});
