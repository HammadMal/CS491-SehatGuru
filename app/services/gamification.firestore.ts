import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { GamificationData } from "../types/gamification.types";
import { XP_PER_MEAL } from "../types/gamification.types";

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

export async function updateStreakAndXP(userId: string): Promise<GamificationData> {
  const current = await getGamificationData(userId);
  const today = todayStr();
  const yesterday = yesterdayStr();

  // Already completed base task today — no changes
  if (current.lastLoggedDate === today) return current;

  let { currentStreak, longestStreak, totalXP } = current;
  let xpEarned = XP_PER_MEAL;

  if (current.lastLoggedDate === yesterday) {
    // Streak continues — award meal XP + streak bonus
    currentStreak += 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    xpEarned += Math.min(currentStreak * 2, 20);
  } else {
    // New or broken streak — meal XP only
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
  return updated;
}

export async function awardBonusTaskXP(userId: string, bonusXP: number): Promise<GamificationData> {
  const current = await getGamificationData(userId);
  const today = todayStr();

  // Already awarded bonus task XP today
  if (current.lastBonusTaskDate === today) return current;

  const updated: GamificationData = {
    ...current,
    totalXP: current.totalXP + bonusXP,
    lastBonusTaskDate: today,
  };

  await setDoc(doc(db, "gamification", userId), updated);
  return updated;
}
