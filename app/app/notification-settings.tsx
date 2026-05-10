import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useNotificationStore } from "../store/useNotificationStore";
import { notificationService } from "../services/notification.service";
import { useEffect } from "react";

export default function NotificationSettings() {
  const {
    mealReminders,
    motivationalMessages,
    loaded,
    loadPreferences,
    toggleMealReminders,
    toggleMotivationalMessages,
  } = useNotificationStore();

  useEffect(() => {
    if (!loaded) loadPreferences();
  }, [loaded]);

  const handleTestNotification = async () => {
    await notificationService.requestPermissions();
    await notificationService.sendAlert(
      "This is a test notification from SehatGuru! 🎉"
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerIcon}>
            <Ionicons name="notifications" size={24} color="#22c55e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerTitle}>Stay on Track</Text>
            <Text style={styles.infoBannerSub}>
              Get timely reminders to log your meals and stay motivated on your
              health journey.
            </Text>
          </View>
        </View>

        {/* Meal Reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MEAL TRACKING</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={[styles.iconBadge, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="restaurant-outline" size={20} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Meal Reminders</Text>
                <Text style={styles.settingDesc}>
                  Get notified at breakfast (8 AM), lunch (1 PM), and dinner (7
                  PM) to log your meals
                </Text>
              </View>
              <Switch
                value={mealReminders}
                onValueChange={toggleMealReminders}
                trackColor={{ false: "#E5E7EB", true: "#86efac" }}
                thumbColor={mealReminders ? "#22c55e" : "#fff"}
                ios_backgroundColor="#E5E7EB"
              />
            </View>

            {mealReminders && (
              <View style={styles.scheduleInfo}>
                <ScheduleItem icon="sunny-outline" time="8:00 AM" label="Breakfast" color="#f59e0b" />
                <ScheduleItem icon="restaurant-outline" time="1:00 PM" label="Lunch" color="#22c55e" />
                <ScheduleItem icon="moon-outline" time="7:00 PM" label="Dinner" color="#6366f1" />
                <ScheduleItem icon="stats-chart-outline" time="9:00 PM" label="Daily Check-in" color="#ec4899" />
              </View>
            )}
          </View>
        </View>

        {/* Motivational Messages */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MOTIVATION</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={[styles.iconBadge, { backgroundColor: "#f0fdf4" }]}>
                <Ionicons name="heart-outline" size={20} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>
                  Daily Motivational Message
                </Text>
                <Text style={styles.settingDesc}>
                  Receive an encouraging health tip every day at 10:00 AM
                </Text>
              </View>
              <Switch
                value={motivationalMessages}
                onValueChange={toggleMotivationalMessages}
                trackColor={{ false: "#E5E7EB", true: "#86efac" }}
                thumbColor={motivationalMessages ? "#22c55e" : "#fff"}
                ios_backgroundColor="#E5E7EB"
              />
            </View>
          </View>
        </View>

        {/* Test Notification */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TEST</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNotification}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane-outline" size={18} color="#fff" />
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ── Sub-component ── */
const ScheduleItem = ({
  icon,
  time,
  label,
  color,
}: {
  icon: any;
  time: string;
  label: string;
  color: string;
}) => (
  <View style={styles.scheduleRow}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={styles.scheduleLabel}>{label}</Text>
    <Text style={styles.scheduleTime}>{time}</Text>
  </View>
);

/* ── Styles ── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F6FA" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 20 },

  /* Info Banner */
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  infoBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 4,
  },
  infoBannerSub: { fontSize: 13, color: "#15803d", lineHeight: 18 },

  /* Section */
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#aaa",
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  },

  /* Card */
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },

  /* Setting Row */
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  settingDesc: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
    lineHeight: 17,
    paddingRight: 8,
  },

  /* Schedule Info */
  scheduleInfo: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scheduleLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: "#555" },
  scheduleTime: { fontSize: 13, fontWeight: "700", color: "#111" },

  /* Test Button */
  testButton: {
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  testButtonText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
