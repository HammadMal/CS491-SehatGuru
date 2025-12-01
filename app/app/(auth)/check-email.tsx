import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from '../../components/auth/CustomButton';
import { VerificationCodeInput } from '../../components/auth/VerificationCodeInput';
import { useAuth } from '../../hooks/useAuth';
import { validateVerificationCode } from '../../utils/validation';
import { Colors } from '../../constants/colors';

export default function CheckEmailScreen() {
  const router = useRouter();
  const { tempEmail, verifyOTP, resetPassword } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [verifiedOTP, setVerifiedOTP] = useState<string | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (code.every((digit) => digit !== '')) {
      handleVerify();
    }
  }, [code]);

  const handleVerify = async () => {
    const error = validateVerificationCode(code);
    if (error) {
      Alert.alert('Invalid Code', error);
      return;
    }

    if (!tempEmail) {
      Alert.alert('Error', 'Email address not found. Please start the password reset process again.');
      router.replace('/(auth)/forgot-password');
      return;
    }

    setLoading(true);
    try {
      const fullCode = code.join('');

      // Verify OTP with backend
      await verifyOTP(tempEmail, fullCode);

      // Store the verified OTP for the next screen
      setVerifiedOTP(fullCode);

      // Navigate to set new password screen
      router.push({
        pathname: '/(auth)/set-new-password',
        params: { otp: fullCode, email: tempEmail },
      });
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid OTP code');
      setCode(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!tempEmail) {
      Alert.alert('Error', 'Email address not found');
      return;
    }

    try {
      await resetPassword(tempEmail);
      setCountdown(60);
      setCanResend(false);
      Alert.alert('OTP Sent', 'A new OTP has been sent to your email');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          We sent a verification code to{'\n'}
          <Text style={styles.email}>{tempEmail || 'your email'}</Text>
        </Text>

        <Text style={styles.noteText}>
          The OTP code will expire in 10 minutes
        </Text>

        <VerificationCodeInput code={code} setCode={setCode} />

        <CustomButton
          title="Verify OTP"
          onPress={handleVerify}
          loading={loading}
          disabled={loading || code.some((digit) => digit === '')}
          style={styles.verifyButton}
        />

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.countdown}>Resend in {countdown}s</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backToLogin}
        >
          <Text style={styles.backToLoginText}>Back to login</Text>
        </TouchableOpacity>
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
    paddingTop: 60,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  email: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  noteText: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  verifyButton: {
    marginTop: 20,
    marginBottom: 24,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  resendLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  countdown: {
    fontSize: 14,
    color: Colors.textLight,
  },
  backToLogin: {
    padding: 12,
    alignItems: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
