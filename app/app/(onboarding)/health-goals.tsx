import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from '../../components/auth/CustomButton';
import { ProgressIndicator } from '../../components/auth/ProgressIndicator';
import { HealthGoalCard } from '../../components/auth/HealthGoalCard';
import { useOnboarding } from '../../hooks/useOnboarding';
import { HealthGoal } from '../../types/onboarding.types';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

const healthGoals = [
  {
    value: 'lose-weight' as HealthGoal,
    title: 'Lose Weight',
    description: 'Reduce body fat and achieve a healthier weight',
  },
  {
    value: 'maintain-weight' as HealthGoal,
    title: 'Maintain Weight',
    description: 'Stay at your current weight',
  },
  {
    value: 'gain-weight' as HealthGoal,
    title: 'Gain Weight',
    description: 'Increase body mass in a healthy way',
  },
  {
    value: 'build-muscle' as HealthGoal,
    title: 'Build Muscle',
    description: 'Increase muscle mass and strength',
  },
  {
    value: 'improve-health' as HealthGoal,
    title: 'Improve Health',
    description: 'Better overall health and wellness',
  },
  {
    value: 'manage-condition' as HealthGoal,
    title: 'Manage Condition',
    description: 'Manage diabetes, cholesterol, or other conditions',
  },
];

export default function HealthGoalsScreen() {
  const router = useRouter();
  const { onboardingData, updateHealthGoals } = useOnboarding();
  const [selectedGoals, setSelectedGoals] = useState<HealthGoal[]>(onboardingData.healthGoals);

  const toggleGoal = (goal: HealthGoal) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const handleContinue = () => {
    if (selectedGoals.length === 0) {
      return;
    }

    updateHealthGoals(selectedGoals);
    router.push('/(onboarding)/daily-intake');
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

        <ProgressIndicator totalSteps={4} currentStep={2} />

        <Text style={styles.title}>What is your health goal?</Text>
        <Text style={styles.subtitle}>Choose one or more objectives</Text>

        <View style={styles.optionsContainer}>
          {healthGoals.map((goal) => (
            <HealthGoalCard
              key={goal.value}
              title={goal.title}
              description={goal.description}
              selected={selectedGoals.includes(goal.value)}
              onSelect={() => toggleGoal(goal.value)}
            />
          ))}
        </View>

        <CustomButton
          title="Continue"
          onPress={handleContinue}
          disabled={selectedGoals.length === 0}
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
