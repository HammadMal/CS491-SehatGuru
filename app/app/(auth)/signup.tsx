import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomInput } from '../../components/auth/CustomInput';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { CustomButton } from '../../components/auth/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword, validateConfirmPassword } from '../../utils/validation';
import { Fonts } from '../../constants/fonts';

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
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmPasswordErr = validateConfirmPassword(password, confirmPassword);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPasswordErr);
    if (emailErr || passwordErr || confirmPasswordErr) return;

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
    <SafeAreaView style={styles.outer} edges={['top']}>
      <View style={styles.gradient}>
        {/* top link */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
            <Text style={styles.topLink}>Already a User?</Text>
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.logoArea}>
          <Image
            source={require('../../assets/images/new.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        {/* Card */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.cardWrapper}
        >
          <ScrollView
            style={styles.card}
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.cardTitle}>Let's Create Your Account</Text>

            <CustomInput
              placeholder="Enter your email"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(null); }}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <PasswordInput
              placeholder="Create a password"
              value={password}
              onChangeText={(t) => { setPassword(t); setPasswordError(null); }}
              error={passwordError}
            />

            <PasswordInput
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setConfirmPasswordError(null); }}
              error={confirmPasswordError}
            />

            <CustomButton
              title="Sign Up"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
              style={styles.mainBtn}
            />

            <Text style={styles.terms}>
              By signing up, I agree to the{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#F3F6FA' },
  gradient: { flex: 1, backgroundColor: '#F3F6FA' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 0,
  },
  topLink: {
    color: '#22c55e',
    fontSize: 14,
    fontFamily: Fonts.semibold,
    fontWeight: '600',
  },

  logoArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  logoImg: { width: 180, height: 180, marginBottom: -12, marginRight: 10 },
  appName: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Fonts.regular,
    color: '#111',
    letterSpacing: 0.2,
  },

  cardWrapper: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: '#111',
    textAlign: 'center',
    marginBottom: 28,
  },

  mainBtn: { marginTop: 8, marginBottom: 20 },

  terms: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },
  termsLink: {
    color: '#374151',
    fontFamily: Fonts.semibold,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
