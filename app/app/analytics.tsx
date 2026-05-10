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

const { width } = Dimensions.get("window");

export default function Analytics() {
  const meals = useMealStore((s) => s.meals);
  const chartScrollRef = useRef<ScrollView>(null);

  // Get last 30 days of data
  const last30Days = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  }, []);

  const isSameDay = (date1: Date, date2: Date) => {
    // Normalize both dates to start of day in local timezone
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return d1.getTime() === d2.getTime();
  };

  // Calculate daily totals for the last 30 days
  const dailyData = useMemo(() => {
    return last30Days.map((date) => {
      const dayMeals = meals.filter((meal) => {
        const mealDate = new Date(meal.createdAt);
        return isSameDay(mealDate, date);
      });

      return {
        date,
        calories: dayMeals.reduce((sum, meal) => sum + meal.calories, 0),
        protein: dayMeals.reduce((sum, meal) => sum + meal.protein, 0),
        carbs: dayMeals.reduce((sum, meal) => sum + meal.carbs, 0),
        fat: dayMeals.reduce((sum, meal) => sum + meal.fat, 0),
        mealCount: dayMeals.length,
      };
    });
  }, [meals, last30Days]);

  // Overall statistics
  const totalMeals = meals.length;
  const daysWithData = dailyData.filter((d) => d.mealCount > 0).length || 1;
  const avgCalories = Math.round(
    dailyData.reduce((sum, day) => sum + day.calories, 0) / daysWithData
  );
  const avgProtein = (
    dailyData.reduce((sum, day) => sum + day.protein, 0) / daysWithData
  ).toFixed(1);
  const avgCarbs = (
    dailyData.reduce((sum, day) => sum + day.carbs, 0) / daysWithData
  ).toFixed(1);
  const avgFat = (
    dailyData.reduce((sum, day) => sum + day.fat, 0) / daysWithData
  ).toFixed(1);

  // Meal type distribution
  const mealTypeStats = useMemo(() => {
    const stats: Record<MealType, number> = {
      Breakfast: 0,
      Lunch: 0,
      Dinner: 0,
      Snack: 0,
    };

    meals.forEach((meal) => {
      stats[meal.mealType] += meal.calories;
    });

    return stats;
  }, [meals]);

  const totalCaloriesAllTime = Object.values(mealTypeStats).reduce(
    (sum, cal) => sum + cal,
    0
  );

  // Max calories for chart scaling
  const maxCalories = Math.max(...dailyData.map((d) => d.calories), 2000);

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
        {/* Weekly Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>30-Day Average</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="Avg Calories"
              value={avgCalories.toString()}
              icon="flame-outline"
              color="#ef4444"
            />
            <StatCard
              label="Avg Protein"
              value={`${avgProtein}g`}
              icon="barbell-outline"
              color="#3b82f6"
            />
            <StatCard
              label="Avg Carbs"
              value={`${avgCarbs}g`}
              icon="leaf-outline"
              color="#f59e0b"
            />
            <StatCard
              label="Avg Fat"
              value={`${avgFat}g`}
              icon="water-outline"
              color="#8b5cf6"
            />
          </View>
        </View>

        {/* Calorie Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Calories (Last 30 Days)</Text>
          <ScrollView
            ref={chartScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartContainer}
            onContentSizeChange={() =>
              chartScrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            {dailyData.map((day, index) => {
              const barHeight = (day.calories / maxCalories) * 150;
              return (
                <View key={index} style={styles.barContainer}>
                  <Text style={styles.barValue}>
                    {day.calories > 0 ? Math.round(day.calories) : ""}
                  </Text>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        { height: barHeight || 4, opacity: day.calories > 0 ? 1 : 0.2 },
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
        </View>

        {/* Meal Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calories by Meal Type</Text>
          <View style={styles.pieContainer}>
            {(["Breakfast", "Lunch", "Dinner", "Snack"] as MealType[]).map(
              (mealType) => {
                const calories = mealTypeStats[mealType];
                const percentage =
                  totalCaloriesAllTime > 0
                    ? ((calories / totalCaloriesAllTime) * 100).toFixed(1)
                    : "0.0";

                const colors: Record<MealType, string> = {
                  Breakfast: "#f59e0b",
                  Lunch: "#3b82f6",
                  Dinner: "#ef4444",
                  Snack: "#8b5cf6",
                };

                return (
                  <View key={mealType} style={styles.pieRow}>
                    <View
                      style={[styles.pieColor, { backgroundColor: colors[mealType] }]}
                    />
                    <Text style={styles.pieLabel}>{mealType}</Text>
                    <Text style={styles.pieValue}>{percentage}%</Text>
                    <Text style={styles.pieCalories}>
                      ({Math.round(calories)} cal)
                    </Text>
                  </View>
                );
              }
            )}
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

const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
}) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FA",
  },

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

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },

  scroll: {
    flex: 1,
  },

  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 15,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  statCard: {
    width: (width - 52) / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },

  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginTop: 8,
  },

  statLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },

  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },

  barContainer: {
    width: 36,
    alignItems: "center",
  },

  barValue: {
    fontSize: 8,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
    height: 12,
  },

  barWrapper: {
    height: 150,
    justifyContent: "flex-end",
    alignItems: "center",
  },

  bar: {
    width: 20,
    backgroundColor: "#22c55e",
    borderRadius: 4,
  },

  barLabel: {
    fontSize: 8,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
  },

  pieContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  pieRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  pieColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 12,
  },

  pieLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  pieValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginRight: 8,
  },

  pieCalories: {
    fontSize: 13,
    color: "#666",
  },

  totalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
  },

  totalNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: "#111",
    marginTop: 10,
  },

  totalLabel: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
});
