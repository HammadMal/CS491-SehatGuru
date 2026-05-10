import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

interface HealthGoalCardProps {
  title: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
}

export const HealthGoalCard: React.FC<HealthGoalCardProps> = ({
  title,
  description,
  selected,
  onSelect,
  icon,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.content}>
        <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
        {description && (
          <Text style={[styles.description, selected && styles.descriptionSelected]}>
            {description}
          </Text>
        )}
      </View>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Ionicons name="checkmark" size={18} color={Colors.backgroundLight} />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.backgroundLight,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  titleSelected: {
    color: Colors.primary,
  },
  description: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  descriptionSelected: {
    color: Colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
