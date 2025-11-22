import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Dashboard() {
  return (
    <View style={styles.container}>

      {/* Header */}
      <Text style={styles.mainTitle}>Main Dashboard</Text>
      <Text style={styles.subTitle}>SehatGuru</Text>
      <Ionicons name="notifications-outline" size={24} style={styles.bell} />

      {/* Calories Card */}
      <View style={styles.calorieCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Calories</Text>
          <Text style={styles.cardValue}>1500 / 2200 kcal</Text>
        </View>

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressFill, { width: "68%" }]} />
        </View>
      </View>

      {/* Macro Boxes */}
      <View style={styles.macroRow}>
        <View style={styles.macroBox}>
          <Text style={styles.macroLabel}>Carbs</Text>
          <Text style={styles.macroValue}>180g</Text>
        </View>

        <View style={styles.macroBox}>
          <Text style={styles.macroLabel}>Protein</Text>
          <Text style={styles.macroValue}>120g</Text>
        </View>

        <View style={styles.macroBox}>
          <Text style={styles.macroLabel}>Fat</Text>
          <Text style={styles.macroValue}>50g</Text>
        </View>
      </View>

      {/* Progress & Analytics Button */}
      <TouchableOpacity style={styles.analyticsButton}>
        <Text style={styles.analyticsText}>View Progress & Analytics</Text>
      </TouchableOpacity>

      {/* Meal Sections */}
      {["Breakfast", "Lunch", "Dinner", "Snacks"].map((meal) => (
        <View key={meal} style={styles.mealCard}>
          <Text style={styles.mealText}>{meal}</Text>
          <TouchableOpacity style={styles.plusButton}>
            <Ionicons name="add" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      ))}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  /** HEADER **/
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#1E1E1E",
  },
  subTitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 10,
    color: "#777",
  },
  bell: {
    position: "absolute",
    right: 20,
    top: 65,
    color: "#333",
  },

  /** CALORIES **/
  calorieCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginTop: 25,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#444",
  },

  progressBarBackground: {
    width: "100%",
    height: 8,
    backgroundColor: "#d9d9d9",
    borderRadius: 6,
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 6,
  },

  /** MACROS **/
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },

  macroBox: {
    width: "30%",
    backgroundColor: "#fff",
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  macroLabel: {
    fontSize: 14,
    color: "#777",
    marginBottom: 6,
  },
  macroValue: {
    fontSize: 17,
    fontWeight: "700",
  },

  /** BUTTON **/
  analyticsButton: {
    marginTop: 22,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  analyticsText: {
    fontSize: 16,
    fontWeight: "600",
  },

  /** MEAL CARDS **/
  mealCard: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  mealText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  plusButton: {
    backgroundColor: "#F1F1F1",
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
