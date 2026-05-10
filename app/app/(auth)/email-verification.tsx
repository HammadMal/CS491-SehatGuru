import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../../components/auth/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/auth.api';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { tempEmail } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleResendEmail = async () => {
    if (!tempEmail) {
      Alert.alert('Error', 'Email address not found');
      return;
    }

    setLoading(true);
    try {
      await authAPI.requestEmailVerification(tempEmail);
      Alert.alert('Email Sent', 'A new verification email has been sent. Please check your inbox.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Check Your Email</Text>

        <Text style={styles.subtitle}>
          We've sent a verification link to{'\n'}
          <Text style={styles.email}>{tempEmail || 'your email'}</Text>
        </Text>

        <View style={styles.instructionsContainer}>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>Open your email inbox</Text>
          </View>

          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>Click the verification link in the email</Text>
          </View>

          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>Return to the app and log in</Text>
          </View>
        </View>

        <Text style={styles.noteText}>
          Note: The verification link will expire in 24 hours
        </Text>

        <CustomButton
          title="Go to Login"
          onPress={handleGoToLogin}
          style={styles.loginButton}
        />

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the email? </Text>
          <CustomButton
            title="Resend Email"
            onPress={handleResendEmail}
            loading={loading}
            disabled={loading}
            variant="outline"
            style={styles.resendButton}
          />
        </View>

        <Text style={styles.helpText}>
          Check your spam folder if you don't see the email
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  email: {
    fontWeight: '600',
    fontFamily: Fonts.semibold,
    color: Colors.textPrimary,
  },
  instructionsContainer: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
  noteText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  loginButton: {
    marginBottom: 20,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  resendButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  helpText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
