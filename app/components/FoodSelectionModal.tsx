import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

interface Nutrients {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

interface FoodOption {
  food_name: string;
  confidence: number;
  nutrients?: Nutrients;
}

interface FoodSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onRetake: () => void;
  onManual: () => void;
  onSelect: (selectedFood: FoodOption) => void;
  options: FoodOption[];
  image: string | null;
}

export default function FoodSelectionModal({
  visible,
  onClose,
  onRetake,
  onManual,
  onSelect,
  options,
  image,
}: FoodSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState<FoodOption | null>(null);

  const handleOptionPress = (option: FoodOption) => {
    setSelectedOption(option);
  };

  const handleConfirm = () => {
    if (selectedOption) {
      onSelect(selectedOption);
      setSelectedOption(null); // Reset for next time
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* CLOSE BUTTON */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={26} color="#444" />
          </TouchableOpacity>

          {/* FOOD IMAGE */}
          {image && (
            <Image source={{ uri: image }} style={styles.foodImage} />
          )}

          {/* HEADER */}
          <View style={styles.header}>
            <Ionicons name="help-circle-outline" size={32} color="#f59e0b" />
            <Text style={styles.title}>Confirm what you photographed</Text>
            <Text style={styles.subtitle}>
              We detected multiple possibilities. Please select the correct dish:
            </Text>
          </View>

          {/* OPTIONS LIST */}
          <ScrollView style={styles.optionsList}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionCard,
                  selectedOption === option && styles.optionCardSelected,
                ]}
                onPress={() => handleOptionPress(option)}
              >
                <View style={styles.optionHeader}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionName}>{option.food_name}</Text>
                    {selectedOption === option && (
                      <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    )}
                  </View>
                  <Text style={styles.optionConfidence}>
                    {(option.confidence * 100).toFixed(1)}% confidence
                  </Text>
                </View>

                {option.nutrients && (
                  <View style={styles.nutrientRow}>
                    <View style={styles.nutrientItem}>
                      <Text style={styles.nutrientValue}>
                        {option.nutrients.calories}
                      </Text>
                      <Text style={styles.nutrientLabel}>cal</Text>
                    </View>
                    <View style={styles.nutrientItem}>
                      <Text style={styles.nutrientValue}>
                        {option.nutrients.protein}g
                      </Text>
                      <Text style={styles.nutrientLabel}>protein</Text>
                    </View>
                    <View style={styles.nutrientItem}>
                      <Text style={styles.nutrientValue}>
                        {option.nutrients.carbs}g
                      </Text>
                      <Text style={styles.nutrientLabel}>carbs</Text>
                    </View>
                    <View style={styles.nutrientItem}>
                      <Text style={styles.nutrientValue}>
                        {option.nutrients.fat}g
                      </Text>
                      <Text style={styles.nutrientLabel}>fat</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ACTION BUTTONS */}
          <View style={styles.buttonContainer}>
            {selectedOption ? (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirm}
              >
                <Ionicons name="checkmark-outline" size={20} color="white" />
                <Text style={styles.confirmText}>Confirm Selection</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.secondaryBtnRow}>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={onRetake}
              >
                <Ionicons name="camera-outline" size={18} color="#666" />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.manualBtn}
                onPress={onManual}
              >
                <Ionicons name="create-outline" size={18} color="#666" />
                <Text style={styles.manualText}>Manual Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: "90%",
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 8,
  },
  foodImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  optionsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionCardSelected: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  optionHeader: {
    marginBottom: 12,
  },
  optionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  optionName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  optionConfidence: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  nutrientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  nutrientItem: {
    alignItems: "center",
  },
  nutrientValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  nutrientLabel: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  buttonContainer: {
    gap: 12,
  },
  confirmBtn: {
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    gap: 6,
  },
  retakeText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "500",
  },
  manualBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    gap: 6,
  },
  manualText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "500",
  },
});
