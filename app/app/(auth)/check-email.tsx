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
  const { tempEmail } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

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

    setLoading(true);
    try {
      const fullCode = code.join('');
      // Mock OTP verification - accept any 6-digit code
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
        router.push('/(auth)/set-new-password');
      } else {
        Alert.alert('Verification Failed', 'Invalid OTP code');
        setCode(['', '', '', '', '', '']);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Verification failed');
      setCode(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setCountdown(60);
    setCanResend(false);
    Alert.alert('OTP Sent', 'A new OTP has been sent to your email');
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
    marginBottom: 40,
    lineHeight: 22,
  },
  email: {
    fontWeight: '600',
    color: Colors.textPrimary,
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
