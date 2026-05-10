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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomInput } from '../../components/auth/CustomInput';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { CustomButton } from '../../components/auth/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword } from '../../utils/validation';
import { Fonts } from '../../constants/fonts';

const { width: W, height: H } = Dimensions.get('window');
const IMG_H = H * 0.52;

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
    <View style={styles.root}>
      {/* Hero image — top portion only, keeps landscape image from over-zooming */}
      <Image
        source={require('../../assets/images/foodhero.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      {/* Gradient fades image into black toward the card */}
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.55)', '#000']}
        locations={[0, 0.6, 1]}
        style={styles.gradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Hero text */}
          <View style={styles.heroArea}>
            <Text style={styles.heroTitle}>Welcome Back</Text>
            <Text style={styles.heroSub}>Log in to track your nutrition{'\n'}and reach your goals</Text>
          </View>

          {/* White card */}
          <ScrollView
            style={styles.card}
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.cardSub}>Enter your credentials below</Text>

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

            <TouchableOpacity onPress={() => router.replace('/(auth)/signup')} activeOpacity={0.8} style={styles.switchPill}>
              <Text style={styles.switchText}>New here? </Text>
              <Text style={styles.switchLink}>Create an account</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  bgImage: { position: 'absolute', top: 0, left: 0, width: W, height: IMG_H },
  gradient: { position: 'absolute', top: 0, left: 0, width: W, height: IMG_H },

  heroArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    fontFamily: Fonts.extrabold,
    marginBottom: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },

  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },

  cardLogo: {
    width: 52,
    height: 52,
    alignSelf: 'center',
    marginTop: 20,
    opacity: 0.5,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.extrabold,
    color: '#111',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#9ca3af',
    fontFamily: Fonts.regular,
    marginBottom: 24,
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

  switchPill: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  switchText: { fontSize: 13, color: '#9ca3af', fontFamily: Fonts.regular },
  switchLink: { fontSize: 13, color: '#22c55e', fontFamily: Fonts.semibold, fontWeight: '600' },

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
