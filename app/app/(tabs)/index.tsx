import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function Dashboard() {
  const eaten = 0;
  const burned = 0;
  const calorieGoal = 2819;
  const remaining = calorieGoal - eaten;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* HEADER */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.todayText}>Today</Text>
        </View>

        {/* Removed Notification + AI icons */}
      </View>

      {/* SUMMARY CARD */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.detailsText}>Details</Text>
        </View>

        {/* CIRCLE */}
        <View style={styles.circleContainer}>
          <View style={styles.innerCircle}>
            <Text style={styles.remainingText}>{remaining}</Text>
            <Text style={styles.kcalLabel}>Remaining</Text>
          </View>
        </View>

        {/* SUMMARY ROW */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{eaten}</Text>
            <Text style={styles.summaryLabel}>Eaten</Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{remaining}</Text>
            <Text style={styles.summaryLabel}>Remaining</Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{burned}</Text>
            <Text style={styles.summaryLabel}>Burned</Text>
          </View>
        </View>

        {/* MACROS */}
        <View style={styles.macroSection}>
          <View style={styles.macroItem}>
            <Text style={styles.macroTitle}>Carbs</Text>
            <Text style={styles.macroSubtitle}>0 / 344 g</Text>
          </View>

          <View style={styles.macroItem}>
            <Text style={styles.macroTitle}>Protein</Text>
            <Text style={styles.macroSubtitle}>0 / 138 g</Text>
          </View>

          <View style={styles.macroItem}>
            <Text style={styles.macroTitle}>Fat</Text>
            <Text style={styles.macroSubtitle}>0 / 91 g</Text>
          </View>
        </View>
      </View>

      {/* MEAL CARDS */}
      {["Breakfast", "Lunch", "Dinner", "Snacks"].map((meal) => (
        <View key={meal} style={styles.mealCard}>
          <Text style={styles.mealText}>{meal}</Text>

          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => router.push("/camera")}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}

      {/* Extra padding */}
      <View style={{ height: 40 }} />

    </ScrollView>
  );
}

const CIRCLE_SIZE = 140;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#F7F9FA",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },

  /** HEADER **/
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  todayText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
  },

  /** SUMMARY CARD **/
  summaryCard: {
    backgroundColor: "#fff",
    marginTop: 25,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  detailsText: {
    fontSize: 14,
    color: "#22c55e",
    fontWeight: "600",
  },

  /** CIRCLE **/
  circleContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
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
  remainingText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111",
  },
  kcalLabel: {
    fontSize: 13,
    marginTop: 3,
    color: "#444",
  },

  /** SUMMARY BOXES **/
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  summaryBox: {
    width: "30%",
    backgroundColor: "#F9FAFB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 17,
    fontWeight: "700",
  },
  summaryLabel: {
    marginTop: 5,
    fontSize: 13,
    color: "#555",
  },

  /** MACROS **/
  macroSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroItem: {
    width: "30%",
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    alignItems: "center",
  },
  macroTitle: {
    fontSize: 13,
    color: "#777",
  },
  macroSubtitle: {
    marginTop: 4,
    fontWeight: "600",
    color: "#111",
  },

  /** MEAL CARDS **/
  mealCard: {
    marginTop: 18,
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  mealText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },

  /** GREEN + BUTTON **/
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
  },
});
