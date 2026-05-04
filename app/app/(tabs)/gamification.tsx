import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useMealStore } from '../../store/useMealStore';
import { getGamificationData, awardBonusTaskXP } from '../../services/gamification.firestore';
import { getLevelInfo } from '../../types/gamification.types';
import { Fonts } from '../../constants/fonts';
import type { Meal } from '../../types/meal.types';

const LEVEL_COLORS = ['#9ca3af', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
const LEVEL_BG     = ['#f3f4f6', '#f0fdf4', '#eff6ff', '#fffbeb', '#f5f3ff', '#fef2f2'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function getTodayMeals(meals: Meal[]): Meal[] {
  const now = new Date();
  return meals.filter((m) => {
    const d = new Date(m.createdAt);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });
}

type DayTask = {
  label: string;
  desc: string;
  xp: number;
  icon: string;
  color: string;
  bg: string;
  check: (meals: Meal[], calorieGoal: number, proteinGoal: number) => boolean;
};

const DAY_TASKS: DayTask[] = [
  {
    label: 'Snack Smart',
    desc: 'Log a snack today',
    xp: 10,
    icon: 'coffee-outline',
    color: '#ec4899',
    bg: '#fdf2f8',
    check: (meals) => meals.some((m) => m.mealType === 'Snack'),
  },
  {
    label: 'Morning Starter',
    desc: 'Log your breakfast today',
    xp: 10,
    icon: 'weather-sunny',
    color: '#f59e0b',
    bg: '#fffbeb',
    check: (meals) => meals.some((m) => m.mealType === 'Breakfast'),
  },
  {
    label: 'Calorie Champion',
    desc: 'Reach 90% of your daily calorie goal',
    xp: 20,
    icon: 'lightning-bolt',
    color: '#ef4444',
    bg: '#fef2f2',
    check: (meals, calorieGoal) =>
      meals.reduce((s, m) => s + m.calories, 0) >= calorieGoal * 0.9,
  },
  {
    label: 'Full Day Logger',
    desc: 'Log breakfast, lunch & dinner',
    xp: 15,
    icon: 'calendar-check',
    color: '#6366f1',
    bg: '#eef2ff',
    check: (meals) =>
      ['Breakfast', 'Lunch', 'Dinner'].every((t) => meals.some((m) => m.mealType === t)),
  },
  {
    label: 'Camera Pro',
    desc: 'Log at least one meal using the camera',
    xp: 10,
    icon: 'camera',
    color: '#22c55e',
    bg: '#f0fdf4',
    check: (meals) => meals.some((m) => m.source === 'camera'),
  },
  {
    label: 'Protein Power',
    desc: 'Hit 80% of your daily protein goal',
    xp: 15,
    icon: 'dumbbell',
    color: '#3b82f6',
    bg: '#eff6ff',
    check: (meals, _cal, proteinGoal) =>
      meals.reduce((s, m) => s + m.protein, 0) >= proteinGoal * 0.8,
  },
  {
    label: 'Meal Planner',
    desc: 'Log a meal from your meal plan',
    xp: 15,
    icon: 'clipboard-list',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    check: (meals) => meals.some((m) => m.source === 'chatbot'),
  },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function GamificationScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, hydrated, setData } = useGamificationStore();
  const allMeals = useMealStore((s) => s.meals);
  const bonusAwardedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || hydrated) return;
    getGamificationData(user.id).then(setData).catch(console.error);
  }, [user?.id, hydrated]);

  const todayMeals = useMemo(() => getTodayMeals(allMeals), [allMeals]);

  const calorieGoal = user?.daily_calorie_goal ?? 2000;
  const proteinGoal = user?.daily_protein_goal ?? 120;
  const dayOfWeek  = new Date().getDay();
  const dayTask    = DAY_TASKS[dayOfWeek];
  const isDayTaskComplete = dayTask.check(todayMeals, calorieGoal, proteinGoal);

  useEffect(() => {
    if (!user?.id || !data || bonusAwardedRef.current) return;
    if (data.lastBonusTaskDate === todayStr()) { bonusAwardedRef.current = true; return; }
    if (!isDayTaskComplete) return;
    bonusAwardedRef.current = true;
    awardBonusTaskXP(user.id, dayTask.xp).then(setData).catch(console.error);
  }, [data, isDayTaskComplete, user?.id]);

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  const totalXP       = data?.totalXP ?? 0;
  const currentStreak = data?.currentStreak ?? 0;
  const longestStreak = data?.longestStreak ?? 0;
  const { current: lvl, next: nextLvl, progress, xpToNext } = getLevelInfo(totalXP);
  const lColor  = LEVEL_COLORS[lvl.level - 1];
  const lBg     = LEVEL_BG[lvl.level - 1];
  const today         = todayStr();
  const loggedToday   = data?.lastLoggedDate === today;
  const bonusToday    = data?.lastBonusTaskDate === today;
  const streakBonus   = Math.min(currentStreak * 2, 20);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.heading}>Progress</Text>
        </View>

        {/* ── Level Card ── */}
        <View style={[styles.card, styles.levelCard, { borderColor: lColor + '40' }]}>
          <View style={styles.levelTopRow}>
            <View style={[styles.levelBadge, { backgroundColor: lColor + '18' }]}>
              <MaterialCommunityIcons name="trophy" size={28} color={lColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.levelLabel}>Level {lvl.level}</Text>
              <Text style={[styles.levelTitle, { color: lColor }]}>{lvl.label}</Text>
            </View>
            <View style={styles.xpPill}>
              <Text style={styles.xpPillText}>{totalXP} XP</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: lColor }]} />
          </View>
          {nextLvl ? (
            <Text style={styles.progressHint}>
              {xpToNext} XP to{' '}
              <Text style={{ fontWeight: '700' }}>Level {nextLvl.level} · {nextLvl.label}</Text>
            </Text>
          ) : (
            <Text style={styles.progressHint}>Max level reached — you're a legend!</Text>
          )}
        </View>

        {/* ── Streak Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Streaks</Text>
          <View style={styles.streakRow}>

            <View style={[styles.streakBox, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
              <MaterialCommunityIcons name="fire" size={32} color="#f97316" />
              <Text style={[styles.streakNum, { color: '#ea580c' }]}>{currentStreak}</Text>
              <Text style={styles.streakSub}>Current</Text>
            </View>

            <View style={[styles.streakBox, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <MaterialCommunityIcons name="star-circle" size={32} color="#3b82f6" />
              <Text style={[styles.streakNum, { color: '#2563eb' }]}>{longestStreak}</Text>
              <Text style={styles.streakSub}>Best</Text>
            </View>

          </View>
          <View style={[styles.streakHint, { backgroundColor: currentStreak > 0 ? '#f0fdf4' : '#fff7ed' }]}>
            <MaterialCommunityIcons
              name={currentStreak > 0 ? 'check-circle' : 'information'}
              size={15}
              color={currentStreak > 0 ? '#22c55e' : '#f97316'}
            />
            <Text style={[styles.streakHintText, { color: currentStreak > 0 ? '#166534' : '#9a3412' }]}>
              {currentStreak === 0
                ? 'Log a meal today to start your streak!'
                : currentStreak >= longestStreak
                ? "You're at your all-time best — keep going! 💪"
                : 'Log a meal tomorrow to keep it going!'}
            </Text>
          </View>
        </View>

        {/* ── Daily Tasks ── */}
        <View style={styles.card}>
          <View style={styles.taskHeader}>
            <Text style={styles.cardTitle}>Today's Tasks</Text>
            <View style={styles.dayChip}>
              <MaterialCommunityIcons name="calendar-today" size={12} color="#22c55e" />
              <Text style={styles.dayChipText}>{DAY_NAMES[dayOfWeek]}</Text>
            </View>
          </View>

          <TaskRow
            iconLib="mci"
            icon="silverware-fork-knife"
            color="#22c55e"
            bg="#f0fdf4"
            label="Log a meal"
            desc={currentStreak > 1 && loggedToday ? `+10 XP  ·  +${streakBonus} streak bonus` : 'Log any meal today'}
            xp="+10 XP"
            done={loggedToday}
          />

          <TaskRow
            iconLib="mci"
            icon={dayTask.icon}
            color={dayTask.color}
            bg={dayTask.bg}
            label={dayTask.label}
            desc={dayTask.desc}
            xp={`+${dayTask.xp} XP`}
            done={bonusToday}
          />

          {loggedToday && bonusToday && (
            <View style={styles.allDone}>
              <MaterialCommunityIcons name="check-decagram" size={18} color="#15803d" />
              <Text style={styles.allDoneText}>All done! Come back tomorrow for new tasks.</Text>
            </View>
          )}
        </View>

        {/* ── Level Ladder ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Level Ladder</Text>
          {(
            [
              { level: 1, label: 'Beginner',   minXP: 0    },
              { level: 2, label: 'Tracker',    minXP: 100  },
              { level: 3, label: 'Consistent', minXP: 300  },
              { level: 4, label: 'Dedicated',  minXP: 700  },
              { level: 5, label: 'Expert',     minXP: 1500 },
              { level: 6, label: 'Master',     minXP: 3000 },
            ] as const
          ).map((l, i) => {
            const c         = LEVEL_COLORS[i];
            const isCurrent = l.level === lvl.level;
            const unlocked  = totalXP >= l.minXP;
            return (
              <View
                key={l.level}
                style={[
                  styles.ladderRow,
                  isCurrent && { backgroundColor: c + '10', borderRadius: 14 },
                ]}
              >
                <View style={[
                  styles.ladderCircle,
                  { backgroundColor: unlocked ? c : '#f3f4f6', borderColor: unlocked ? c : '#e5e7eb' },
                ]}>
                  {unlocked
                    ? <MaterialCommunityIcons name="check-bold" size={14} color="#fff" />
                    : <Text style={styles.ladderCircleNum}>{l.level}</Text>
                  }
                </View>
                <Text style={[styles.ladderLabel, { color: unlocked ? '#111' : '#d1d5db' }]}>
                  {l.label}
                </Text>
                <Text style={[styles.ladderXP, { color: unlocked ? '#888' : '#e5e7eb' }]}>
                  {isCurrent ? `${totalXP} XP` : `${l.minXP} XP`}
                </Text>
                {isCurrent && (
                  <View style={[styles.youBadge, { backgroundColor: c }]}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Task Row ─── */
function TaskRow({
  iconLib, icon, color, bg, label, desc, xp, done,
}: {
  iconLib: 'mci' | 'ion';
  icon: string; color: string; bg: string;
  label: string; desc: string; xp: string; done: boolean;
}) {
  return (
    <View style={[styles.taskRow, { borderLeftColor: done ? '#22c55e' : color }, done && styles.taskRowDone]}>
      <View style={[styles.taskIconBox, { backgroundColor: done ? '#f0fdf4' : bg }]}>
        {iconLib === 'mci'
          ? <MaterialCommunityIcons name={icon as any} size={22} color={done ? '#86efac' : color} />
          : <Ionicons name={icon as any} size={22} color={done ? '#86efac' : color} />
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskLabel, done && styles.taskLabelDone]}>{label}</Text>
        <Text style={styles.taskDesc}>{desc}</Text>
      </View>
      {done
        ? <MaterialCommunityIcons name="check-decagram" size={26} color="#22c55e" />
        : <View style={[styles.xpTag, { backgroundColor: color + '18', borderColor: color + '30' }]}>
            <Text style={[styles.xpTagText, { color }]}>{xp}</Text>
          </View>
      }
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F3F6FA' },
  scroll: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E8EDF2',
  },
  heading: { fontSize: 22, fontWeight: '800', fontFamily: Fonts.extrabold, color: '#111' },

  /* Level card */
  levelCard:   { borderWidth: 1.5 },
  levelTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  levelBadge:  { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  levelLabel:  { fontSize: 12, color: '#999', fontWeight: '600', fontFamily: Fonts.semibold },
  levelTitle:  { fontSize: 22, fontWeight: '900', fontFamily: Fonts.extrabold, marginTop: 2 },
  xpPill: {
    backgroundColor: '#f0fdf4', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#d1fae5',
  },
  xpPillText:    { fontSize: 15, fontWeight: '800', fontFamily: Fonts.extrabold, color: '#15803d' },
  progressTrack: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: '100%', borderRadius: 99 },
  progressHint:  { fontSize: 12, fontFamily: Fonts.regular, color: '#999' },

  /* Shared card */
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  cardTitle: {
    fontSize: 11, fontWeight: '800', fontFamily: Fonts.extrabold, color: '#aaa',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14,
  },

  /* Streak */
  streakRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  streakBox: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 18,
    borderRadius: 18, borderWidth: 1.5,
  },
  streakNum: { fontSize: 38, fontWeight: '900', fontFamily: Fonts.extrabold, lineHeight: 42 },
  streakSub: { fontSize: 12, color: '#999', fontWeight: '600', fontFamily: Fonts.semibold },
  streakHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  streakHintText: { fontSize: 12, fontWeight: '500', fontFamily: Fonts.medium, flex: 1 },

  /* Tasks */
  taskHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  dayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f0fdf4', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 20,
  },
  dayChipText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.bold, color: '#22c55e' },

  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 16, marginBottom: 10,
    backgroundColor: '#FAFAFA',
    borderWidth: 1, borderColor: '#F0F0F0',
    borderLeftWidth: 4,
  },
  taskRowDone: { backgroundColor: '#fafffe', borderColor: '#d1fae5' },
  taskIconBox: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  taskLabel:     { fontSize: 14, fontWeight: '700', fontFamily: Fonts.bold, color: '#111' },
  taskLabelDone: { color: '#bbb', textDecorationLine: 'line-through' },
  taskDesc:      { fontSize: 11, fontFamily: Fonts.regular, color: '#aaa', marginTop: 3 },
  xpTag: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1,
  },
  xpTagText: { fontSize: 12, fontWeight: '800', fontFamily: Fonts.extrabold },

  allDone: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 2,
  },
  allDoneText: { fontSize: 13, color: '#15803d', fontWeight: '600', fontFamily: Fonts.semibold, flex: 1 },

  /* Level ladder */
  ladderRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 10, paddingHorizontal: 8,
  },
  ladderCircle: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  ladderCircleNum: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.bold, color: '#d1d5db' },
  ladderLabel: { flex: 1, fontSize: 14, fontWeight: '600', fontFamily: Fonts.semibold },
  ladderXP:    { fontSize: 12, fontWeight: '600', fontFamily: Fonts.semibold },
  youBadge: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  youBadgeText: { fontSize: 10, fontWeight: '900', fontFamily: Fonts.extrabold, color: '#fff', letterSpacing: 0.5 },
});
