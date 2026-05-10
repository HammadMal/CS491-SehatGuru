import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMealStore } from "../store/useMealStore";
import { Meal, MealType } from "../types/meal.types";
import { useMemo } from "react";
import { Fonts } from '../constants/fonts';
import { useAuth } from "../hooks/useAuth";

const { width } = Dimensions.get("window");

/* ─────────────────────────────────────────────────────────────────
   Helper: get the start of the current ISO week (Monday)
───────────────────────────────────────────────────────────────── */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function Analytics() {
  const meals = useMealStore((s) => s.meals);
  const chartScrollRef = useRef<ScrollView>(null);
  const { user } = useAuth();

  const calorieGoal  = user?.daily_calorie_goal  || 2000;
  const proteinGoal  = user?.daily_protein_goal  || 120;
  const carbsGoal    = user?.daily_carbs_goal    || 250;
  const fatGoal      = user?.daily_fat_goal      || 65;

  /* ── last 30 days ── */
  const last30Days = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  }, []);

  const dailyData = useMemo(() => {
    return last30Days.map((date) => {
      const dayMeals = meals.filter((meal) =>
        isSameDay(new Date(meal.createdAt), date)
      );
      return {
        date,
        calories: dayMeals.reduce((s, m) => s + m.calories, 0),
        protein:  dayMeals.reduce((s, m) => s + m.protein,  0),
        carbs:    dayMeals.reduce((s, m) => s + m.carbs,    0),
        fat:      dayMeals.reduce((s, m) => s + m.fat,      0),
        mealCount: dayMeals.length,
      };
    });
  }, [meals, last30Days]);

  /* ── 30-day averages ── */
  const daysWithData = dailyData.filter((d) => d.mealCount > 0).length || 1;
  const totalMeals   = meals.length;
  const avgCalories  = Math.round(dailyData.reduce((s, d) => s + d.calories, 0) / daysWithData);
  const avgProtein   = (dailyData.reduce((s, d) => s + d.protein, 0) / daysWithData).toFixed(1);
  const avgCarbs     = (dailyData.reduce((s, d) => s + d.carbs,   0) / daysWithData).toFixed(1);
  const avgFat       = (dailyData.reduce((s, d) => s + d.fat,     0) / daysWithData).toFixed(1);

  /* ── meal type distribution ── */
  const mealTypeStats = useMemo(() => {
    const stats: Record<MealType, number> = { Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0 };
    meals.forEach((meal) => { stats[meal.mealType] += meal.calories; });
    return stats;
  }, [meals]);
  const totalCaloriesAllTime = Object.values(mealTypeStats).reduce((s, c) => s + c, 0);

  /* ── max for chart scaling ── */
  const maxCalories = Math.max(...dailyData.map((d) => d.calories), 2000);

  /* ════════════════════════════════════════════════════════════════
     FEATURE 1 — TIME-TO-GOAL
     Use the last 7 days that have any data to compute avg delta.
     7700 kcal ≈ 1 kg; assume 5 kg as a "standard goal horizon".
  ════════════════════════════════════════════════════════════════ */
  const timeToGoal = useMemo(() => {
    const last7 = dailyData.slice(-7).filter((d) => d.mealCount > 0);
    if (last7.length === 0) return null;

    const avgEaten = last7.reduce((s, d) => s + d.calories, 0) / last7.length;
    const dailyDelta = calorieGoal - avgEaten; // positive = deficit (losing), negative = surplus (gaining)

    // Derive health direction from goals stored in user (we use calorie delta as proxy)
    const isLosingWeight  = dailyDelta > 50;
    const isGainingWeight = dailyDelta < -50;

    if (!isLosingWeight && !isGainingWeight) {
      return { label: "On Track 🎯", sub: "You're maintaining your calorie balance.", color: "#22c55e", weeks: null };
    }

    const TARGET_KG    = 5; // standard horizon
    const kcalPerKg    = 7700;
    const totalKcal    = TARGET_KG * kcalPerKg;
    const absDelta     = Math.abs(dailyDelta);
    const weeksNeeded  = Math.round(totalKcal / (absDelta * 7));

    if (isLosingWeight) {
      return {
        label: `~${weeksNeeded} weeks to lose ${TARGET_KG} kg`,
        sub: `You're averaging ${Math.round(absDelta)} kcal/day under your goal.`,
        color: "#3b82f6",
        weeks: weeksNeeded,
        direction: "losing" as const,
      };
    } else {
      return {
        label: `~${weeksNeeded} weeks to gain ${TARGET_KG} kg`,
        sub: `You're averaging ${Math.round(absDelta)} kcal/day over your goal.`,
        color: "#f59e0b",
        weeks: weeksNeeded,
        direction: "gaining" as const,
      };
    }
  }, [dailyData, calorieGoal]);

  /* ════════════════════════════════════════════════════════════════
     FEATURE 2 — WEEKLY NUTRITION SUMMARIES
     "This week" = Mon → today
  ════════════════════════════════════════════════════════════════ */
  const weeklyHighlights = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    const today     = new Date();

    // Build one entry per calendar day this week
    const weekDays: { date: Date; calories: number; protein: number; carbs: number; fat: number; hasData: boolean }[] = [];
    const cursor = new Date(weekStart);
    while (cursor <= today) {
      const d   = new Date(cursor);
      const dayMeals = meals.filter((m) => isSameDay(new Date(m.createdAt), d));
      weekDays.push({
        date: d,
        calories: dayMeals.reduce((s, m) => s + m.calories, 0),
        protein:  dayMeals.reduce((s, m) => s + m.protein,  0),
        carbs:    dayMeals.reduce((s, m) => s + m.carbs,    0),
        fat:      dayMeals.reduce((s, m) => s + m.fat,      0),
        hasData:  dayMeals.length > 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const daysLogged         = weekDays.filter((d) => d.hasData).length;
    const proteinGoalDays    = weekDays.filter((d) => d.hasData && d.protein  >= proteinGoal).length;
    const calorieGoalDays    = weekDays.filter((d) => d.hasData && d.calories <= calorieGoal && d.calories >= calorieGoal * 0.75).length;
    const carbsGoalDays      = weekDays.filter((d) => d.hasData && d.carbs    <= carbsGoal).length;

    // Longest consecutive streak (across all meals, not just this week)
    let bestStreak = 0, currentStreak = 0;
    dailyData.forEach((d) => {
      if (d.mealCount > 0) { currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); }
      else { currentStreak = 0; }
    });

    return { daysLogged, proteinGoalDays, calorieGoalDays, carbsGoalDays, bestStreak, totalDaysInWeek: weekDays.length };
  }, [meals, proteinGoal, calorieGoal, carbsGoal, dailyData]);

  /* ─────────────────────────────────────────────────────────────── */

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ══════════════════════════════════════════════════════
            FEATURE 1 — TIME TO GOAL CARD
        ══════════════════════════════════════════════════════ */}
        {timeToGoal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time to Goal</Text>
            <View style={[styles.goalCard, { borderLeftColor: timeToGoal.color }]}>
              <View style={styles.goalCardLeft}>
                <View style={[styles.goalIconBadge, { backgroundColor: timeToGoal.color + "18" }]}>
                  <Ionicons
                    name={
                      timeToGoal.weeks === null
                        ? "checkmark-circle-outline"
                        : timeToGoal.direction === "losing"
                        ? "trending-down-outline"
                        : "trending-up-outline"
                    }
                    size={22}
                    color={timeToGoal.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalLabel, { color: timeToGoal.color }]}>{timeToGoal.label}</Text>
                  <Text style={styles.goalSub}>{timeToGoal.sub}</Text>
                </View>
              </View>

              {timeToGoal.weeks !== null && (
                <View style={styles.goalMeta}>
                  <Text style={styles.goalMetaRow}>
                    <Ionicons name="flame-outline" size={12} color="#ef4444" />
                    {"  "}Goal: {calorieGoal} kcal/day
                  </Text>
                  <Text style={styles.goalMetaRow}>
                    <Ionicons name="trending-down-outline" size={12} color="#3b82f6" />
                    {"  "}Avg 7 days: {Math.round(
                      (dailyData.slice(-7).filter((d) => d.mealCount > 0).reduce((s, d) => s + d.calories, 0)) /
                      Math.max(1, dailyData.slice(-7).filter((d) => d.mealCount > 0).length)
                    )} kcal/day
                  </Text>
                  <Text style={styles.goalNote}>Based on 5 kg goal @ 7700 kcal/kg</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            FEATURE 2 — WEEKLY HIGHLIGHTS
        ══════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week's Highlights</Text>
          <View style={styles.highlightsGrid}>

            <InsightCard
              emoji="🥩"
              value={weeklyHighlights.proteinGoalDays}
              total={weeklyHighlights.totalDaysInWeek}
              label="protein goal days"
              color="#3b82f6"
            />
            <InsightCard
              emoji="✅"
              value={weeklyHighlights.calorieGoalDays}
              total={weeklyHighlights.totalDaysInWeek}
              label="calorie goal days"
              color="#22c55e"
            />
            <InsightCard
              emoji="🌾"
              value={weeklyHighlights.carbsGoalDays}
              total={weeklyHighlights.totalDaysInWeek}
              label="carb goal days"
              color="#f59e0b"
            />
            <InsightCard
              emoji="🔥"
              value={weeklyHighlights.bestStreak}
              total={null}
              label="day best streak"
              color="#ef4444"
            />

          </View>

          {/* Summary sentence */}
          <View style={styles.summaryPill}>
            <Ionicons name="calendar-outline" size={14} color="#22c55e" />
            <Text style={styles.summaryPillText}>
              Logged {weeklyHighlights.daysLogged} of {weeklyHighlights.totalDaysInWeek} days this week
            </Text>
          </View>
        </View>

        {/* 30-Day Average */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>30-Day Average</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Avg Calories" value={avgCalories.toString()} icon="flame-outline"   color="#ef4444" />
            <StatCard label="Avg Protein"  value={`${avgProtein}g`}        icon="barbell-outline" color="#3b82f6" />
            <StatCard label="Avg Carbs"    value={`${avgCarbs}g`}          icon="leaf-outline"    color="#f59e0b" />
            <StatCard label="Avg Fat"      value={`${avgFat}g`}            icon="water-outline"   color="#8b5cf6" />
          </View>
        </View>

        {/* Daily Calorie Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Calories (Last 30 Days)</Text>
          <ScrollView
            ref={chartScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartContainer}
            onContentSizeChange={() => chartScrollRef.current?.scrollToEnd({ animated: false })}
          >
            {dailyData.map((day, index) => {
              const barHeight = (day.calories / maxCalories) * 150;
              const isGoalMet = day.calories > 0 && day.calories <= calorieGoal;
              return (
                <View key={index} style={styles.barContainer}>
                  <Text style={styles.barValue}>
                    {day.calories > 0 ? Math.round(day.calories) : ""}
                  </Text>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight || 4,
                          opacity: day.calories > 0 ? 1 : 0.2,
                          backgroundColor: isGoalMet ? "#22c55e" : day.calories > 0 ? "#ef4444" : "#d1d5db",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>
                    {day.date.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#22c55e" }]} />
              <Text style={styles.legendText}>Within goal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
              <Text style={styles.legendText}>Over goal</Text>
            </View>
          </View>
        </View>

        {/* Meal Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calories by Meal Type</Text>
          <View style={styles.pieContainer}>
            {(["Breakfast", "Lunch", "Dinner", "Snack"] as MealType[]).map((mealType) => {
              const calories    = mealTypeStats[mealType];
              const percentage  = totalCaloriesAllTime > 0
                ? ((calories / totalCaloriesAllTime) * 100).toFixed(1)
                : "0.0";
              const colors: Record<MealType, string> = {
                Breakfast: "#f59e0b",
                Lunch:     "#3b82f6",
                Dinner:    "#ef4444",
                Snack:     "#8b5cf6",
              };
              const pct = parseFloat(percentage);
              return (
                <View key={mealType} style={styles.pieRow}>
                  <View style={[styles.pieColor, { backgroundColor: colors[mealType] }]} />
                  <Text style={styles.pieLabel}>{mealType}</Text>
                  <View style={styles.pieBarTrack}>
                    <View style={[styles.pieBarFill, { width: `${pct}%`, backgroundColor: colors[mealType] }]} />
                  </View>
                  <Text style={styles.pieValue}>{percentage}%</Text>
                  <Text style={styles.pieCalories}>({Math.round(calories)})</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Total Meals */}
        <View style={styles.section}>
          <View style={styles.totalCard}>
            <Ionicons name="restaurant-outline" size={32} color="#22c55e" />
            <Text style={styles.totalNumber}>{totalMeals}</Text>
            <Text style={styles.totalLabel}>Total Meals Logged</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════ SUB-COMPONENTS */

const InsightCard = ({
  emoji, value, total, label, color,
}: {
  emoji: string; value: number; total: number | null; label: string; color: string;
}) => (
  <View style={[insightStyles.card, { borderColor: color + "30" }]}>
    <Text style={insightStyles.emoji}>{emoji}</Text>
    <View style={insightStyles.textBlock}>
      <Text style={[insightStyles.value, { color }]}>
        {value}
        {total !== null && <Text style={insightStyles.total}>/{total}</Text>}
      </Text>
      <Text style={insightStyles.label}>{label}</Text>
    </View>
  </View>
);

const insightStyles = StyleSheet.create({
  card: {
    width: (width - 52) / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emoji: { fontSize: 24 },
  textBlock: { flex: 1 },
  value: { fontSize: 22, fontWeight: "800", fontFamily: Fonts.extrabold },
  total: { fontSize: 14, fontWeight: "500", color: "#aaa", fontFamily: Fonts.medium },
  label: { fontSize: 11, color: "#888", fontFamily: Fonts.regular, marginTop: 2 },
});

const StatCard = ({
  label, value, icon, color,
}: {
  label: string; value: string; icon: any; color: string;
}) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/* ════════════════════════════════════════════════════════════ STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FA" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton:  { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111", fontFamily: Fonts.bold },

  scroll:  { flex: 1 },
  section: { marginTop: 20, paddingHorizontal: 20 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 15,
    fontFamily: Fonts.bold,
  },

  /* ── Time-to-goal card ── */
  goalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    gap: 14,
  },
  goalCardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  goalIconBadge: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  goalLabel: { fontSize: 15, fontWeight: "800", fontFamily: Fonts.extrabold },
  goalSub:   { fontSize: 12, color: "#888", fontFamily: Fonts.regular, marginTop: 3 },
  goalMeta:  { gap: 4, paddingLeft: 4 },
  goalMetaRow: { fontSize: 12, color: "#666", fontFamily: Fonts.regular },
  goalNote:    { fontSize: 11, color: "#bbb", fontFamily: Fonts.regular, marginTop: 4 },

  /* ── Weekly highlights ── */
  highlightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  summaryPillText: { fontSize: 13, color: "#16a34a", fontWeight: "600", fontFamily: Fonts.semibold },

  /* ── 30-day stat cards ── */
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: "700", color: "#111", marginTop: 8, fontFamily: Fonts.bold },
  statLabel: { fontSize: 13, color: "#666", marginTop: 4, fontFamily: Fonts.regular },

  /* ── Calorie chart ── */
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  barContainer: { width: 36, alignItems: "center" },
  barValue:  { fontSize: 8, fontWeight: "600", color: "#111", marginBottom: 4, height: 14, fontFamily: Fonts.semibold },
  barWrapper: { height: 150, justifyContent: "flex-end", alignItems: "center" },
  bar:  { width: 20, borderRadius: 4 },
  barLabel: { fontSize: 8, color: "#666", marginTop: 8, fontFamily: Fonts.regular },
  chartLegend: { flexDirection: "row", gap: 16, marginTop: 10, paddingLeft: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: "#666", fontFamily: Fonts.regular },

  /* ── Meal type distribution ── */
  pieContainer: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  pieRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  pieColor:   { width: 12, height: 12, borderRadius: 3 },
  pieLabel:   { width: 70, fontSize: 13, fontWeight: "600", color: "#111", fontFamily: Fonts.semibold },
  pieBarTrack: { flex: 1, height: 6, backgroundColor: "#F3F4F6", borderRadius: 99, overflow: "hidden" },
  pieBarFill:  { height: "100%", borderRadius: 99 },
  pieValue:   { fontSize: 13, fontWeight: "700", color: "#111", fontFamily: Fonts.bold, width: 40, textAlign: "right" },
  pieCalories: { fontSize: 11, color: "#888", fontFamily: Fonts.regular, width: 48, textAlign: "right" },

  /* ── Total card ── */
  totalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  totalNumber: { fontSize: 48, fontWeight: "800", color: "#111", marginTop: 10, fontFamily: Fonts.extrabold },
  totalLabel:  { fontSize: 16, color: "#666", marginTop: 8, fontFamily: Fonts.regular },
});
