import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../../components/auth/Logo';
import { CustomInput } from '../../components/auth/CustomInput';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { CustomButton } from '../../components/auth/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword } from '../../utils/validation';
import { Colors } from '../../constants/colors';
import { useGoogleAuth, getGoogleIdToken } from '../../utils/googleAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, googleLogin, isAuthenticated, hasCompletedOnboarding } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const loadingTimeoutRef = useRef<number | null>(null);

  // Google OAuth setup
  const { request, response, promptAsync } = useGoogleAuth();

  // Clear loading state when authentication succeeds
  useEffect(() => {
    if (loading && isAuthenticated) {
      // Set a small delay to allow navigation to start
      const timer = setTimeout(() => {
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, isAuthenticated]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response) {
      handleGoogleResponse();
    }
  }, [response]);

  const handleGoogleResponse = async () => {
    try {
      const idToken = getGoogleIdToken(response);

      if (idToken) {
        setGoogleLoading(true);
        await googleLogin(idToken);
        // Navigation will be handled by root layout based on auth state
      } else if (response?.type === 'error') {
        Alert.alert('Google Sign In Failed', 'Could not complete Google authentication');
      }
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message || 'Google authentication failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await promptAsync();
    } catch (error) {
      Alert.alert('Error', 'Failed to open Google Sign In');
    }
  };

  const handleLogin = async () => {
    // Validate inputs
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setEmailError(emailErr);
    setPasswordError(passwordErr);

    if (emailErr || passwordErr) {
      return;
    }

    setLoading(true);

    // Safety timeout: clear loading state after 5 seconds if still loading
    // This prevents infinite spinner if navigation fails
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        console.warn('Login timeout: clearing loading state');
        setLoading(false);
      }
    }, 5000);

    try {
      await login(email, password);
      // Navigation is handled by root layout based on auth state
      // Loading state will be cleared by useEffect when isAuthenticated changes
    } catch (error: any) {
      // Clear timeout on error
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      // Check if error is due to unverified email
      const errorMessage = error.message || 'Invalid email or password';
      if (errorMessage.toLowerCase().includes('verify your email')) {
        Alert.alert(
          'Email Not Verified',
          'Please verify your email before logging in. Check your inbox for the verification link.',
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      } else {
        Alert.alert('Login Failed', errorMessage);
      }
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
          <Logo size={150} variant="transparent" />

          <Text style={styles.title}>Welcome to SehatGuru</Text>
          <Text style={styles.subtitle}>Sign in to continue to your account</Text>

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
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError(null);
              }}
              error={passwordError}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <CustomButton
              title="Login"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, (googleLoading || !request) && styles.googleButtonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading || !request}
            >
              {googleLoading ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <Text style={styles.googleButtonText}>Sign in / Sign up with Google</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.signupLink}>Sign up</Text>
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
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginBottom: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.textSecondary,
    opacity: 0.3,
  },
  dividerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1F1F',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
