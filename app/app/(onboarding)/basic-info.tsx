import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CustomInput } from '../../components/auth/CustomInput';
import { CustomButton } from '../../components/auth/CustomButton';
import { ProgressIndicator } from '../../components/auth/ProgressIndicator';
import { useOnboarding } from '../../hooks/useOnboarding';
import { validateName, validateHeight, validateWeight, validateAge, validateGender } from '../../utils/validation';
import { Colors } from '../../constants/colors';

export default function BasicInfoScreen() {
  const router = useRouter();
  const { onboardingData, updateBasicInfo } = useOnboarding();

  const [fullName, setFullName] = useState(onboardingData.basicInfo.fullName);
  const [height, setHeight] = useState(onboardingData.basicInfo.height);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>(onboardingData.basicInfo.heightUnit);
  const [weight, setWeight] = useState(onboardingData.basicInfo.weight);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(onboardingData.basicInfo.weightUnit);
  const [age, setAge] = useState(onboardingData.basicInfo.age);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer-not-to-say' | ''>(onboardingData.basicInfo.gender);

  const [errors, setErrors] = useState({
    fullName: null as string | null,
    height: null as string | null,
    weight: null as string | null,
    age: null as string | null,
    gender: null as string | null,
  });

  const handleContinue = () => {
    // Validate all fields
    const newErrors = {
      fullName: validateName(fullName),
      height: validateHeight(height, heightUnit),
      weight: validateWeight(weight, weightUnit),
      age: validateAge(age),
      gender: validateGender(gender),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some((error) => error !== null)) {
      return;
    }

    // Save data
    updateBasicInfo({
      fullName,
      height,
      heightUnit,
      weight,
      weightUnit,
      age,
      gender,
    });

    router.push('/(onboarding)/activity-level');
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

          <ProgressIndicator totalSteps={4} currentStep={0} />

          <Text style={styles.title}>Basic Information</Text>
          <Text style={styles.subtitle}>Tell us about yourself</Text>

        <View style={styles.form}>
          <CustomInput
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              setErrors({ ...errors, fullName: null });
            }}
            error={errors.fullName}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <CustomInput
                label="Height"
                placeholder="0"
                value={height}
                onChangeText={(text) => {
                  setHeight(text);
                  setErrors({ ...errors, height: null });
                }}
                error={errors.height}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.unitSelector}>
              <Text style={styles.unitLabel}>Unit</Text>
              <View style={styles.unitButtons}>
                <TouchableOpacity
                  style={[styles.unitButton, heightUnit === 'cm' && styles.unitButtonActive]}
                  onPress={() => setHeightUnit('cm')}
                >
                  <Text style={[styles.unitButtonText, heightUnit === 'cm' && styles.unitButtonTextActive]}>
                    cm
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, heightUnit === 'ft' && styles.unitButtonActive]}
                  onPress={() => setHeightUnit('ft')}
                >
                  <Text style={[styles.unitButtonText, heightUnit === 'ft' && styles.unitButtonTextActive]}>
                    ft
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <CustomInput
                label="Weight"
                placeholder="0"
                value={weight}
                onChangeText={(text) => {
                  setWeight(text);
                  setErrors({ ...errors, weight: null });
                }}
                error={errors.weight}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.unitSelector}>
              <Text style={styles.unitLabel}>Unit</Text>
              <View style={styles.unitButtons}>
                <TouchableOpacity
                  style={[styles.unitButton, weightUnit === 'kg' && styles.unitButtonActive]}
                  onPress={() => setWeightUnit('kg')}
                >
                  <Text style={[styles.unitButtonText, weightUnit === 'kg' && styles.unitButtonTextActive]}>
                    kg
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, weightUnit === 'lbs' && styles.unitButtonActive]}
                  onPress={() => setWeightUnit('lbs')}
                >
                  <Text style={[styles.unitButtonText, weightUnit === 'lbs' && styles.unitButtonTextActive]}>
                    lbs
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <CustomInput
            label="Age"
            placeholder="Enter your age"
            value={age}
            onChangeText={(text) => {
              setAge(text);
              setErrors({ ...errors, age: null });
            }}
            error={errors.age}
            keyboardType="number-pad"
          />

          <View style={styles.genderContainer}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderButtons}>
              {[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
                { value: 'prefer-not-to-say', label: 'Prefer not to say' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderButton,
                    gender === option.value && styles.genderButtonActive,
                  ]}
                  onPress={() => {
                    setGender(option.value as any);
                    setErrors({ ...errors, gender: null });
                  }}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      gender === option.value && styles.genderButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
          </View>

          <CustomButton
            title="Continue"
            onPress={handleContinue}
            style={styles.continueButton}
          />
        </View>
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
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  unitSelector: {
    width: 100,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
  },
  unitButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  unitButtonTextActive: {
    color: Colors.backgroundLight,
  },
  genderContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  genderButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundLight,
  },
  genderButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  genderButtonTextActive: {
    color: Colors.backgroundLight,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  continueButton: {
    marginTop: 8,
  },
});
