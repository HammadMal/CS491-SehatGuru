import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Fonts } from '../constants/fonts';

interface MealPlanActionsProps {
  onApprove: () => void;
  onReject: () => void;
  loading?: boolean;
}

export function MealPlanActions({ onApprove, onReject, loading = false }: MealPlanActionsProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {/* Label row */}
        <View style={styles.labelRow}>
          <View style={styles.labelIcon}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={14} color="#22c55e" />
          </View>
          <Text style={styles.labelText}>Save this meal plan?</Text>
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.approveBtn, loading && { opacity: 0.75 }]}
            onPress={onApprove}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
            }
            <Text style={styles.approveTxt}>{loading ? 'Saving…' : 'Save to Meal Plans'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={onReject}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingVertical: 6 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1, borderColor: '#eef0f3',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    gap: 12,
  },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
  },
  labelText: { fontSize: 14, fontWeight: '600', fontFamily: Fonts.semibold, color: '#374151' },

  actions: { flexDirection: 'row', gap: 10 },

  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 14, paddingVertical: 12, gap: 7,
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  approveTxt: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: Fonts.bold },

  rejectBtn: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
});
