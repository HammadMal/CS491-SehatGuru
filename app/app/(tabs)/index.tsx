
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMealStore } from "../../store/useMealStore";
import { Meal, MealType } from "../../types/meal.types";
import React, { useEffect, useRef, useState } from "react";

import { fetchMealsForUser } from "../../services/meals.firestore";
import { useAuth } from "../../hooks/useAuth";


export default function Dashboard() {
const meals = useMealStore((s) => s.meals);
const setMeals = useMealStore((s) => s.setMeals);
const hydrated = useMealStore((s) => s.hydrated);
const clearMeals = useMealStore((s) => s.clearMeals);
const { user } = useAuth();

useEffect(() => {
  if (!user?.id || hydrated) return;

  fetchMealsForUser(user.id).then(setMeals).catch(console.error);
}, [user?.id, hydrated, setMeals]);

useEffect(() => {
  if (!user) clearMeals();
}, [user, clearMeals]);



  /* ===== TOTALS ===== */
 const calorieGoal = 2819;

  // Calories → whole numbers
  const eaten = Math.round(
    meals.reduce((sum, meal) => sum + meal.calories, 0)
  );

  const remaining = Math.max(0, Math.round(calorieGoal - eaten));

  // Macros → 1 decimal
  const carbs = Number(
    meals.reduce((sum, meal) => sum + meal.carbs, 0).toFixed(1)
  );

  const protein = Number(
    meals.reduce((sum, meal) => sum + meal.protein, 0).toFixed(1)
  );

  const fat = Number(
    meals.reduce((sum, meal) => sum + meal.fat, 0).toFixed(1)
  );

// // Progress for circle
// const progress = Math.min(1, eaten / calorieGoal);


  /* ===== GROUP BY MEAL TYPE ===== */
  const mealsByType = meals.reduce((acc, meal) => {
    if (!acc[meal.mealType]) acc[meal.mealType] = [];
    acc[meal.mealType].push(meal);
    return acc;
  }, {} as Record<MealType, Meal[]>);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* HEADER */}
      <Text style={styles.todayText}>Today</Text>

      {/* SUMMARY CARD */}
      <View style={styles.summaryCard}>
        <View style={styles.circleContainer}>
          <View style={styles.innerCircle}>
            <Text style={styles.remainingText}>{remaining}</Text>
            <Text style={styles.kcalLabel}>Remaining</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryBox label="Eaten" value={eaten} />
          <SummaryBox label="Remaining" value={remaining} />
          <SummaryBox label="Burned" value={0} />
        </View>

        <View style={styles.macroSection}>
          <Macro label="Carbs" value={`${carbs} g`} />
          <Macro label="Protein" value={`${protein} g`} />
          <Macro label="Fat" value={`${fat} g`} />
        </View>
      </View>

      {/* MEAL SECTIONS */}
      {(["Breakfast", "Lunch", "Dinner", "Snack"] as MealType[]).map((mealType) => {
        const sectionMeals = mealsByType[mealType] || [];
        const sectionCalories = Math.round(
          sectionMeals.reduce((sum, meal) => sum + meal.calories, 0)
        );


        return (
          <View key={mealType} style={styles.mealCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mealText}>{mealType}</Text>

              {sectionMeals.length === 0 ? (
                <Text style={styles.emptyText}>No meals logged</Text>
              ) : (
                sectionMeals.map((meal) => (
                  <Text key={meal.id} style={styles.mealItem}>
                    {meal.foodName} · {Math.round(meal.calories)} calories
                  </Text>
                ))
              )}

              {sectionCalories > 0 && (
                <Text style={styles.sectionTotal}>
                  Total: {sectionCalories} calories
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.plusButton}
              onPress={() => router.push("/camera")}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ===== SMALL COMPONENTS ===== */
const SummaryBox = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.summaryBox}>
    <Text style={styles.summaryNumber}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const Macro = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.macroItem}>
    <Text style={styles.macroTitle}>{label}</Text>
    <Text style={styles.macroSubtitle}>{value}</Text>
  </View>
);

/* ===== STYLES ===== */
const CIRCLE_SIZE = 140;

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F7F9FA" },
  container: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 40 },

  todayText: { fontSize: 26, fontWeight: "700", color: "#111" },

  summaryCard: {
    backgroundColor: "#fff",
    marginTop: 25,
    borderRadius: 20,
    padding: 18,
  },

  circleContainer: { alignItems: "center", marginVertical: 12 },
  innerCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#F0FDF4",
    borderWidth: 8,
    borderColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
  },

  remainingText: { fontSize: 32, fontWeight: "800" },
  kcalLabel: { fontSize: 13, color: "#444" },

  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryBox: {
    width: "30%",
    backgroundColor: "#F9FAFB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  summaryNumber: { fontSize: 17, fontWeight: "700" },
  summaryLabel: { fontSize: 13, color: "#555" },

  macroSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  macroItem: {
    width: "30%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 8,
  },

  macroTitle: { fontSize: 13, color: "#777" },
  macroSubtitle: { fontWeight: "600" },

  mealCard: {
    marginTop: 18,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  mealText: { fontSize: 16, fontWeight: "600" },
  emptyText: { color: "#777", marginTop: 4 },
  mealItem: { marginTop: 4 },
  sectionTotal: { marginTop: 6, fontWeight: "600" },

  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
  },
});
