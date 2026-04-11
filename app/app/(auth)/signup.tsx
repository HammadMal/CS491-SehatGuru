import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CustomInput } from '../../components/auth/CustomInput';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { CustomButton } from '../../components/auth/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword, validateConfirmPassword } from '../../utils/validation';
import { Colors } from '../../constants/colors';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // Validate inputs
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmPasswordErr = validateConfirmPassword(password, confirmPassword);

    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPasswordErr);

    if (emailErr || passwordErr || confirmPasswordErr) {
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started with SehatGuru</Text>

          <View style={styles.form}>
            <CustomInput
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError(null);
              }}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <PasswordInput
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError(null);
              }}
              error={passwordError}
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmPasswordError(null);
              }}
              error={confirmPasswordError}
            />

            <CustomButton
              title="Sign Up"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
              style={styles.signupButton}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
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
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  signupButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
