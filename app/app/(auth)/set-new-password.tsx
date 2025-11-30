import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { CustomButton } from '../../components/auth/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { validatePassword, validateConfirmPassword, getPasswordRequirements } from '../../utils/validation';
import { Colors } from '../../constants/colors';

export default function SetNewPasswordScreen() {
  const router = useRouter();
  const { setNewPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requirements = getPasswordRequirements(password);

  const handleResetPassword = async () => {
    const passwordErr = validatePassword(password);
    const confirmPasswordErr = validateConfirmPassword(password, confirmPassword);

    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPasswordErr);

    if (passwordErr || confirmPasswordErr) {
      return;
    }

    setLoading(true);
    try {
      await setNewPassword(password);
      // Show success message and redirect to login
      Alert.alert(
        'Success',
        'Your password has been reset successfully. Please login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not reset password');
      setLoading(false);
    }
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be different from previously used passwords
          </Text>

        <View style={styles.form}>
          <PasswordInput
            label="New Password"
            placeholder="Enter new password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError(null);
            }}
            error={passwordError}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setConfirmPasswordError(null);
            }}
            error={confirmPasswordError}
          />

          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password must contain:</Text>
            <RequirementItem met={requirements.minLength} text="At least 8 characters" />
            <RequirementItem met={requirements.hasUppercase} text="One uppercase letter" />
            <RequirementItem met={requirements.hasLowercase} text="One lowercase letter" />
            <RequirementItem met={requirements.hasNumber} text="One number" />
          </View>

          <CustomButton
            title="Reset Password"
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading || !Object.values(requirements).every((r) => r)}
            style={styles.resetButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
  <View style={styles.requirement}>
    <Ionicons
      name={met ? 'checkmark-circle' : 'ellipse-outline'}
      size={20}
      color={met ? Colors.success : Colors.disabled}
    />
    <Text style={[styles.requirementText, met && styles.requirementTextMet]}>{text}</Text>
  </View>
);

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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  requirementsContainer: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  requirementTextMet: {
    color: Colors.success,
  },
  resetButton: {
    marginTop: 8,
  },
});
