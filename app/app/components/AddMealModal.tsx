import React from "react";
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from '../../constants/fonts';

export default function AddMealModal({
  visible,
  onClose,
  foodName,
  nutrients,
  image,
}: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#555" />
          </TouchableOpacity>

          {/* Show image only if camera was used */}
          {image && (
            <Image source={{ uri: image }} style={styles.foodImage} />
          )}

          <Text style={styles.foodName}>{foodName}</Text>

          <View style={styles.macroContainer}>
            <Text style={styles.calories}>{nutrients.calories} Cal</Text>

            <View style={styles.macroRow}>
              <Text style={styles.macroTag}>Protein: {nutrients.protein}g</Text>
              <Text style={styles.macroTag}>Carbs: {nutrients.carbs}g</Text>
              <Text style={styles.macroTag}>Fat: {nutrients.fat}g</Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={onClose}>
            <Text style={styles.saveBtnText}>Done</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  card: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },

  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 3,
  },

  foodImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 20,
  },

  foodName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    fontFamily: Fonts.bold,
  },

  macroContainer: {
    marginBottom: 20,
  },

  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  macroTag: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    color: "#374151",
    fontSize: 14,
    fontFamily: Fonts.regular,
  },

  calories: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
    fontFamily: Fonts.bold,
  },

  saveBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  saveBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
