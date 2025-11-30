import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Checkbox } from '../../components/auth/Checkbox';
import { CustomButton } from '../../components/auth/CustomButton';
import { Colors } from '../../constants/colors';

export default function ImportantInfoScreen() {
  const router = useRouter();
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [healthDataAccepted, setHealthDataAccepted] = useState(false);

  const handleContinue = () => {
    router.replace('/(onboarding)/basic-info');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Important Information</Text>
        <Text style={styles.subtitle}>
          Before we continue, please review and accept the following
        </Text>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Privacy & Data Usage</Text>
          <Text style={styles.infoText}>
            SehatGuru is committed to protecting your privacy. We collect and use your personal and
            health information to provide you with personalized nutrition guidance and meal tracking
            services.
          </Text>
          <Text style={styles.infoText}>
            Your data is encrypted and stored securely. We will never sell your personal information
            to third parties. You can request deletion of your data at any time.
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <Checkbox
            checked={privacyAccepted}
            onToggle={() => setPrivacyAccepted(!privacyAccepted)}
            label={
              <Text style={styles.checkboxLabel}>
                I have read and agree to the{' '}
                <Text style={styles.link}>Privacy Policy</Text> and{' '}
                <Text style={styles.link}>Terms of Service</Text>
              </Text>
            }
          />

          <Checkbox
            checked={healthDataAccepted}
            onToggle={() => setHealthDataAccepted(!healthDataAccepted)}
            label={
              <Text style={styles.checkboxLabel}>
                I acknowledge that my health data will be stored and processed to provide
                personalized nutrition recommendations
              </Text>
            }
          />
        </View>

        <CustomButton
          title="Continue"
          onPress={handleContinue}
          disabled={!privacyAccepted || !healthDataAccepted}
          style={styles.continueButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  infoContainer: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  checkboxContainer: {
    marginBottom: 32,
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  link: {
    color: Colors.primary,
    fontWeight: '600',
  },
  continueButton: {
    marginBottom: 20,
  },
});
