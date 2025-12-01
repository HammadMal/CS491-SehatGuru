import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from '../../components/auth/CustomButton';
import { ProgressIndicator } from '../../components/auth/ProgressIndicator';
import { Checkbox } from '../../components/auth/Checkbox';
import { CustomInput } from '../../components/auth/CustomInput';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/colors';

export default function DailyIntakeScreen() {
  const router = useRouter();
  const { onboardingData, updateMealPreferences, updateDietaryPreferences, completeOnboarding } = useOnboarding();
  const { isAuthenticated } = useAuth();

  const [mealPreferences, setMealPreferences] = useState(onboardingData.mealPreferences);
  const [dietaryPreferences, setDietaryPreferences] = useState(onboardingData.dietaryPreferences);
  const [loading, setLoading] = useState(false);

  const toggleMeal = (meal: keyof typeof mealPreferences) => {
    setMealPreferences({ ...mealPreferences, [meal]: !mealPreferences[meal] });
  };

  const toggleDietary = (dietary: keyof typeof dietaryPreferences) => {
    if (dietary === 'other') return; // Handle separately with input
    setDietaryPreferences({
      ...dietaryPreferences,
      [dietary]: !dietaryPreferences[dietary] as boolean,
    });
  };

  const handleComplete = async () => {
    // Update context with latest values (for local state consistency)
    updateMealPreferences(mealPreferences);
    updateDietaryPreferences(dietaryPreferences);

    setLoading(true);
    try {
      // Pass the current local state directly to avoid async state update issues
      await completeOnboarding(mealPreferences, dietaryPreferences);
      // Navigation will be handled automatically by root layout after state update
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <ProgressIndicator totalSteps={4} currentStep={3} />

          <Text style={styles.title}>Daily Meal Preferences</Text>
          <Text style={styles.subtitle}>What meals do you typically eat?</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meals</Text>
          <Checkbox
            checked={mealPreferences.breakfast}
            onToggle={() => toggleMeal('breakfast')}
            label="Breakfast"
          />
          <Checkbox
            checked={mealPreferences.lunch}
            onToggle={() => toggleMeal('lunch')}
            label="Lunch"
          />
          <Checkbox
            checked={mealPreferences.dinner}
            onToggle={() => toggleMeal('dinner')}
            label="Dinner"
          />
          <Checkbox
            checked={mealPreferences.snacks}
            onToggle={() => toggleMeal('snacks')}
            label="Snacks"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Preferences (Optional)</Text>
          <Checkbox
            checked={dietaryPreferences.vegetarian}
            onToggle={() => toggleDietary('vegetarian')}
            label="Vegetarian"
          />
          <Checkbox
            checked={dietaryPreferences.vegan}
            onToggle={() => toggleDietary('vegan')}
            label="Vegan"
          />
          <Checkbox
            checked={dietaryPreferences.glutenFree}
            onToggle={() => toggleDietary('glutenFree')}
            label="Gluten-Free"
          />

          <CustomInput
            label="Other Dietary Preferences"
            placeholder="e.g., Halal, Kosher, Dairy-free"
            value={dietaryPreferences.other}
            onChangeText={(text) =>
              setDietaryPreferences({ ...dietaryPreferences, other: text })
            }
            containerStyle={styles.otherInput}
          />
        </View>

        <CustomButton
          title="Complete"
          onPress={handleComplete}
          loading={loading}
          disabled={loading}
          style={styles.completeButton}
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  otherInput: {
    marginTop: 8,
  },
  completeButton: {
    marginBottom: 20,
    backgroundColor: Colors.success,
  },
});
