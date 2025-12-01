import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface ProgressIndicatorProps {
  totalSteps: number;
  currentStep: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ totalSteps, currentStep }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index <= currentStep ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    backgroundColor: Colors.disabled,
  },
});
