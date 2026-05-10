import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notificationService } from "../services/notification.service";

const STORAGE_KEY = "sehatguru-notification-prefs";

type NotificationState = {
  mealReminders: boolean;
  motivationalMessages: boolean;
  loaded: boolean;

  loadPreferences: () => Promise<void>;
  toggleMealReminders: () => Promise<void>;
  toggleMotivationalMessages: () => Promise<void>;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  mealReminders: false,
  motivationalMessages: false,
  loaded: false,

  loadPreferences: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const prefs = JSON.parse(raw);
        set({
          mealReminders: prefs.mealReminders ?? false,
          motivationalMessages: prefs.motivationalMessages ?? false,
          loaded: true,
        });

        // Re-schedule any active notifications
        if (prefs.mealReminders) {
          await notificationService.sendReminder();
        }
        if (prefs.motivationalMessages) {
          await notificationService.sendMotivationalMessage();
        }
      } else {
        set({ loaded: true });
      }
    } catch (e) {
      console.error("Failed to load notification preferences:", e);
      set({ loaded: true });
    }
  },

  toggleMealReminders: async () => {
    const current = get().mealReminders;
    const newValue = !current;

    set({ mealReminders: newValue });

    if (newValue) {
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        set({ mealReminders: false });
        return;
      }
      await notificationService.sendReminder();
    } else {
      await notificationService.cancelReminders();
    }

    await persistPrefs(get());
  },

  toggleMotivationalMessages: async () => {
    const current = get().motivationalMessages;
    const newValue = !current;

    set({ motivationalMessages: newValue });

    if (newValue) {
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        set({ motivationalMessages: false });
        return;
      }
      await notificationService.sendMotivationalMessage();
    } else {
      await notificationService.cancelMotivationalMessages();
    }

    await persistPrefs(get());
  },
}));

async function persistPrefs(state: NotificationState) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mealReminders: state.mealReminders,
        motivationalMessages: state.motivationalMessages,
      })
    );
  } catch (e) {
    console.error("Failed to save notification preferences:", e);
  }
}
