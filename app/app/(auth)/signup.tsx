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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomInput } from '../../components/auth/CustomInput';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { CustomButton } from '../../components/auth/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword, validateConfirmPassword } from '../../utils/validation';
import { Fonts } from '../../constants/fonts';

const { width: W, height: H } = Dimensions.get('window');
const IMG_H = H * 0.52;

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
    <View style={styles.root}>
      {/* Hero image — top portion only */}
      <Image
        source={require('../../assets/images/foodhero.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.7)', '#000']}
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
            <Text style={styles.heroTitle}>Start Your Journey</Text>
            <Text style={styles.heroSub}>Create an account and begin tracking{'\n'}your nutrition today</Text>
          </View>

          {/* White card */}
          <ScrollView
            style={styles.card}
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.cardSub}>Fill in the details to get started</Text>

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

            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.8} style={styles.switchPill}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <Text style={styles.switchLink}>Log in</Text>
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
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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

  mainBtn: { marginTop: 8, marginBottom: 20 },

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
