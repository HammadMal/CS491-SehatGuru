import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MealPlanActionsProps {
  onApprove: () => void;
  onReject: () => void;
  loading?: boolean;
}

export function MealPlanActions({ onApprove, onReject, loading = false }: MealPlanActionsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.approveBtn]}
        onPress={onApprove}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
        )}
        <Text style={styles.btnText}>{loading ? "Saving…" : "Approve Plan"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.rejectBtn]}
        onPress={onReject}
        disabled={loading}
      >
        <Ionicons name="close-circle-outline" size={18} color="#555" />
        <Text style={[styles.btnText, styles.rejectText]}>Reject</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: "#22c55e",
    flex: 1,
    justifyContent: "center",
  },
  rejectBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 18,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  rejectText: {
    color: "#555",
  },
});
