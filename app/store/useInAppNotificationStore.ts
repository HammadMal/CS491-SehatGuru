import { create } from "zustand";

type InAppNotification = {
  title: string;
  message: string;
  tone: "success" | "info";
};

type InAppNotificationState = {
  notification: InAppNotification | null;
  visible: boolean;
  showNotification: (
    notification: InAppNotification,
    options?: { durationMs?: number }
  ) => void;
  hideNotification: () => void;
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useInAppNotificationStore = create<InAppNotificationState>((set) => ({
  notification: null,
  visible: false,
  showNotification: (notification, options) => {
    if (hideTimer) clearTimeout(hideTimer);

    set({ notification, visible: true });

    hideTimer = setTimeout(() => {
      set({ visible: false });
    }, options?.durationMs ?? 2600);
  },
  hideNotification: () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    set({ visible: false });
  },
}));
