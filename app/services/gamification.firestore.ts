import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { GamificationData } from "../types/gamification.types";
import { XP_PER_MEAL } from "../types/gamification.types";

export type GamificationMutationResult = {
  kind: "meal" | "daily_task";
  previous: GamificationData;
  updated: GamificationData;
  xpGained: number;
  taskLabel?: string;
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export async function getGamificationData(userId: string): Promise<GamificationData> {
  const snap = await getDoc(doc(db, "gamification", userId));
  if (snap.exists()) return snap.data() as GamificationData;
  return {
    userId,
    currentStreak: 0,
    longestStreak: 0,
    lastLoggedDate: null,
    lastBonusTaskDate: null,
    totalXP: 0,
  };
}

export async function applyMealGamification(userId: string): Promise<GamificationMutationResult> {
  const current = await getGamificationData(userId);
  const today = todayStr();
  const yesterday = yesterdayStr();

  if (current.lastLoggedDate === today) {
    return {
      kind: "meal",
      previous: current,
      updated: current,
      xpGained: 0,
    };
  }

  let { currentStreak, longestStreak, totalXP } = current;
  let xpEarned = XP_PER_MEAL;

  if (current.lastLoggedDate === yesterday) {
    currentStreak += 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    xpEarned += Math.min(currentStreak * 2, 20);
  } else {
    currentStreak = 1;
    longestStreak = Math.max(longestStreak, 1);
  }

  totalXP += xpEarned;

  const updated: GamificationData = {
    ...current,
    currentStreak,
    longestStreak,
    lastLoggedDate: today,
    totalXP,
  };

  await setDoc(doc(db, "gamification", userId), updated);

  return {
    kind: "meal",
    previous: current,
    updated,
    xpGained: xpEarned,
  };
}

export async function updateStreakAndXP(userId: string): Promise<GamificationData> {
  const result = await applyMealGamification(userId);
  return result.updated;
}

export async function applyDailyTaskGamification(
  userId: string,
  bonusXP: number,
  taskLabel: string
): Promise<GamificationMutationResult> {
  const current = await getGamificationData(userId);
  const today = todayStr();

  if (current.lastBonusTaskDate === today) {
    return {
      kind: "daily_task",
      previous: current,
      updated: current,
      xpGained: 0,
      taskLabel,
    };
  }

  const updated: GamificationData = {
    ...current,
    totalXP: current.totalXP + bonusXP,
    lastBonusTaskDate: today,
  };

  await setDoc(doc(db, "gamification", userId), updated);

  return {
    kind: "daily_task",
    previous: current,
    updated,
    xpGained: bonusXP,
    taskLabel,
  };
}

export async function awardBonusTaskXP(userId: string, bonusXP: number): Promise<GamificationData> {
  const result = await applyDailyTaskGamification(userId, bonusXP, "Daily Task");
  return result.updated;
}
