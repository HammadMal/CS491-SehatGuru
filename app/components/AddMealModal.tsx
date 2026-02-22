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

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];

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

  // SAFE NUTRIENTS IF NO DATA
  const safeNutrients = nutrients || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  // 🔥 USER ENTERED QUANTITY (DEFAULT 100g)
  const [grams, setGrams] = useState(100);

  // 🔥 SCALE NUTRIENTS BASED ON GRAMS
  const scaleFactor = grams / 100;

  const scaledNutrients = {
  calories: Number((safeNutrients.calories * scaleFactor).toFixed(1)),
  protein: Number((safeNutrients.protein * scaleFactor).toFixed(1)),
  carbs: Number((safeNutrients.carbs * scaleFactor).toFixed(1)),
  fat: Number((safeNutrients.fat * scaleFactor).toFixed(1)),
};


  // OTHER UI STATE
  const [mealType, setMealType] = useState(defaultMealType);
  const [showDropdown, setShowDropdown] = useState(false);
  useEffect(() => {
      if (visible) {
        setGrams(100);
        setMealType(defaultMealType);
        setShowDropdown(false);
      }
  }, [visible, defaultMealType]);

  return (
  <Modal visible={visible} transparent animationType="slide">
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={styles.overlay}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sheet}>

            {/* CLOSE BUTTON */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={26} color="#444" />
            </TouchableOpacity>

        {/* 🔄 LOADING STATE */}
        {loading ? (
            /* ================= LOADING ================= */
            <View style={styles.loadingContainer}>
              <Ionicons name="scan-outline" size={42} color="#22c55e" />
              <Text style={styles.loadingTitle}>Analyzing food</Text>
              <Text style={styles.loadingSubtitle}>
                Identifying dish and nutrients…
              </Text>
            </View>

          ) : !foodName ? (
            /* ================= UNKNOWN OBJECT / ERROR ================= */
            <View style={styles.errorState}>
              {image && (
                <Image source={{ uri: image }} style={styles.foodImage} />
              )}
              <Ionicons name="alert-circle-outline" size={42} color="#dc2626" />
              <Text style={styles.errorTitle}>Couldn't identify food</Text>
              <Text style={styles.errorSubtitle}>
                This doesn't look like a supported Pakistani dish.{'\n'}Please try again with a clearer photo.
              </Text>

              <View style={styles.btnColumn}>
                <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
                  <Ionicons name="camera-outline" size={18} color="white" />
                  <Text style={styles.retakeText}>Retake Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.manualBtn} onPress={onManual}>
                  <Ionicons name="create-outline" size={18} color="white" />
                  <Text style={styles.manualText}>Add Manually</Text>
                </TouchableOpacity>
              </View>
            </View>

          ) : foodName ? (
          <Pressable onPress={() => setShowDropdown(false)}>
            {/* FOOD IMAGE */}
            {!isManual && image && (
              <Image source={{ uri: image }} style={styles.foodImage} />
            )}

            {/* MEAL TYPE */}
            <View style={styles.mealTypeContainer}>
              <TouchableOpacity
                style={styles.mealTypeButton}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={styles.mealTypeText}>{mealType}</Text>
                <Ionicons name="chevron-down" size={18} color="#444" />
              </TouchableOpacity>

              {showDropdown && (
                <View style={styles.dropdown}>
                  {MEAL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setMealType(type);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* FOOD NAME */}
            <View style={styles.foodNameRow}>
              <Text style={styles.foodName}>{foodName}</Text>
              <Ionicons name="create-outline" size={18} color="#444" />
            </View>

            {/* GRAMS */}
            <View style={styles.gramsRow}>
              <Text style={styles.gramsLabel}>Quantity (g):</Text>
              <TextInput
                style={styles.gramsInput}
                value={String(grams)}
                keyboardType="numeric"
                autoFocus={false}
                selectTextOnFocus={true}
                onChangeText={(text) => setGrams(Number(text) || 0)}
              />
            </View>

            {/* CALORIES */}
            <View style={styles.calorieContainer}>
              <Ionicons name="flame-outline" size={22} color="#444" />
              <Text style={styles.calories}>{scaledNutrients.calories}</Text>
              <Text style={styles.calText}>Cal</Text>
            </View>

            {/* MACROS */}
            <View style={styles.macrosRow}>
              <View style={styles.macroChip}>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>{scaledNutrients.protein} g</Text>
              </View>

              <View style={styles.macroChip}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>{scaledNutrients.carbs} g</Text>
              </View>

              <View style={styles.macroChip}>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroValue}>{scaledNutrients.fat} g</Text>
              </View>
            </View>


            {/* ACTION BUTTONS */}
            <View style={styles.btnColumn}>
              {!isManual && (
                <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
                  <Ionicons name="camera-outline" size={18} color="white" />
                  <Text style={styles.retakeText}>Retake Photo</Text>
                </TouchableOpacity>
              )}

              {!isManual && (
                <TouchableOpacity
                  style={styles.manualBtn}
                  onPress={() => {
                    onClose();        // ✅ close modal FIRST
                    setTimeout(() => {
                      onManual();    // ✅ then navigate
                    }, 150);
                  }}
                >
                  <Ionicons name="create-outline" size={18} color="white" />
                  <Text style={styles.manualText}>Add Manually</Text>
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
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        ) : null}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },

  closeBtn: {
    position: "absolute",
    top: 15,
    right: 20,
    zIndex: 9999,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  foodImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 18,
  },

  mealTypeContainer: { 
    marginBottom: 10,
    position: 'relative',
    zIndex: 100,
  },

  mealTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef4f7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start",
  },

  mealTypeText: { fontSize: 14, color: "#444", marginRight: 6 },

  dropdown: {
    position: 'absolute',
    top: 32,
    left: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginTop: 4,
    width: 150,
    zIndex: 1000,
  },

  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12 },

  dropdownItemText: { fontSize: 14, color: "#333" },

  foodNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  foodName: { fontSize: 20, fontWeight: "700" },

  gramsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  gramsLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginRight: 10,
    color: "#444",
  },

  gramsInput: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: 90,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },

  calorieContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  calories: { fontSize: 34, fontWeight: "700", marginLeft: 8, marginRight: 4 },

  calText: { fontSize: 16, fontWeight: "500", marginTop: 6 },

  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 4,
  },

  macroChip: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    width: "23%",
  },

  macroLabel: { fontSize: 13, color: "#555" },

  macroValue: { fontSize: 15, fontWeight: "600", marginTop: 2 },

  btnColumn: { width: "100%", marginTop: 12, gap: 12 },

  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
  },

  retakeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
  },

  manualBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
  },

  manualText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
  },

  doneBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  loadingContainer: {
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 60,
  },

  loadingTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 14,
    color: "#1f2937",
  },

  loadingSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
  },

  errorState: {
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 40,
  gap: 10,
},

errorTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#1f2937",
  marginTop: 10,
},

errorSubtitle: {
  fontSize: 14,
  color: "#6b7280",
  textAlign: "center",
  marginBottom: 20,
},



  doneText: { color: "white", fontSize: 17, fontWeight: "700" },
});
