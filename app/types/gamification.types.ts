export interface GamificationData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastLoggedDate: string | null;    // "YYYY-MM-DD"
  lastBonusTaskDate: string | null; // "YYYY-MM-DD"
  totalXP: number;
}

export const XP_PER_MEAL = 10;

export const LEVELS = [
  { level: 1, label: 'Beginner',   minXP: 0,    maxXP: 99   },
  { level: 2, label: 'Tracker',    minXP: 100,  maxXP: 299  },
  { level: 3, label: 'Consistent', minXP: 300,  maxXP: 699  },
  { level: 4, label: 'Dedicated',  minXP: 700,  maxXP: 1499 },
  { level: 5, label: 'Expert',     minXP: 1500, maxXP: 2999 },
  { level: 6, label: 'Master',     minXP: 3000, maxXP: Infinity },
] as const;

export function getLevelInfo(totalXP: number) {
  const current = [...LEVELS].reverse().find((l) => totalXP >= l.minXP) ?? LEVELS[0];
  const next = LEVELS.find((l) => l.level === current.level + 1);
  const progressXP = totalXP - current.minXP;
  const levelRange = next ? next.minXP - current.minXP : 1;
  const progress = next ? Math.min(progressXP / levelRange, 1) : 1;
  const xpToNext = next ? next.minXP - totalXP : 0;
  return { current, next, progress, xpToNext };
}
