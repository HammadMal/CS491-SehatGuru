import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
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

const PRESET_CONDITIONS = ['Diabetes', 'Hypertension', 'High Cholesterol', 'PCOS', 'Thyroid'];

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
  const { onboardingData, updateHealthGoals, updateDietaryPreferences } = useOnboarding();
  const [selectedGoals, setSelectedGoals] = useState<HealthGoal[]>(onboardingData.healthGoals);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    onboardingData.dietaryPreferences?.medicalConditions ?? []
  );
  const [customCondition, setCustomCondition] = useState('');

  const isManageCondition = selectedGoals.includes('manage-condition');

  const toggleGoal = (goal: HealthGoal) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const toggleCondition = (condition: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition]
    );
  };

  const addCustomCondition = () => {
    const trimmed = customCondition.trim();
    if (trimmed && !selectedConditions.includes(trimmed)) {
      setSelectedConditions((prev) => [...prev, trimmed]);
    }
    setCustomCondition('');
  };

  const removeCondition = (condition: string) => {
    setSelectedConditions((prev) => prev.filter((c) => c !== condition));
  };

  const handleContinue = () => {
    if (selectedGoals.length === 0) return;

    updateHealthGoals(selectedGoals);
    updateDietaryPreferences({
      ...onboardingData.dietaryPreferences,
      medicalConditions: isManageCondition ? selectedConditions : [],
    });
    router.push('/(onboarding)/daily-intake');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

        {/* Condition picker — shown only when manage-condition is selected */}
        {isManageCondition && (
          <View style={styles.conditionBox}>
            <Text style={styles.conditionTitle}>What condition are you managing?</Text>
            <Text style={styles.conditionSubtitle}>Select all that apply, or add your own</Text>

            <View style={styles.chipRow}>
              {PRESET_CONDITIONS.map((c) => {
                const active = selectedConditions.includes(c);
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleCondition(c)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom condition input */}
            <View style={styles.customRow}>
              <TextInput
                style={styles.customInput}
                placeholder="e.g. IBS, Crohn's, GERD…"
                placeholderTextColor={Colors.textSecondary}
                value={customCondition}
                onChangeText={setCustomCondition}
                onSubmitEditing={addCustomCondition}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addBtn, !customCondition.trim() && styles.addBtnDisabled]}
                onPress={addCustomCondition}
                disabled={!customCondition.trim()}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Show custom conditions as removable tags */}
            {selectedConditions.filter((c) => !PRESET_CONDITIONS.includes(c)).length > 0 && (
              <View style={styles.chipRow}>
                {selectedConditions
                  .filter((c) => !PRESET_CONDITIONS.includes(c))
                  .map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, styles.chipActive]}
                      onPress={() => removeCondition(c)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, styles.chipTextActive]}>{c}</Text>
                      <Ionicons name="close" size={13} color={Colors.primary} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        )}

        <CustomButton
          title="Continue"
          onPress={handleContinue}
          disabled={selectedGoals.length === 0}
          style={styles.continueButton}
        />
      </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 60,
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
    marginBottom: 12,
  },
  continueButton: {
    marginBottom: 20,
  },
  conditionBox: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 24,
  },
  conditionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  conditionSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#f0fdf4',
  },
  chipText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.semibold,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  customInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: Colors.border,
  },
});
