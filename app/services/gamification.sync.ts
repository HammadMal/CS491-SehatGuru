import {
  applyDailyTaskGamification,
  applyMealGamification,
  getGamificationData,
  type GamificationMutationResult,
} from "./gamification.firestore";
import { getLevelInfo } from "../types/gamification.types";
import { useGamificationStore } from "../store/useGamificationStore";
import { useInAppNotificationStore } from "../store/useInAppNotificationStore";

function announceGamificationUpdate(result: GamificationMutationResult) {
  if (result.xpGained <= 0) return;

  const previousLevel = getLevelInfo(result.previous.totalXP).current.level;
  const updatedLevel = getLevelInfo(result.updated.totalXP).current;
  const levelUp = updatedLevel.level > previousLevel;

  const title =
    result.kind === "daily_task"
      ? `+${result.xpGained} XP Task Complete`
      : `+${result.xpGained} XP`;

  const messageParts: string[] = [];

  if (result.kind === "daily_task" && result.taskLabel) {
    messageParts.push(`${result.taskLabel} completed.`);
  }

  if (result.updated.currentStreak > result.previous.currentStreak) {
    messageParts.push(`Streak: ${result.updated.currentStreak} day${result.updated.currentStreak === 1 ? "" : "s"}.`);
  }

  if (levelUp) {
    messageParts.push(`Level ${updatedLevel.level} unlocked: ${updatedLevel.label}.`);
  }

  if (messageParts.length === 0) {
    messageParts.push(`Total XP: ${result.updated.totalXP}.`);
  }

  useInAppNotificationStore.getState().showNotification({
    title,
    message: messageParts.join(" "),
    tone: "success",
  });
}

function announceMealLoggedWithoutXp(result: GamificationMutationResult) {
  if (result.kind !== "meal" || result.xpGained > 0) return;

  useInAppNotificationStore.getState().showNotification({
    title: "Meal Logged",
    message: "Daily meal XP already claimed. Your meal was still recorded.",
    tone: "info",
  });
}

export async function hydrateGamificationState(userId: string) {
  const data = await getGamificationData(userId);
  useGamificationStore.getState().setData(data);
  return data;
}

export function resetGamificationState() {
  useGamificationStore.getState().clearData();
}

export async function syncMealGamification(userId: string) {
  const result = await applyMealGamification(userId);
  useGamificationStore.getState().setData(result.updated);
  if (result.xpGained > 0) {
    announceGamificationUpdate(result);
  } else {
    announceMealLoggedWithoutXp(result);
  }
  return result.updated;
}

export async function syncDailyTaskGamification(
  userId: string,
  bonusXP: number,
  taskLabel: string
) {
  const result = await applyDailyTaskGamification(userId, bonusXP, taskLabel);
  useGamificationStore.getState().setData(result.updated);
  announceGamificationUpdate(result);
  return result.updated;
}
