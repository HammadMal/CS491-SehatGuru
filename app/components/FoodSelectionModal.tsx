import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from '../constants/fonts';

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
  const topTwoOptions = options.slice(0, 2);

  const handleOptionPress = (option: FoodOption) => {
    onSelect(option);
  };

  if (!visible) return null;

  return (
    <View style={styles.fullscreen}>
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
              Tap the dish you photographed:
            </Text>
          </View>

          {/* OPTIONS - SIDE BY SIDE */}
          <View style={styles.optionsRow}>
            {topTwoOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionCard}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionName}>{option.food_name}</Text>
                  <Text style={styles.optionConfidence}>
                    {(option.confidence * 100).toFixed(1)}%
                  </Text>
                </View>

                {option.nutrients && (
                  <View style={styles.nutrientColumn}>
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
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.buttonContainer}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
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
    fontFamily: Fonts.bold,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: Fonts.regular,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  optionHeader: {
    width: "100%",
    marginBottom: 16,
    alignItems: "center",
  },
  optionName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 6,
    fontFamily: Fonts.bold,
  },
  optionConfidence: {
    fontSize: 13,
    color: "#22c55e",
    fontWeight: "600",
    fontFamily: Fonts.semibold,
  },
  nutrientColumn: {
    width: "100%",
    gap: 10,
  },
  nutrientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  nutrientValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    fontFamily: Fonts.semibold,
  },
  nutrientLabel: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "uppercase",
    fontWeight: "500",
    fontFamily: Fonts.medium,
  },
  buttonContainer: {
    gap: 12,
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
    fontFamily: Fonts.medium,
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
    fontFamily: Fonts.medium,
  },
});
