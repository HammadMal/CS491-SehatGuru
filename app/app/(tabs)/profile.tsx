import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { authAPI } from "../../services/auth.api";
import { Colors } from "../../constants/colors";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleClearData = async () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete your account and all data. This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              if (!user?.email) {
                Alert.alert("Error", "User email not found");
                return;
              }

              // Delete user account from backend
              await authAPI.deleteUserByEmail(user.email);

              // Logout to clear auth state and storage (this will trigger navigation to login)
              await logout();

              // Show success message
              Alert.alert(
                "Account Deleted",
                "Your account and all data have been permanently deleted."
              );
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.detail || "Failed to delete account. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Ionicons name="person-circle-outline" size={80} color={Colors.primary} />
      </View>

      <View style={styles.content}>
        {user && (
          <View style={styles.infoCard}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>

            {user.fullName && (
              <>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{user.fullName}</Text>
              </>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
          <Ionicons name="trash-outline" size={24} color={Colors.error} />
          <Text style={styles.dangerButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 15,
    padding: 20,
    marginBottom: 24,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundLight,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.error,
    marginLeft: 8,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundLight,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.disabled,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginLeft: 8,
  },
});
