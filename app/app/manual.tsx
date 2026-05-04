import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMealStore } from '../store/useMealStore';
import { useAuth } from '../hooks/useAuth';
import * as Crypto from 'expo-crypto';
import { saveMealToFirestore } from '../services/meals.firestore';
import { updateStreakAndXP } from '../services/gamification.firestore';
import { useGamificationStore } from '../store/useGamificationStore';
import apiClient from '../services/api';
import AddMealModal from '../components/AddMealModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCustomDishes, type CustomDish } from '../services/custom-dish.api';
import { Fonts } from '../constants/fonts';

const MEAL_META: Record<string, { icon: any; color: string; bg: string }> = {
  Breakfast: { icon: 'sunny-outline', color: '#f59e0b', bg: '#fffbeb' },
  Lunch: { icon: 'restaurant-outline', color: '#22c55e', bg: '#f0fdf4' },
  Dinner: { icon: 'moon-outline', color: '#6366f1', bg: '#eef2ff' },
  Snack: { icon: 'cafe-outline', color: '#ec4899', bg: '#fdf2f8' },
};

export default function ManualMealScreen() {
  const { mealType: urlMealType } = useLocalSearchParams<{ mealType?: string }>();
  const [search, setSearch] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [customDishes, setCustomDishes] = useState<CustomDish[]>([]);
  const { addMeal } = useMealStore();
  const { user } = useAuth();
  const setGamificationData = useGamificationStore((s) => s.setData);

  const currentMealType = urlMealType || 'Dinner';
  const meta = MEAL_META[currentMealType] || MEAL_META.Dinner;

  useEffect(() => {
    async function fetchNutrients() {
      try {
        const response = await apiClient.get('/api/nutrients');
        const parseNumber = (val: any) => {
          const num = Number(val);
          return isNaN(num) ? 0 : num;
        };
        const normalized = response.data.map((row: any) => ({
          food_name: row.food_name || '',
          calories: parseNumber(row.energy_kcal),
          carbs: parseNumber(row.carb_g),
          protein: parseNumber(row.protein_g),
          fat: parseNumber(row.fat_g),
        }));
        setData(normalized);
      } catch (err) {
        console.error('Failed to load nutrients:', err);
      } finally {
        setLoadingData(false);
      }
    }

    async function fetchCustomDishes() {
      try {
        const dishes = await getCustomDishes();
        setCustomDishes(dishes);
      } catch {
        // silent – not critical
      }
    }

    fetchNutrients();
    fetchCustomDishes();
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered([]); return; }
    const q = search.toLowerCase();
    setFiltered(data.filter((item) => item.food_name.toLowerCase().includes(q)));
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
      source: 'manual' as const,
      createdAt: new Date().toISOString(),
    };
    await saveMealToFirestore(meal);
    addMeal(meal);
    updateStreakAndXP(user.id).then(setGamificationData).catch(console.error);
    setSelectedFood(null);
    setTimeout(() => router.push('/(tabs)/' as any), 150);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Search Foods</Text>
          <Text style={styles.subheading}>Tap a food to log it</Text>
        </View>
        {/* Meal type pill */}
        <View style={[styles.mealPill, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={12} color={meta.color} />
          <Text style={[styles.mealPillText, { color: meta.color }]}>{currentMealType}</Text>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color="#aaa" style={{ marginLeft: 14 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="e.g. grilled chicken, rice..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 10 }}>
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Loading state ── */}
      {loadingData && (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.centerStateText}>Loading food database…</Text>
        </View>
      )}

      {/* ── Empty search ── */}
      {!loadingData && !search && (
        <View style={styles.centerState}>
          <Ionicons name="nutrition-outline" size={52} color="#D1FAE5" />
          <Text style={styles.centerStateTitle}>Search for a food</Text>
          <Text style={styles.centerStateText}>Type above to find nutritional info</Text>
        </View>
      )}

      {/* ── No results ── */}
      {!loadingData && search && filtered.length === 0 && (
        <View style={styles.centerState}>
          <Ionicons name="search-outline" size={44} color="#E5E7EB" />
          <Text style={styles.centerStateTitle}>No results</Text>
          <Text style={styles.centerStateText}>Try a different name, or build your own dish</Text>
          <TouchableOpacity
            style={styles.customDishBtn}
            onPress={() =>
              router.push({ pathname: '/custom-dish' as any, params: { mealType: currentMealType } })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.customDishBtnText}>Build Custom Dish</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── My Custom Dishes ── */}
      {!search && customDishes.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={[styles.centerStateTitle, { fontSize: 14, marginBottom: 10, color: '#374151' }]}>
            My Custom Dishes
          </Text>
          {customDishes.map((dish) => (
            <TouchableOpacity
              key={dish.id}
              style={styles.foodItem}
              onPress={() => setSelectedFood({
                food_name: dish.food_name,
                calories: dish.energy_kcal,
                carbs: dish.carb_g,
                protein: dish.protein_g,
                fat: dish.fat_g,
              })}
              activeOpacity={0.8}
            >
              <View style={styles.foodLeft}>
                <Text style={styles.foodName} numberOfLines={1}>{dish.food_name}</Text>
                <View style={styles.macroRow}>
                  <MacroBadge label="C" value={dish.carb_g ?? 0} color="#f59e0b" />
                  <MacroBadge label="P" value={dish.protein_g ?? 0} color="#3b82f6" />
                  <MacroBadge label="F" value={dish.fat_g ?? 0} color="#8b5cf6" />
                </View>
              </View>
              <View style={styles.calBadge}>
                <Text style={styles.calValue}>{Math.round(dish.energy_kcal ?? 0)}</Text>
                <Text style={styles.calUnit}>kcal</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Results list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.foodItem}
            onPress={() => setSelectedFood(item)}
            activeOpacity={0.8}
          >
            <View style={styles.foodLeft}>
              <Text style={styles.foodName} numberOfLines={1}>{item.food_name}</Text>
              <View style={styles.macroRow}>
                <MacroBadge label="C" value={item.carbs} color="#f59e0b" />
                <MacroBadge label="P" value={item.protein} color="#3b82f6" />
                <MacroBadge label="F" value={item.fat} color="#8b5cf6" />
              </View>
            </View>
            <View style={styles.calBadge}>
              <Text style={styles.calValue}>{Math.round(item.calories)}</Text>
              <Text style={styles.calUnit}>kcal</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <AddMealModal
        key={selectedFood?.food_name ?? 'manual'}
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
        defaultMealType={currentMealType}
      />
    </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const MacroBadge = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={[styles.macroBadge, { backgroundColor: color + '18' }]}>
    <Text style={[styles.macroBadgeText, { color }]}>{label} {Math.round(value)}g</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6FA' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  heading: { fontSize: 18, fontWeight: '800', color: '#111', fontFamily: Fonts.extrabold },
  subheading: { fontSize: 12, color: '#888', marginTop: 2, fontFamily: Fonts.regular },

  mealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  mealPillText: { fontSize: 11, fontWeight: '700', fontFamily: Fonts.bold },

  /* Search */
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111',
    fontFamily: Fonts.regular,
  },

  /* Center states */
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 80,
  },
  centerStateTitle: { fontSize: 18, fontWeight: '700', color: '#374151', fontFamily: Fonts.bold },
  centerStateText: { fontSize: 14, color: '#9ca3af', fontFamily: Fonts.regular },

  /* Food item */
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  foodLeft: { flex: 1, gap: 6 },
  foodName: { fontSize: 14, fontWeight: '600', color: '#111', fontFamily: Fonts.semibold },

  macroRow: { flexDirection: 'row', gap: 6 },
  macroBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  macroBadgeText: { fontSize: 11, fontWeight: '600', fontFamily: Fonts.semibold },

  calBadge: { alignItems: 'center', minWidth: 48 },
  calValue: { fontSize: 18, fontWeight: '900', color: '#111', fontFamily: Fonts.extrabold },
  calUnit: { fontSize: 10, color: '#999', fontWeight: '500', fontFamily: Fonts.medium },

  /* Custom dish button */
  customDishBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 8,
    backgroundColor: '#22c55e',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  customDishBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const, fontFamily: Fonts.bold },
});
