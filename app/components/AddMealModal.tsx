import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from '../constants/fonts';

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];

/* ─── Portion presets ─────────────────────────────── */
const PORTION_TYPES: { key: string; label: string; baseGrams: number; icon: any }[] = [
  { key: "bowl",  label: "Bowl",  baseGrams: 300, icon: "restaurant-outline" },
  { key: "cup",   label: "Cup",   baseGrams: 200, icon: "cafe-outline"       },
  { key: "plate", label: "Plate", baseGrams: 400, icon: "pizza-outline"      },
];

export default function AddMealModal({
  visible,
  onClose,
  onRetake,
  onManual,
  onDone,
  foodName,
  nutrients,
  image,
  loading = false,
  isManual = false,
  defaultMealType = "Dinner",
}: any) {

  const safeNutrients = nutrients || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  /* ── portion state ── */
  const [grams,           setGrams]           = useState(100);
  const [selectedPortion, setSelectedPortion] = useState<string | null>(null);
  const [portionCount,    setPortionCount]    = useState(1);
  const [customGramText,  setCustomGramText]  = useState("100");
  const [isCustom,        setIsCustom]        = useState(true);

  /* ── scaled nutrients ── */
  const scaleFactor = grams / 100;
  const scaledNutrients = {
    calories: Number((safeNutrients.calories * scaleFactor).toFixed(1)),
    protein:  Number((safeNutrients.protein  * scaleFactor).toFixed(1)),
    carbs:    Number((safeNutrients.carbs    * scaleFactor).toFixed(1)),
    fat:      Number((safeNutrients.fat      * scaleFactor).toFixed(1)),
  };

  /* ── other state ── */
  const [mealType,     setMealType]     = useState(defaultMealType);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (visible) {
      setGrams(100);
      setCustomGramText("100");
      setSelectedPortion(null);
      setPortionCount(1);
      setIsCustom(true);
      setMealType(defaultMealType);
      setShowDropdown(false);
    }
  }, [visible, defaultMealType]);

  /* ── handlers ── */
  const handlePortionTap = (portionKey: string) => {
    const base = PORTION_TYPES.find((p) => p.key === portionKey)!.baseGrams;
    const newG = Math.round(base * portionCount);
    setSelectedPortion(portionKey);
    setGrams(newG);
    setCustomGramText(String(newG));
    setIsCustom(false);
  };

  const handleCountChange = (delta: number) => {
    const newCount = Math.max(1, portionCount + delta);
    setPortionCount(newCount);
    if (selectedPortion) {
      const base = PORTION_TYPES.find((p) => p.key === selectedPortion)!.baseGrams;
      const newG = Math.round(base * newCount);
      setGrams(newG);
      setCustomGramText(String(newG));
      setIsCustom(false);
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomGramText(text);
    const n = Number(text);
    if (!isNaN(n) && n > 0) setGrams(n);
    setSelectedPortion(null);
    setIsCustom(true);
  };

  /* ── portion label ── */
  const portionLabel = (() => {
    if (!isCustom && selectedPortion) {
      const p = PORTION_TYPES.find((x) => x.key === selectedPortion)!;
      return `${portionCount} × ${p.label}  ·  ${grams}g`;
    }
    return `${grams}g  (custom)`;
  })();

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>

            {/* ── CLOSE BUTTON ── */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#444" />
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >

              {/* ── LOADING ── */}
              {loading ? (
                <View style={styles.centeredState}>
                  <Ionicons name="scan-outline" size={42} color="#22c55e" />
                  <Text style={styles.stateTitle}>Analyzing food</Text>
                  <Text style={styles.stateSubtitle}>Identifying dish and nutrients…</Text>
                </View>

              ) : !foodName ? (
                /* ── ERROR / UNKNOWN ── */
                <View style={styles.centeredState}>
                  {image && <Image source={{ uri: image }} style={styles.foodImage} />}
                  <Ionicons name="alert-circle-outline" size={42} color="#dc2626" />
                  <Text style={styles.stateTitle}>Couldn't identify food</Text>
                  <Text style={styles.stateSubtitle}>
                    This doesn't look like a supported Pakistani dish.{'\n'}
                    Please try again with a clearer photo.
                  </Text>
                  <TouchableOpacity style={styles.actionBtn} onPress={onRetake}>
                    <Ionicons name="camera-outline" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Retake Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={onManual}>
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Add Manually</Text>
                  </TouchableOpacity>
                </View>

              ) : (
                /* ── FOOD IDENTIFIED ── */
                <Pressable onPress={() => setShowDropdown(false)}>

                  {/* Food photo */}
                  {!isManual && image && (
                    <Image source={{ uri: image }} style={styles.foodImage} />
                  )}

                  {/* Meal type dropdown */}
                  <View style={styles.mealTypeContainer}>
                    <TouchableOpacity
                      style={styles.mealTypeButton}
                      onPress={() => setShowDropdown(!showDropdown)}
                    >
                      <Text style={styles.mealTypeText}>{mealType}</Text>
                      <Ionicons name="chevron-down" size={16} color="#444" />
                    </TouchableOpacity>
                    {showDropdown && (
                      <View style={styles.dropdown}>
                        {MEAL_TYPES.map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={styles.dropdownItem}
                            onPress={() => { setMealType(type); setShowDropdown(false); }}
                          >
                            <Text style={styles.dropdownItemText}>{type}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Food name */}
                  <View style={styles.foodNameRow}>
                    <Text style={styles.foodName} numberOfLines={2}>{foodName}</Text>
                  </View>

                  {/* ══════════════ PORTION PICKER ══════════════ */}
                  <View style={styles.portionSection}>
                    <Text style={styles.portionSectionLabel}>PORTION SIZE</Text>

                    {/* Type buttons */}
                    <View style={styles.portionTypeRow}>
                      {PORTION_TYPES.map((pt) => {
                        const active = selectedPortion === pt.key && !isCustom;
                        return (
                          <TouchableOpacity
                            key={pt.key}
                            style={[styles.portionTypeBtn, active && styles.portionTypeBtnActive]}
                            onPress={() => handlePortionTap(pt.key)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name={pt.icon} size={15} color={active ? "#fff" : "#666"} />
                            <Text style={[styles.portionTypeLbl, active && styles.portionTypeLblActive]}>
                              {pt.label}
                            </Text>
                            <Text style={[styles.portionTypeGrams, active && styles.portionTypeGramsActive]}>
                              {pt.baseGrams}g
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Quantity stepper */}
                    <View style={styles.stepperRow}>
                      <Text style={styles.stepperLabel}>Quantity</Text>
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={[styles.stepperBtn, portionCount <= 1 && styles.stepperBtnDisabled]}
                          onPress={() => handleCountChange(-1)}
                          disabled={portionCount <= 1}
                        >
                          <Ionicons name="remove" size={18} color={portionCount <= 1 ? "#ccc" : "#22c55e"} />
                        </TouchableOpacity>
                        <Text style={styles.stepperCount}>{portionCount}</Text>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => handleCountChange(1)}
                        >
                          <Ionicons name="add" size={18} color="#22c55e" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Active portion summary */}
                    <View style={styles.portionLabelRow}>
                      <Ionicons name="scale-outline" size={12} color="#22c55e" />
                      <Text style={styles.portionLabelText}>{portionLabel}</Text>
                    </View>

                    {/* Direct gram input */}
                    <View style={styles.gramInputRow}>
                      <Text style={styles.gramInputLabel}>Or enter grams:</Text>
                      <TextInput
                        style={[styles.gramInput, isCustom && styles.gramInputActive]}
                        value={customGramText}
                        keyboardType="numeric"
                        selectTextOnFocus
                        onChangeText={handleCustomChange}
                        onFocus={() => {
                          setSelectedPortion(null);
                          setIsCustom(true);
                        }}
                      />
                      <Text style={styles.gramUnit}>g</Text>
                    </View>
                  </View>
                  {/* ════════════════════════════════════════════ */}

                  {/* Calories */}
                  <View style={styles.calorieRow}>
                    <Ionicons name="flame-outline" size={20} color="#ef4444" />
                    <Text style={styles.calorieNumber}>{scaledNutrients.calories}</Text>
                    <Text style={styles.calorieUnit}>kcal</Text>
                  </View>

                  {/* Macros */}
                  <View style={styles.macrosRow}>
                    <MacroChip label="Protein" value={`${scaledNutrients.protein}g`} />
                    <MacroChip label="Carbs"   value={`${scaledNutrients.carbs}g`} />
                    <MacroChip label="Fat"     value={`${scaledNutrients.fat}g`} />
                  </View>

                  {/* Buttons */}
                  <View style={styles.btnStack}>
                    {!isManual && (
                      <TouchableOpacity style={styles.secondaryBtn} onPress={onRetake}>
                        <Ionicons name="camera-outline" size={17} color="#fff" />
                        <Text style={styles.secondaryBtnText}>Retake Photo</Text>
                      </TouchableOpacity>
                    )}
                    {!isManual && (
                      <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => { onClose(); setTimeout(() => { onManual?.(); }, 150); }}
                      >
                        <Ionicons name="create-outline" size={17} color="#fff" />
                        <Text style={styles.secondaryBtnText}>Add Manually</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.doneBtn}
                      onPress={() =>
                        onDone
                          ? onDone({ foodName, grams, mealType, nutrients: scaledNutrients })
                          : onClose()
                      }
                    >
                      <Text style={styles.doneBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>

                </Pressable>
              )}

            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── MacroChip (plain grey) ── */
const MacroChip = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.macroChip}>
    <Text style={styles.macroLabel}>{label}</Text>
    <Text style={styles.macroValue}>{value}</Text>
  </View>
);

/* ════════════════════════════════════════════════════════ STYLES */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingTop: 10,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 32,   // space for close button
    paddingBottom: 36,
  },

  closeBtn: {
    position: "absolute",
    top: 14, right: 18,
    zIndex: 9999,
    backgroundColor: "#f1f5f9",
    borderRadius: 18,
    width: 34, height: 34,
    alignItems: "center", justifyContent: "center",
  },

  /* ── States ── */
  centeredState: { alignItems: "center", paddingVertical: 30, gap: 10 },
  stateTitle:    { fontSize: 18, fontWeight: "700", color: "#1f2937", fontFamily: Fonts.bold, textAlign: "center" },
  stateSubtitle: { fontSize: 14, color: "#6b7280", fontFamily: Fonts.regular, textAlign: "center", lineHeight: 20 },

  foodImage: { width: "100%", height: 180, borderRadius: 16, marginBottom: 16 },

  /* ── Meal type ── */
  mealTypeContainer: { marginBottom: 10, position: "relative", zIndex: 100 },
  mealTypeButton: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#eef4f7", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, alignSelf: "flex-start",
  },
  mealTypeText:     { fontSize: 14, color: "#444", marginRight: 6, fontFamily: Fonts.regular },
  dropdown: {
    position: "absolute", top: 34, left: 0, width: 150, zIndex: 1000,
    backgroundColor: "#fff", borderRadius: 10, elevation: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  dropdownItem:     { paddingVertical: 11, paddingHorizontal: 14 },
  dropdownItemText: { fontSize: 14, color: "#333", fontFamily: Fonts.regular },

  /* ── Food name ── */
  foodNameRow:  { marginBottom: 16 },
  foodName:     { fontSize: 20, fontWeight: "700", color: "#111", fontFamily: Fonts.bold },

  /* ── Portion picker ── */
  portionSection: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8EDF2",
  },
  portionSectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#9ca3af",
    fontFamily: Fonts.bold, letterSpacing: 0.8,
    marginBottom: 12,
  },

  portionTypeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  portionTypeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  portionTypeBtnActive: { borderColor: "#22c55e", backgroundColor: "#22c55e" },
  portionTypeLbl:       { fontSize: 12, fontWeight: "700", color: "#555", fontFamily: Fonts.bold, marginTop: 4 },
  portionTypeLblActive: { color: "#fff" },
  portionTypeGrams:     { fontSize: 10, color: "#aaa", fontFamily: Fonts.regular, marginTop: 2 },
  portionTypeGramsActive: { color: "#d1fae5" },

  stepperRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  stepperLabel: { fontSize: 13, fontWeight: "600", color: "#555", fontFamily: Fonts.semibold },
  stepper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 10,
    borderWidth: 1.5, borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  stepperBtn:         { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperCount: {
    minWidth: 34, textAlign: "center",
    fontSize: 16, fontWeight: "800", color: "#111", fontFamily: Fonts.extrabold,
  },

  portionLabelRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, alignSelf: "flex-start",
    borderWidth: 1, borderColor: "#bbf7d0",
    marginBottom: 12,
  },
  portionLabelText: { fontSize: 12, color: "#16a34a", fontWeight: "600", fontFamily: Fonts.semibold, marginLeft: 5 },

  gramInputRow:  { flexDirection: "row", alignItems: "center" },
  gramInputLabel: { fontSize: 13, fontWeight: "600", color: "#555", fontFamily: Fonts.semibold, marginRight: 10 },
  gramInput: {
    backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, width: 80, fontSize: 15, fontWeight: "600",
    textAlign: "center", fontFamily: Fonts.semibold,
    borderWidth: 1.5, borderColor: "#E5E7EB",
  },
  gramInputActive: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  gramUnit: { fontSize: 13, color: "#888", fontFamily: Fonts.regular, marginLeft: 6 },

  /* ── Calories ── */
  calorieRow: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 12,
  },
  calorieNumber: {
    fontSize: 36, fontWeight: "800", color: "#111",
    fontFamily: Fonts.extrabold, marginLeft: 8, marginRight: 4,
  },
  calorieUnit: { fontSize: 15, fontWeight: "500", color: "#888", fontFamily: Fonts.medium, marginTop: 6 },

  /* ── Macros ── */
  macrosRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  macroChip: {
    width: "31%",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  macroLabel: { fontSize: 13, color: "#666", fontFamily: Fonts.regular },
  macroValue: { fontSize: 15, fontWeight: "600", color: "#111", fontFamily: Fonts.semibold, marginTop: 2 },

  /* ── Buttons ── */
  btnStack: { gap: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#22c55e", paddingVertical: 13, borderRadius: 12, gap: 6,
  },
  actionBtnSecondary: { backgroundColor: "#6b7280" },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600", fontFamily: Fonts.semibold },

  secondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#22c55e", paddingVertical: 13, borderRadius: 12, gap: 6,
  },
  secondaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600", fontFamily: Fonts.semibold },

  doneBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", fontFamily: Fonts.bold },
});
