import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerificationCodeInput } from '../../components/auth/VerificationCodeInput';
import { CustomButton } from '../../components/auth/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { validateVerificationCode } from '../../utils/validation';
import { Colors } from '../../constants/colors';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { verifyEmail, tempEmail } = useAuth();
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
      const success = await verifyEmail(fullCode);
      if (success) {
        router.replace('/(auth)/important-info');
      } else {
        Alert.alert('Verification Failed', 'Invalid verification code');
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
    Alert.alert('Code Sent', 'A new verification code has been sent to your email');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a code to{'\n'}
          <Text style={styles.email}>{tempEmail || 'your email'}</Text>
        </Text>

        <VerificationCodeInput code={code} setCode={setCode} />

        <CustomButton
          title="Verify"
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
});
