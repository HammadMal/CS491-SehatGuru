import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";

import { Fonts } from "../../constants/fonts";
import { AuthContext } from "../../context/AuthContext";
import { useMealPlanStore } from "../../store/useMealPlanStore";
import { useMealStore } from "../../store/useMealStore";
import { syncMealGamification } from "../../services/gamification.sync";
import { fetchTodaysMealPlan, markMealPlanItemLogged, deleteMealPlanFromFirestore } from "../../services/mealPlans.firestore";
import { saveMealToFirestore } from "../../services/meals.firestore";
import AddMealModal from "../../components/AddMealModal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Colors } from "../../constants/colors";
import type { MealPlanItem, Meal, MealType } from "../../types/meal.types";

const MEAL_TYPE_ORDER: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

const MEAL_TYPE_ICONS: Record<MealType, string> = {
  Breakfast: "sunny-outline",
  Lunch: "partly-sunny-outline",
  Dinner: "moon-outline",
  Snack: "leaf-outline",
};

interface MealPlanGroup {
  planId: string;
  planNumber: number;
  createdAt: string;
  items: MealPlanItem[];
  totalCalories: number;
}

export default function MealPlansScreen() {
  const authContext = useContext(AuthContext);
  const { planItems, setPlanItems, markLogged, removePlan } = useMealPlanStore();
  const addMeal = useMealStore((s) => s.addMeal);

  const [loading, setLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MealPlanItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<MealPlanGroup | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string; variant: 'info' | 'danger' } | null>(null);

  useEffect(() => {
    const userId = authContext?.user?.id;
    if (!userId) { setLoading(false); return; }

    fetchTodaysMealPlan(userId)
      .then((items) => {
        setPlanItems(items);
        // Auto-expand the latest plan
        if (items.length > 0) {
          const latest = items.reduce((a, b) =>
            a.createdAt > b.createdAt ? a : b
          );
          setExpandedPlanId(latest.planId);
        }
      })
      .finally(() => setLoading(false));
  }, [authContext?.user?.id]);

  // Group items by planId, sorted oldest first (so Plan 1 = oldest)
  const planGroups: MealPlanGroup[] = useMemo(() => {
    const map = new Map<string, MealPlanItem[]>();
    for (const item of planItems) {
      // Skip items missing planId (saved before this field was added)
      if (!item.planId) continue;
      const existing = map.get(item.planId) ?? [];
      map.set(item.planId, [...existing, item]);
    }
    return Array.from(map.entries())
      .map(([planId, items]) => ({
        planId,
        items,
        createdAt: items[0].createdAt,
        totalCalories: Math.round(items.reduce((sum, i) => sum + i.calories, 0)),
        planNumber: 0,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((g, idx) => ({ ...g, planNumber: idx + 1 }));
  }, [planItems]);

  const handleAddToLog = (item: MealPlanItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleModalDone = async (data: {
    foodName: string;
    grams: number;
    mealType: string;
    nutrients: { calories: number; protein: number; carbs: number; fat: number };
  }) => {
    if (!authContext?.user?.id || !selectedItem) return;
    setLoggingId(selectedItem.id);
    setModalVisible(false);

    const meal: Meal = {
      id: Crypto.randomUUID(),
      userId: authContext.user.id,
      foodName: data.foodName,
      mealType: data.mealType as MealType,
      grams: data.grams,
      calories: data.nutrients.calories,
      protein: data.nutrients.protein,
      carbs: data.nutrients.carbs,
      fat: data.nutrients.fat,
      source: "chatbot",
      createdAt: new Date().toISOString(),
    };

    try {
      await saveMealToFirestore(meal);
      addMeal(meal);
      await syncMealGamification(authContext.user.id).catch(console.error);
      await markMealPlanItemLogged(selectedItem.id);
      markLogged(selectedItem.id);
    } catch {
      setInfoModal({ title: 'Log Failed', message: 'Failed to log meal. Please try again.', variant: 'danger' });
    } finally {
      setLoggingId(null);
      setSelectedItem(null);
    }
  };

  const handleDeletePlan = (group: MealPlanGroup) => {
    setPendingDeleteGroup(group);
  };

  const confirmDeletePlan = async () => {
    if (!pendingDeleteGroup) return;
    const group = pendingDeleteGroup;
    setPendingDeleteGroup(null);
    try {
      await deleteMealPlanFromFirestore(group.planId, authContext!.user!.id);
      removePlan(group.planId);
      if (expandedPlanId === group.planId) setExpandedPlanId(null);
    } catch {
      // silently fail — list will still show until next refresh
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Meal Plans</Text>
        <Text style={styles.subtitle}>Today's suggestions from SehatGuru</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : planGroups.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={56} color={Colors.disabled} />
          <Text style={styles.emptyTitle}>No meal plans for today</Text>
          <Text style={styles.emptySubtitle}>
            Ask SehatGuru to generate a meal plan, then tap Approve.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {planGroups.map((group) => {
            const isExpanded = expandedPlanId === group.planId;
            const loggedCount = group.items.filter((i) => i.logged).length;
            const allLogged = loggedCount === group.items.length;

            return (
              <View key={group.planId} style={styles.planCard}>
                {/* Plan header — tap to expand/collapse */}
                <TouchableOpacity
                  style={styles.planHeader}
                  onPress={() =>
                    setExpandedPlanId(isExpanded ? null : group.planId)
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.planHeaderLeft}>
                    <View style={[styles.planBadge, allLogged && styles.planBadgeDone]}>
                      <Text style={styles.planBadgeText}>
                        {allLogged ? "✓" : group.planNumber}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.planTitle}>Meal Plan {group.planNumber}</Text>
                      <Text style={styles.planMeta}>
                        {group.totalCalories} kcal · {loggedCount}/{group.items.length} logged
                      </Text>
                    </View>
                  </View>
                  <View style={styles.planHeaderRight}>
                    <TouchableOpacity
                      onPress={() => handleDeletePlan(group)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#9ca3af"
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded content */}
                {isExpanded && (
                  <View style={styles.planBody}>
                    {MEAL_TYPE_ORDER.map((mealType) => {
                      const slotItems = group.items.filter(
                        (i) => i.mealType === mealType
                      );
                      if (slotItems.length === 0) return null;

                      return (
                        <View key={mealType} style={styles.slotSection}>
                          <View style={styles.slotHeader}>
                            <Ionicons
                              name={MEAL_TYPE_ICONS[mealType] as any}
                              size={15}
                              color={Colors.primary}
                            />
                            <Text style={styles.slotTitle}>{mealType}</Text>
                          </View>

                          {slotItems.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                              <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.foodName}</Text>
                                <Text style={styles.itemMacros}>
                                  {item.calories} cal · {item.protein}g P · {item.carbs}g C · {item.fat}g F
                                </Text>
                              </View>

                              {item.logged ? (
                                <View style={styles.loggedBadge}>
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={18}
                                    color={Colors.primary}
                                  />
                                  <Text style={styles.loggedText}>Logged</Text>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={styles.logBtn}
                                  onPress={() => handleAddToLog(item)}
                                  disabled={loggingId === item.id}
                                >
                                  {loggingId === item.id ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <Text style={styles.logBtnText}>Log</Text>
                                  )}
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <AddMealModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setSelectedItem(null); }}
        onRetake={() => {}}
        onManual={() => {}}
        onDone={handleModalDone}
        foodName={selectedItem?.foodName ?? ""}
        nutrients={{
          calories: selectedItem?.calories ?? 0,
          protein: selectedItem?.protein ?? 0,
          carbs: selectedItem?.carbs ?? 0,
          fat: selectedItem?.fat ?? 0,
        }}
        defaultMealType={selectedItem?.mealType ?? "Dinner"}
        isManual
      />

      <ConfirmModal
        visible={!!pendingDeleteGroup}
        title="Remove Meal Plan"
        message={`Remove Meal Plan ${pendingDeleteGroup?.planNumber}? All ${pendingDeleteGroup?.items.length} items will be deleted. This cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        icon="calendar-outline"
        onConfirm={confirmDeletePlan}
        onCancel={() => setPendingDeleteGroup(null)}
      />

      {/* Log meal success / error feedback */}
      <ConfirmModal
        visible={!!infoModal}
        title={infoModal?.title ?? ''}
        message={infoModal?.message ?? ''}
        variant={infoModal?.variant ?? 'info'}
        confirmLabel="OK"
        cancelLabel={null}
        icon={infoModal?.variant === 'danger' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        onConfirm={() => setInfoModal(null)}
        onCancel={() => setInfoModal(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#f8fafc",
  },
  title: { fontSize: 22, fontWeight: "700", fontFamily: Fonts.bold, color: "#1f2937" },
  subtitle: { fontSize: 13, fontFamily: Fonts.regular, color: "#6b7280", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: {
    fontSize: 18, fontWeight: "600", fontFamily: Fonts.semibold, color: "#1f2937",
    marginTop: 16, textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14, fontFamily: Fonts.regular, color: "#6b7280", marginTop: 8,
    textAlign: "center", lineHeight: 20,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },

  // Plan card
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  planHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  planHeaderRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  planBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  planBadgeDone: { backgroundColor: "#86efac" },
  planBadgeText: { color: "#fff", fontWeight: "700", fontFamily: Fonts.bold, fontSize: 15 },
  planTitle: { fontSize: 16, fontWeight: "700", fontFamily: Fonts.bold, color: "#1f2937" },
  planMeta: { fontSize: 12, fontFamily: Fonts.regular, color: "#6b7280", marginTop: 2 },

  // Expanded body
  planBody: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },

  // Meal type slot
  slotSection: { paddingTop: 12, gap: 8 },
  slotHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  slotTitle: { fontSize: 13, fontWeight: "700", fontFamily: Fonts.bold, color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 },

  // Item row
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 14, fontWeight: "600", fontFamily: Fonts.semibold, color: "#1f2937" },
  itemMacros: { fontSize: 12, fontFamily: Fonts.regular, color: "#6b7280", marginTop: 2 },
  logBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    minWidth: 56,
    alignItems: "center",
  },
  logBtnText: { color: "#fff", fontSize: 13, fontWeight: "600", fontFamily: Fonts.semibold },
  loggedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  loggedText: { fontSize: 13, color: Colors.primary, fontWeight: "600", fontFamily: Fonts.semibold },
});
