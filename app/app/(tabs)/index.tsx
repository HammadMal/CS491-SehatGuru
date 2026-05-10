
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fonts } from "../../constants/fonts";
import { useMealStore } from "../../store/useMealStore";
import { Meal, MealType } from "../../types/meal.types";
import React, { useEffect, useState, useMemo } from "react";
import { fetchMealsForUser, deleteMealFromFirestore } from "../../services/meals.firestore";
import { useAuth } from "../../hooks/useAuth";
import { ConfirmModal } from "../../components/ConfirmModal";

export default function Dashboard() {
  const meals = useMealStore((s) => s.meals);
  const setMeals = useMealStore((s) => s.setMeals);
  const deleteMeal = useMealStore((s) => s.deleteMeal);
  const hydrated = useMealStore((s) => s.hydrated);
  const clearMeals = useMealStore((s) => s.clearMeals);
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDeleteMeal, setPendingDeleteMeal] = useState<Meal | null>(null);

  useEffect(() => {
    if (!user?.id || hydrated) return;
    fetchMealsForUser(user.id).then(setMeals).catch(console.error);
  }, [user?.id, hydrated, setMeals]);

  useEffect(() => {
    if (!user) clearMeals();
  }, [user, clearMeals]);

  const isSameDay = (date1: Date, date2: Date) => {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return d1.getTime() === d2.getTime();
  };

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

  const dateOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      options.push(date);
    }
    return options;
  }, []);

  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => isSameDay(new Date(meal.createdAt), selectedDate));
  }, [meals, selectedDate]);

  const handleDeleteMeal = (meal: Meal) => {
    setPendingDeleteMeal(meal);
  };

  const confirmDeleteMeal = async () => {
    if (!pendingDeleteMeal) return;
    const meal = pendingDeleteMeal;
    setPendingDeleteMeal(null);
    try {
      await deleteMealFromFirestore(meal.id);
      deleteMeal(meal.id);
    } catch {
      // silently fail
    }
  };

  /* ===== TOTALS ===== */
  const calorieGoal = user?.daily_calorie_goal || 2000;
  const carbsGoal = user?.daily_carbs_goal || 250;
  const proteinGoal = user?.daily_protein_goal || 120;
  const fatGoal = user?.daily_fat_goal || 65;

  const eaten = Math.round(filteredMeals.reduce((sum, m) => sum + m.calories, 0));
  const remaining = Math.max(0, Math.round(calorieGoal - eaten));
  const calorieProgress = Math.min(1, eaten / calorieGoal);

  const carbs = Number(filteredMeals.reduce((sum, m) => sum + m.carbs, 0).toFixed(1));
  const protein = Number(filteredMeals.reduce((sum, m) => sum + m.protein, 0).toFixed(1));
  const fat = Number(filteredMeals.reduce((sum, m) => sum + m.fat, 0).toFixed(1));

  /* ===== GROUP BY MEAL TYPE ===== */
  const mealsByType = filteredMeals.reduce((acc, meal) => {
    if (!acc[meal.mealType]) acc[meal.mealType] = [];
    acc[meal.mealType].push(meal);
    return acc;
  }, {} as Record<MealType, Meal[]>);

  const MEAL_META: Record<string, { icon: any; color: string; bg: string }> = {
    Breakfast: { icon: "sunny-outline",      color: "#22c55e", bg: "#f0fdf4" },
    Lunch:     { icon: "restaurant-outline", color: "#22c55e", bg: "#f0fdf4" },
    Dinner:    { icon: "moon-outline",       color: "#22c55e", bg: "#f0fdf4" },
    Snack:     { icon: "cafe-outline",       color: "#22c55e", bg: "#f0fdf4" },
  };

  return (
    <LinearGradient
      colors={['#e8fdf2', '#F3F6FA', '#F3F6FA']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.35 }}
      style={styles.gradient}
    >
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greetingText}>
            {user?.fullName ? `Hi, ${user.fullName.split(" ")[0]} 👋` : "Dashboard"}
          </Text>
          <Text style={styles.subGreeting}>Track your nutrition</Text>
        </View>
        <TouchableOpacity
          style={styles.dateChip}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={15} color="#22c55e" />
          <Text style={styles.dateChipText}>{formatDateDisplay(selectedDate)}</Text>
          <Ionicons name="chevron-down" size={14} color="#666" />
        </TouchableOpacity>
      </View>

      {/* ── DATE PICKER MODAL ── */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
          <View style={styles.datePickerModal}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <ScrollView style={styles.dateList}>
              {dateOptions.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.dateOption, isSameDay(date, selectedDate) && styles.dateOptionSelected]}
                  onPress={() => { setSelectedDate(date); setShowDatePicker(false); }}
                >
                  <Text style={[styles.dateOptionText, isSameDay(date, selectedDate) && styles.dateOptionTextSelected]}>
                    {formatDateDisplay(date)}
                  </Text>
                  <Text style={[styles.dateOptionSubtext, isSameDay(date, selectedDate) && styles.dateOptionSubtextSelected]}>
                    {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── CALORIE SUMMARY CARD ── */}
      <TouchableOpacity
        style={styles.summaryCard}
        activeOpacity={0.85}
        onPress={() => router.push("/analytics")}
      >
        {/* Top label */}
        <Text style={styles.summaryCardLabel}>Calories Today</Text>

        {/* Calorie ring + stats side-by-side */}
        <View style={styles.summaryBody}>
          {/* Ring */}
          <View style={styles.ringWrapper}>
            <View style={styles.ringTrack} />
            <View style={styles.ringCenter}>
              <Text style={styles.ringNumber}>{remaining}</Text>
              <Text style={styles.ringLabel}>kcal left</Text>
            </View>
          </View>

          {/* Stats column */}
          <View style={styles.statsColumn}>
            <StatRow icon="restaurant" color="#3b82f6" label="Eaten" value={eaten} unit="kcal" />
            <StatRow icon="flame" color="#ef4444" label="Burned" value={0} unit="kcal" />
            <StatRow icon="flag" color="#22c55e" label="Goal" value={calorieGoal} unit="kcal" />
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.calProgressTrack}>
          <View style={[styles.calProgressFill, { width: `${Math.round(calorieProgress * 100)}%` }]} />
        </View>
        <View style={styles.calProgressLabels}>
          <Text style={styles.calProgressPct}>{Math.round(calorieProgress * 100)}% of daily goal</Text>
          <View style={styles.analyticsChip}>
            <Ionicons name="stats-chart-outline" size={12} color="#22c55e" />
            <Text style={styles.analyticsChipText}>Analytics</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── MACRO SECTION ── */}
      <Text style={styles.sectionHeading}>Macronutrients</Text>
      <View style={styles.macroGrid}>
        <MacroCard label="Carbs" value={carbs} goal={carbsGoal} color="#f59e0b" icon="leaf-outline" />
        <MacroCard label="Protein" value={protein} goal={proteinGoal} color="#3b82f6" icon="barbell-outline" />
        <MacroCard label="Fat" value={fat} goal={fatGoal} color="#8b5cf6" icon="water-outline" />
      </View>

      {/* ── MEAL SECTIONS ── */}
      <Text style={styles.sectionHeading}>Meals</Text>
      {(["Breakfast", "Lunch", "Dinner", "Snack"] as MealType[]).map((mealType) => {
        const meta = MEAL_META[mealType];
        const sectionMeals = mealsByType[mealType] || [];
        const sectionCalories = Math.round(sectionMeals.reduce((sum, m) => sum + m.calories, 0));

        return (
          <View key={mealType} style={styles.mealCard}>
            {/* Meal header */}
            <View style={styles.mealHeader}>
              <View style={[styles.mealIconBadge, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealTitle}>{mealType}</Text>
                {sectionCalories > 0 && (
                  <Text style={[styles.mealCalBadge, { color: meta.color }]}>
                    {sectionCalories} kcal
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: meta.color }]}
                onPress={() => router.push(`/(tabs)/camera?mealType=${mealType}`)}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Meal items */}
            {sectionMeals.length === 0 ? (
              <Text style={styles.emptyText}>No meals logged yet</Text>
            ) : (
              <View style={styles.mealItemsList}>
                {sectionMeals.map((meal) => (
                  <View key={meal.id} style={styles.mealItemRow}>
                    <View style={styles.mealItemDot} />
                    <Text style={styles.mealItemName} numberOfLines={1}>{meal.foodName}</Text>
                    <Text style={styles.mealItemCal}>{Math.round(meal.calories)} kcal</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteMeal(meal)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>

    <ConfirmModal
      visible={!!pendingDeleteMeal}
      title="Delete Meal"
      message={`Remove "${pendingDeleteMeal?.foodName}" from your log? This cannot be undone.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="danger"
      icon="trash-outline"
      onConfirm={confirmDeleteMeal}
      onCancel={() => setPendingDeleteMeal(null)}
    />
    </LinearGradient>
  );
}

/* ===== SUB-COMPONENTS ===== */

const StatRow = ({
  icon, color, label, value, unit,
}: {
  icon: any; color: string; label: string; value: number; unit: string;
}) => (
  <View style={styles.statRow}>
    <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={14} color={color} />
    </View>
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value} <Text style={styles.statUnit}>{unit}</Text></Text>
    </View>
  </View>
);

const MacroCard = ({
  label, value, goal, color, icon,
}: {
  label: string; value: number; goal: number; color: string; icon: any;
}) => {
  const pct = Math.min(1, goal > 0 ? value / goal : 0);
  const pctLabel = Math.round(pct * 100);
  return (
    <View style={styles.macroCard}>
      {/* Top row: icon + label */}
      <View style={styles.macroCardHeader}>
        <View style={[styles.macroIcon, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={styles.macroLabel}>{label}</Text>
      </View>

      {/* Amount */}
      <Text style={styles.macroValue}>{value}<Text style={styles.macroUnit}>g</Text></Text>
      <Text style={styles.macroGoal}>of {goal}g</Text>

      {/* Progress bar */}
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pctLabel}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.macroPct, { color }]}>{pctLabel}%</Text>
    </View>
  );
};

/* ===== STYLES ===== */
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 18, paddingTop: 54, paddingBottom: 40 },

  /* Header */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greetingText: { fontSize: 22, fontWeight: "800", fontFamily: Fonts.extrabold, color: "#111" },
  subGreeting: { fontSize: 13, fontFamily: Fonts.regular, color: "#888", marginTop: 2 },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8EDF2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateChipText: { fontSize: 13, fontWeight: "600", fontFamily: Fonts.semibold, color: "#333" },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", fontFamily: Fonts.bold, marginBottom: 15, color: "#111" },
  dateList: { maxHeight: 400 },
  dateOption: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  dateOptionSelected: { backgroundColor: "#22c55e" },
  dateOptionText: { fontSize: 16, fontWeight: "600", fontFamily: Fonts.semibold, color: "#111" },
  dateOptionTextSelected: { color: "#fff" },
  dateOptionSubtext: { fontSize: 13, fontFamily: Fonts.regular, color: "#666", marginTop: 3 },
  dateOptionSubtextSelected: { color: "#d1fae5" },

  /* Summary Card */
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#e8f5e9",
  },
  summaryCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: Fonts.bold,
    color: "#888",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },

  summaryBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },

  /* Ring */
  ringWrapper: {
    width: 110,
    height: 110,
    justifyContent: "center",
    alignItems: "center",
  },
  ringTrack: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 10,
    borderColor: "#dcfce7",
  },
  ringCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringNumber: { fontSize: 28, fontWeight: "900", fontFamily: Fonts.extrabold, color: "#111" },
  ringLabel: { fontSize: 11, fontFamily: Fonts.regular, color: "#888", marginTop: 2 },

  /* Stats */
  statsColumn: { flex: 1, gap: 10 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statLabel: { fontSize: 11, fontFamily: Fonts.regular, color: "#999" },
  statValue: { fontSize: 14, fontWeight: "700", fontFamily: Fonts.bold, color: "#111" },
  statUnit: { fontSize: 11, color: "#999", fontWeight: "400", fontFamily: Fonts.regular },

  /* Calorie progress bar */
  calProgressTrack: {
    height: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 8,
  },
  calProgressFill: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 99,
  },
  calProgressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calProgressPct: { fontSize: 12, fontFamily: Fonts.regular, color: "#888" },
  analyticsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  analyticsChipText: { fontSize: 11, color: "#22c55e", fontWeight: "700", fontFamily: Fonts.bold },

  /* Section heading */
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: Fonts.extrabold,
    color: "#111",
    marginBottom: 12,
  },

  /* Macro Grid */
  macroGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  macroCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  macroCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  macroIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  macroLabel: { fontSize: 12, fontWeight: "600", fontFamily: Fonts.semibold, color: "#555" },
  macroValue: { fontSize: 20, fontWeight: "900", fontFamily: Fonts.extrabold, color: "#111" },
  macroUnit: { fontSize: 12, fontWeight: "500", fontFamily: Fonts.medium, color: "#777" },
  macroGoal: { fontSize: 11, fontFamily: Fonts.regular, color: "#aaa", marginTop: 1, marginBottom: 8 },
  macroTrack: {
    height: 5,
    backgroundColor: "#F3F4F6",
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 4,
  },
  macroFill: {
    height: "100%",
    borderRadius: 99,
  },
  macroPct: { fontSize: 10, fontWeight: "700", fontFamily: Fonts.bold },

  /* Meal Cards */
  mealCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  mealIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mealTitle: { fontSize: 15, fontWeight: "700", fontFamily: Fonts.bold, color: "#111" },
  mealCalBadge: { fontSize: 12, fontWeight: "600", fontFamily: Fonts.semibold, marginTop: 1 },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "#bbb",
    fontStyle: "italic",
    paddingLeft: 4,
    marginBottom: 4,
  },

  mealItemsList: { gap: 6 },
  mealItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  mealItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  mealItemName: { flex: 1, fontSize: 13, color: "#333", fontWeight: "500", fontFamily: Fonts.medium },
  mealItemCal: { fontSize: 12, color: "#888", fontWeight: "600", fontFamily: Fonts.semibold },
  deleteBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
    marginLeft: 4,
  },
});
