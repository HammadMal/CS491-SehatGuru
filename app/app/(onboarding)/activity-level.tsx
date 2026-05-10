import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from '../../components/auth/CustomButton';
import { ProgressIndicator } from '../../components/auth/ProgressIndicator';
import { ActivityLevelCard } from '../../components/auth/ActivityLevelCard';
import { useOnboarding } from '../../hooks/useOnboarding';
import { ActivityLevel } from '../../types/onboarding.types';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

const activityLevels = [
  {
    value: 'sedentary' as ActivityLevel,
    title: 'Sedentary',
    description: 'Little to no exercise',
  },
  {
    value: 'lightly-active' as ActivityLevel,
    title: 'Lightly Active',
    description: 'Exercise 1-3 times per week',
  },
  {
    value: 'moderately-active' as ActivityLevel,
    title: 'Moderately Active',
    description: 'Exercise 4-5 times per week',
  },
  {
    value: 'very-active' as ActivityLevel,
    title: 'Very Active',
    description: 'Intense exercise 6-7 times per week',
  },
  {
    value: 'extra-active' as ActivityLevel,
    title: 'Extra Active',
    description: 'Very intense exercise daily or physical job',
  },
];

export default function ActivityLevelScreen() {
  const router = useRouter();
  const { onboardingData, updateActivityLevel } = useOnboarding();
  const [selectedLevel, setSelectedLevel] = useState<ActivityLevel>(onboardingData.activityLevel);

  const handleContinue = () => {
    if (!selectedLevel) {
      return;
    }

    updateActivityLevel(selectedLevel);
    router.push('/(onboarding)/health-goals');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <ProgressIndicator totalSteps={4} currentStep={1} />

        <Text style={styles.title}>Activity Level</Text>
        <Text style={styles.subtitle}>Select your typical activity level</Text>

        <View style={styles.optionsContainer}>
          {activityLevels.map((level) => (
            <ActivityLevelCard
              key={level.value}
              title={level.title}
              description={level.description}
              selected={selectedLevel === level.value}
              onSelect={() => setSelectedLevel(level.value)}
            />
          ))}
        </View>

        <CustomButton
          title="Continue"
          onPress={handleContinue}
          disabled={!selectedLevel}
          style={styles.continueButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  continueButton: {
    marginBottom: 20,
  },
});
