import React, { useState, useEffect, useRef } from 'react';
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
import { validateEmail, validatePassword } from '../../utils/validation';
import { Fonts } from '../../constants/fonts';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading && isAuthenticated) {
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, []);

  const handleLogin = async () => {
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    if (emailErr || passwordErr) return;

    setLoading(true);
    loadingTimeoutRef.current = setTimeout(() => setLoading(false), 5000);

    try {
      await login(email, password);
    } catch (error: any) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      const msg = error.message || 'Invalid email or password';
      if (msg.toLowerCase().includes('verify your email')) {
        Alert.alert('Email Not Verified', 'Please verify your email before logging in.');
      } else {
        Alert.alert('Login Failed', msg);
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.outer} edges={['top']}>
      <View style={styles.gradient}>
        {/* top link */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => router.replace('/(auth)/signup')} activeOpacity={0.7}>
            <Text style={styles.topLink}>New User?</Text>
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
            <Text style={styles.cardTitle}>Welcome Back. Log in to Continue</Text>

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
              placeholder="Enter your password"
              value={password}
              onChangeText={(t) => { setPassword(t); setPasswordError(null); }}
              error={passwordError}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotRow}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotBase}>Forgot password? </Text>
              <Text style={styles.forgotLink}>Reset it</Text>
            </TouchableOpacity>

            <CustomButton
              title="Login"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.mainBtn}
            />

            <Text style={styles.terms}>
              By signing in, I accept the{' '}
              <Text style={styles.termsLink}>Terms & Conditions</Text>
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

  forgotRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 20,
  },
  forgotBase: { fontSize: 13, color: '#888', fontFamily: Fonts.regular },
  forgotLink: { fontSize: 13, color: '#22c55e', fontFamily: Fonts.semibold, fontWeight: '600' },

  mainBtn: { marginBottom: 20 },

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
