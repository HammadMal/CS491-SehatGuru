import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMealStore } from '../../store/useMealStore';

export default function MealDetailScreen() {
  const { mealId, mealType } = useLocalSearchParams<{ mealId?: string; mealType?: string }>();
  const router = useRouter();
  const meal = useMealStore((state) => state.meals.find((item) => item.id === mealId));

  const handleBack = () => {
    if (mealType) {
      router.push({
        pathname: '/meal-type-summary',
        params: { mealType },
      });
    } else {
      router.back();
    }
  };

  if (!meal) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Meal not found</Text>
          <Text style={styles.emptySubtitle}>Please return to the dashboard and select a meal again.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const timestamp = new Date(meal.createdAt).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backLink} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#333" />
          <Text style={styles.backLinkText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <Text style={styles.sectionLabel}>{meal.mealType}</Text>
          <Text style={styles.mealTitle}>{meal.foodName}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Calories</Text>
            <Text style={styles.summaryValue}>{Math.round(meal.calories)} kcal</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Serving size</Text>
            <Text style={styles.summaryValue}>{meal.grams} g</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Source</Text>
            <Text style={styles.summaryValue}>{meal.source === 'camera' ? 'Camera' : 'Manual'}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Macros</Text>
        <View style={styles.macroGrid}>
          <View style={[styles.macroCard, styles.macroCardAccent]}>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroAmount}>{Math.round(meal.protein)} g</Text>
          </View>
          <View style={[styles.macroCard, styles.macroCardAccent]}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroAmount}>{Math.round(meal.carbs)} g</Text>
          </View>
          <View style={[styles.macroCard, styles.macroCardAccent]}>
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={styles.macroAmount}>{Math.round(meal.fat)} g</Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Meal information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Meal type</Text>
            <Text style={styles.detailValue}>{meal.mealType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Logged at</Text>
            <Text style={styles.detailValue}>{timestamp}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Calories</Text>
            <Text style={styles.detailValue}>{Math.round(meal.calories)} kcal</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Serving</Text>
            <Text style={styles.detailValue}>{meal.grams} g</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 40,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backLinkText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '700',
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: 8,
    letterSpacing: 1,
  },
  mealTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 13,
    color: '#6b7280',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    marginBottom: 12,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  macroCard: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  macroCardAccent: {
    backgroundColor: '#F9FAFB',
  },
  macroLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  macroAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailKey: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#22c55e',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
  },
});
