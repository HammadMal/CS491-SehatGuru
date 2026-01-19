
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMealStore } from "../../store/useMealStore";
import { Meal, MealType } from "../../types/meal.types";
import React, { useEffect, useRef, useState, useMemo } from "react";

import { fetchMealsForUser, deleteMealFromFirestore } from "../../services/meals.firestore";
import { useAuth } from "../../hooks/useAuth";


export default function Dashboard() {
const meals = useMealStore((s) => s.meals);
const setMeals = useMealStore((s) => s.setMeals);
const deleteMeal = useMealStore((s) => s.deleteMeal);
const hydrated = useMealStore((s) => s.hydrated);
const clearMeals = useMealStore((s) => s.clearMeals);
const { user } = useAuth();

const [selectedDate, setSelectedDate] = useState(new Date());
const [showDatePicker, setShowDatePicker] = useState(false);

useEffect(() => {
  if (!user?.id || hydrated) return;

  fetchMealsForUser(user.id).then(setMeals).catch(console.error);
}, [user?.id, hydrated, setMeals]);

useEffect(() => {
  if (!user) clearMeals();
}, [user, clearMeals]);

  // Helper function to check if a date is the same day (using local timezone)
  const isSameDay = (date1: Date, date2: Date) => {
    // Normalize both dates to start of day in local timezone
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return d1.getTime() === d2.getTime();
  };

  // Helper function to format date for display
  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  // Generate date options for the past 7 days
  const dateOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      options.push(date);
    }
    return options;
  }, []);

  // Filter meals by selected date
  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => {
      const mealDate = new Date(meal.createdAt);
      return isSameDay(mealDate, selectedDate);
    });
  }, [meals, selectedDate]);

  const handleDeleteMeal = async (meal: Meal) => {
    Alert.alert(
      "Delete Meal",
      `Are you sure you want to delete "${meal.foodName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMealFromFirestore(meal.id);
              deleteMeal(meal.id);
            } catch (error) {
              console.error("Failed to delete meal:", error);
              Alert.alert("Error", "Failed to delete meal. Please try again.");
            }
          },
        },
      ]
    );
  };



  /* ===== TOTALS ===== */
 const calorieGoal = 2819;

  // Calories → whole numbers (using filtered meals)
  const eaten = Math.round(
    filteredMeals.reduce((sum, meal) => sum + meal.calories, 0)
  );

  const remaining = Math.max(0, Math.round(calorieGoal - eaten));

  // Macros → 1 decimal (using filtered meals)
  const carbs = Number(
    filteredMeals.reduce((sum, meal) => sum + meal.carbs, 0).toFixed(1)
  );

  const protein = Number(
    filteredMeals.reduce((sum, meal) => sum + meal.protein, 0).toFixed(1)
  );

  const fat = Number(
    filteredMeals.reduce((sum, meal) => sum + meal.fat, 0).toFixed(1)
  );

// // Progress for circle
// const progress = Math.min(1, eaten / calorieGoal);


  /* ===== GROUP BY MEAL TYPE ===== */
  const mealsByType = filteredMeals.reduce((acc, meal) => {
    if (!acc[meal.mealType]) acc[meal.mealType] = [];
    acc[meal.mealType].push(meal);
    return acc;
  }, {} as Record<MealType, Meal[]>);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* HEADER WITH DATE PICKER */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.todayText}>{formatDateDisplay(selectedDate)}</Text>
          <Ionicons name="chevron-down" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      {/* DATE PICKER MODAL */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModal}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <ScrollView style={styles.dateList}>
              {dateOptions.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateOption,
                    isSameDay(date, selectedDate) && styles.dateOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    setShowDatePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dateOptionText,
                      isSameDay(date, selectedDate) && styles.dateOptionTextSelected,
                    ]}
                  >
                    {formatDateDisplay(date)}
                  </Text>
                  <Text
                    style={[
                      styles.dateOptionSubtext,
                      isSameDay(date, selectedDate) && styles.dateOptionSubtextSelected,
                    ]}
                  >
                    {date.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* SUMMARY CARD */}
      <TouchableOpacity
        style={styles.summaryCard}
        activeOpacity={0.7}
        onPress={() => router.push("/analytics")}
      >
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

        {/* Tap to view analytics hint */}
        <View style={styles.analyticsHint}>
          <Ionicons name="stats-chart-outline" size={16} color="#22c55e" />
          <Text style={styles.analyticsHintText}>Tap for detailed analytics</Text>
        </View>
      </TouchableOpacity>

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
                  <View key={meal.id} style={styles.mealItemContainer}>
                    <Text style={styles.mealItem}>
                      {meal.foodName} · {Math.round(meal.calories)} calories
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteMeal(meal)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
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
              onPress={() => router.push(`/(tabs)/camera?mealType=${mealType}`)}
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
    <View style={styles.summaryIconContainer}>
      <Ionicons 
        name={label === "Eaten" ? "restaurant" : label === "Remaining" ? "time" : "flame"} 
        size={20} 
        color={label === "Eaten" ? "#3b82f6" : label === "Remaining" ? "#22c55e" : "#ef4444"} 
      />
    </View>
    <Text style={styles.summaryNumber}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const Macro = ({ label, value }: { label: string; value: string }) => {
  const colors: Record<string, string> = {
    Carbs: "#f59e0b",
    Protein: "#3b82f6",
    Fat: "#8b5cf6",
  };
  return (
    <View style={styles.macroItem}>
      <View style={[styles.macroColorBar, { backgroundColor: colors[label] || "#22c55e" }]} />
      <Text style={styles.macroTitle}>{label}</Text>
      <Text style={styles.macroSubtitle}>{value}</Text>
    </View>
  );
};

/* ===== STYLES ===== */
const CIRCLE_SIZE = 150;

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F7F9FA" },
  container: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 40 },

  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  todayText: { fontSize: 18, fontWeight: "700", color: "#111" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  datePickerModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "85%",
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    color: "#111",
  },

  dateList: {
    maxHeight: 400,
  },

  dateOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },

  dateOptionSelected: {
    backgroundColor: "#22c55e",
  },

  dateOptionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },

  dateOptionTextSelected: {
    color: "#fff",
  },

  dateOptionSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  dateOptionSubtextSelected: {
    color: "#f0fdf4",
  },

  summaryCard: {
    backgroundColor: "#fff",
    marginTop: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },

  circleContainer: { alignItems: "center", marginVertical: 16 },
  innerCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#F0FDF4",
    borderWidth: 10,
    borderColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },

  remainingText: { fontSize: 36, fontWeight: "800", color: "#111" },
  kcalLabel: { fontSize: 14, color: "#666", marginTop: 4 },

  summaryRow: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    marginTop: 8,
  },
  summaryBox: {
    width: "30%",
    backgroundColor: "#F9FAFB",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  summaryNumber: { fontSize: 18, fontWeight: "800", color: "#111" },
  summaryLabel: { fontSize: 12, color: "#666", marginTop: 4 },

  macroSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  macroItem: {
    width: "30%",
    backgroundColor: "#fff",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },

  macroColorBar: {
    width: "100%",
    height: 3,
    position: "absolute",
    top: 0,
  },

  macroTitle: { fontSize: 13, color: "#777", marginTop: 8 },
  macroSubtitle: { fontWeight: "700", fontSize: 16, color: "#111", marginTop: 4 },

  analyticsHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 6,
  },

  analyticsHintText: {
    fontSize: 13,
    color: "#22c55e",
    fontWeight: "600",
  },

  mealCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },

  mealText: { 
    fontSize: 17, 
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  emptyText: { 
    color: "#999", 
    marginTop: 6,
    fontSize: 14,
    fontStyle: "italic",
  },
  mealItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  mealItem: { 
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  deleteButton: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  sectionTotal: { 
    marginTop: 10,
    fontWeight: "700",
    color: "#22c55e",
    fontSize: 15,
  },

  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
