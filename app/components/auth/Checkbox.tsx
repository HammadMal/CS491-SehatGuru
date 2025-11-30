import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label?: string | React.ReactNode;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onToggle, label }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={18} color={Colors.backgroundLight} />}
      </View>
      {label && (
        <View style={styles.labelContainer}>
          {typeof label === 'string' ? <Text style={styles.label}>{label}</Text> : label}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: Colors.backgroundLight,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  labelContainer: {
    flex: 1,
    marginTop: 2,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
