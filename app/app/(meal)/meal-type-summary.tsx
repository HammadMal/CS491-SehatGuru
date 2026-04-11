import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMealStore } from '../../store/useMealStore';
import { deleteMealFromFirestore } from '../../services/meals.firestore';
import type { MealType } from '../../types/meal.types';

const MEAL_META: Record<string, { icon: any; color: string; bg: string }> = {
  Breakfast: { icon: 'sunny-outline', color: '#f59e0b', bg: '#fffbeb' },
  Lunch: { icon: 'restaurant-outline', color: '#22c55e', bg: '#f0fdf4' },
  Dinner: { icon: 'moon-outline', color: '#6366f1', bg: '#eef2ff' },
  Snack: { icon: 'cafe-outline', color: '#ec4899', bg: '#fdf2f8' },
};

export default function MealTypeSummaryScreen() {
  const { mealType } = useLocalSearchParams<{ mealType?: string }>();
  const router = useRouter();
  const meals = useMealStore((state) => state.meals);
  const deleteMeal = useMealStore((s) => s.deleteMeal);

  const typedMealType = (mealType as MealType) || 'Lunch';
  const meta = MEAL_META[typedMealType];

  const typeMeals = useMemo(() => {
    return meals.filter((m) => m.mealType === typedMealType);
  }, [meals, typedMealType]);

  const totals = useMemo(() => {
    return {
      calories: Math.round(typeMeals.reduce((sum, m) => sum + m.calories, 0)),
      protein: Math.round(typeMeals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10,
      carbs: Math.round(typeMeals.reduce((sum, m) => sum + m.carbs, 0) * 10) / 10,
      fat: Math.round(typeMeals.reduce((sum, m) => sum + m.fat, 0) * 10) / 10,
    };
  }, [typeMeals]);

  const handleDeleteMeal = async (mealId: string, foodName: string) => {
    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete "${foodName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMealFromFirestore(mealId);
              deleteMeal(mealId);
            } catch {
              Alert.alert('Error', 'Failed to delete meal. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#333" />
          <Text style={styles.backLinkText}>Back to dashboard</Text>
        </TouchableOpacity>

        <View style={[styles.headerCard, { backgroundColor: meta.bg, borderLeftColor: meta.color, borderLeftWidth: 6 }]}>
          <View style={styles.headerContent}>
            <View style={[styles.headerIcon, { backgroundColor: meta.color }]}>
              <Ionicons name={meta.icon} size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.mealTypeLabel}>{typedMealType}</Text>
              <Text style={[styles.mealTypeDesc, { color: meta.color }]}>
                {typeMeals.length} item{typeMeals.length !== 1 ? 's' : ''} logged
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Calories</Text>
            <Text style={[styles.statValue, { color: meta.color }]}>{totals.calories}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Protein</Text>
            <Text style={[styles.statValue, { color: '#3b82f6' }]}>{totals.protein}g</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Carbs</Text>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{totals.carbs}g</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Fat</Text>
            <Text style={[styles.statValue, { color: '#8b5cf6' }]}>{totals.fat}g</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Items</Text>
        {typeMeals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkbox-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No meals logged for {typedMealType.toLowerCase()}</Text>
            <TouchableOpacity
              style={[styles.addMealButton, { backgroundColor: meta.color }]}
              onPress={() =>
                router.push({
                  pathname: '/camera',
                  params: { mealType: typedMealType },
                })
              }
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addMealButtonText}>Add a meal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {typeMeals.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                style={styles.itemCard}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: '/meal-detail',
                    params: { mealId: meal.id, mealType: typedMealType },
                  })
                }
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.itemDot, { backgroundColor: meta.color }]} />
                  <View>
                    <Text style={styles.itemName}>{meal.foodName}</Text>
                    <Text style={styles.itemWeight}>{meal.grams}g</Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.itemCalories, { color: meta.color }]}>{Math.round(meal.calories)} kcal</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteMeal(meal.id, meal.foodName)}
                    style={styles.deleteButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
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
    paddingTop: 20,
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
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  mealTypeDesc: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    marginBottom: 16,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addMealButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  itemWeight: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemCalories: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 6,
  },
});
