import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Motivational messages pool
const MOTIVATIONAL_MESSAGES = [
  { title: "You're doing great! 💪", body: "Every healthy meal is a step toward your goals." },
  { title: "Stay consistent! 🔥", body: "Small daily choices lead to big results." },
  { title: "Fuel your body right! 🥗", body: "Nutritious food = more energy throughout the day." },
  { title: "Hydration check! 💧", body: "Have you had enough water today?" },
  { title: "Progress, not perfection! 🌟", body: "Every day is a new chance to eat better." },
  { title: "You've got this! 🏆", body: "Tracking your meals shows real dedication." },
  { title: "Healthy habits matter! 🌱", body: "Consistency is the key to lasting health." },
  { title: "Mindful eating 🧘", body: "Take a moment to enjoy your food today." },
  { title: "Keep it up! 🎯", body: "Your future self will thank you for today's choices." },
  { title: "Balanced plate = balanced life ⚖️", body: "Try to get all your macros today!" },
];

/**
 * NotificationService — matches the SDS class design.
 *
 * Attributes:
 *   - fcmToken: Expo push token (wraps FCM on Android)
 *
 * Methods:
 *   - sendReminder(): Schedules daily meal reminders
 *   - sendAlert(message): Sends an immediate alert notification
 *   - sendMotivationalMessage(): Schedules a daily motivational message
 */
class NotificationService {
  fcmToken: string | null = null;

  // ─── Initialization ───────────────────────────────

  /**
   * Configure how notifications appear when the app is in the foreground.
   */
  initialize() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Request permission and obtain the Expo push token (maps to FCM on Android).
   */
  async requestPermissions(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("⚠️ Notification permission denied");
      return false;
    }

    // Get Expo push token (wraps FCM on Android).
    // Note: Only available in standalone/dev builds, not Expo Go (SDK 53+).
    try {
      const Constants = await import("expo-constants");
      const isExpoGo = Constants.default.executionEnvironment === "storeClient";
      if (!isExpoGo) {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        this.fcmToken = tokenData.data;
        console.log("🔔 FCM Push token:", this.fcmToken);
      } else {
        console.log("ℹ️ Running in Expo Go — FCM token skipped. Local notifications still work.");
      }
    } catch (err) {
      console.log("⚠️ Could not get push token:", err);
    }

    // Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("meal-reminders", {
        name: "Meal Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });

      await Notifications.setNotificationChannelAsync("alerts", {
        name: "Alerts",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("motivation", {
        name: "Motivational Messages",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });
    }

    return true;
  }

  // ─── sendReminder() ───────────────────────────────

  /**
   * Sends reminder notifications to the user for meals.
   * Schedules daily repeating notifications for breakfast, lunch, and dinner.
   */
  async sendReminder() {
    // Cancel any existing meal reminders first
    await this.cancelReminders();

    // Breakfast — 8:00 AM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time for Breakfast! 🍳",
        body: "Start your day right — log your breakfast on SehatGuru.",
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "meal-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
      identifier: "reminder-breakfast",
    });

    // Lunch — 1:00 PM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Lunch Time! 🥗",
        body: "Don't forget to log your lunch and stay on track.",
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "meal-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 13,
        minute: 0,
      },
      identifier: "reminder-lunch",
    });

    // Dinner — 7:00 PM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Dinner Time! 🍽️",
        body: "Log your dinner to complete today's nutrition tracking.",
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "meal-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 19,
        minute: 0,
      },
      identifier: "reminder-dinner",
    });

    // Evening nudge — 9:00 PM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Daily Check-in 📊",
        body: "Have you logged all your meals today? Review your nutrition.",
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "meal-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
      identifier: "reminder-evening",
    });

    console.log("✅ Meal reminders scheduled");
  }

  /**
   * Cancel all meal reminder notifications.
   */
  async cancelReminders() {
    const ids = [
      "reminder-breakfast",
      "reminder-lunch",
      "reminder-dinner",
      "reminder-evening",
    ];
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    console.log("🔕 Meal reminders cancelled");
  }

  // ─── sendAlert(message) ───────────────────────────

  /**
   * Sends an immediate alert notification to the user.
   * Used for things like exceeding calorie goals, etc.
   */
  async sendAlert(message: string) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "SehatGuru",
        body: message,
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "alerts" }),
      },
      trigger: null, // null = fire immediately
    });

    console.log("🚨 Alert sent:", message);
  }

  // ─── sendMotivationalMessage() ────────────────────

  /**
   * Schedules a daily motivational message at 10:00 AM.
   */
  async sendMotivationalMessage() {
    await this.cancelMotivationalMessages();

    // Pick a random motivational message
    const msg =
      MOTIVATIONAL_MESSAGES[
        Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)
      ];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "motivation" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 10,
        minute: 0,
      },
      identifier: "motivational-daily",
    });

    console.log("✅ Motivational message scheduled");
  }

  /**
   * Cancel motivational message notifications.
   */
  async cancelMotivationalMessages() {
    await Notifications.cancelScheduledNotificationAsync("motivational-daily");
    console.log("🔕 Motivational messages cancelled");
  }

  // ─── Utilities ────────────────────────────────────

  /**
   * Cancel ALL scheduled notifications.
   */
  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("🔕 All notifications cancelled");
  }

  /**
   * List all currently scheduled notifications (for debugging).
   */
  async listScheduled() {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();
    console.log(
      "📋 Scheduled notifications:",
      scheduled.map((n) => ({
        id: n.identifier,
        title: n.content.title,
      }))
    );
    return scheduled;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
