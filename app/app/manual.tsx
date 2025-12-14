import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Stack } from "expo-router";
import { useMealStore } from "../store/useMealStore";
import { useAuth } from "../hooks/useAuth";
import * as Crypto from "expo-crypto";
import { saveMealToFirestore } from "../services/meals.firestore";
import apiClient from "../services/api";
import AddMealModal from "../components/AddMealModal";
import { SafeAreaView } from "react-native-safe-area-context";


export default function ManualMealScreen() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const { addMeal } = useMealStore();
  const { user } = useAuth();


  // Fetch CSV data from backend
  useEffect(() => {
  async function fetchNutrients() {
    try {
      const response = await apiClient.get("/api/nutrients");

      const parseNumber = (val: any) => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
        };

        const normalized = response.data.map((row: any) => ({
        food_name: row.food_name || "",
        calories: parseNumber(row.energy_kcal),
        carbs: parseNumber(row.carb_g),
        protein: parseNumber(row.protein_g),
        fat: parseNumber(row.fat_g),
        }));


      setData(normalized);
    } catch (err) {
      console.error("Failed to load nutrients:", err);
    }
  }

  fetchNutrients();
}, []);


  useEffect(() => {
    if (!search.trim()) {
      setFiltered([]);
      return;
    }

    const q = search.toLowerCase();
    const results = data.filter((item) =>
      item.food_name.toLowerCase().includes(q)
    );

    setFiltered(results);
  }, [search, data]);


  const handleDone = async (mealData: any) => {
  if (!user) return;

  const meal = {
    id: Crypto.randomUUID(),
    userId: user.id,
    foodName: mealData.foodName,
    mealType: mealData.mealType,
    grams: mealData.grams,
    calories: Number(mealData.nutrients?.calories ?? 0),
    protein: Number(mealData.nutrients?.protein ?? 0),
    carbs: Number(mealData.nutrients?.carbs ?? 0),
    fat: Number(mealData.nutrients?.fat ?? 0),
    source: "manual" as const,
    createdAt: new Date().toISOString(),
  };

  await saveMealToFirestore(meal); //  persistence
  addMeal(meal);                  //  instant UI

  setSelectedFood(null);
};


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 🔥 This goes INSIDE the component */}
      <Stack.Screen 
  options={{ 
    headerShown: false,
  }} 
/>


      <Text style={styles.header}>Log Meal Manually</Text>

      <TextInput
        style={styles.searchBox}
        placeholder="Search for food..."
        value={search}
        onChangeText={setSearch}
      />

      {search && filtered.length === 0 && (
        <Text style={styles.noResults}>No matching foods found.</Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.foodItem}
            onPress={() => setSelectedFood(item)}
          >
            <Text style={styles.foodName}>{item.food_name}</Text>
            <Text style={styles.foodCalories}>
              {item.calories} Cal • Protein {item.protein}g • Carbs {item.carbs}g
            </Text>
          </TouchableOpacity>
        )}
      />


      <AddMealModal
      key={selectedFood?.food_name ?? "manual"}   // ✅ IMPORTANT
      visible={!!selectedFood}
      onClose={() => setSelectedFood(null)}
      onDone={handleDone}
      foodName={selectedFood?.food_name}
      nutrients={{
        calories: selectedFood?.calories,
        protein: selectedFood?.protein,
        carbs: selectedFood?.carbs,
        fat: selectedFood?.fat,
      }}
      image={null}
      isManual={true}
    />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", padding: 20 },
  header: { fontSize: 24, fontWeight: "700", marginBottom: 15, textAlign: "center" },
  searchBox: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 15,
  },
   safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingTop: 30,
    paddingHorizontal: 20,
  },

//   header: {
//     fontSize: 24,
//     fontWeight: "700",
//     marginBottom: 15,
//     textAlign: "center",
//   },
  foodItem: {
    backgroundColor: "white",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
  },
  foodName: { fontSize: 18, fontWeight: "600" },
  foodCalories: { fontSize: 14, color: "#555", marginTop: 4 },
  noResults: { textAlign: "center", color: "#777", marginTop: 10, fontSize: 16 },
});
