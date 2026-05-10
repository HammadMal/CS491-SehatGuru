import React, { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  StyleSheet, Text, TouchableOpacity, View, Alert, ScrollView,
  Modal, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/auth.api';
import { useGamificationStore } from '../../store/useGamificationStore';
import { getLevelInfo } from '../../types/gamification.types';
import {
  getCachedAvatarData, getAvatarData, setAvatarPreset, setAvatarPhoto,
  type AvatarData,
} from '../../services/avatar.firestore';
import { Fonts } from '../../constants/fonts';

/* ── Level colors (index = level - 1) ── */
const LEVEL_COLORS = ['#9ca3af', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

/* ── Avatar presets ── */
type Preset = { id: string; label: string; icon: string; color: string; bg: string };

const PRESETS: Preset[] = [
  { id: 'fitness_freak', label: 'Fitness Freak', icon: 'run',            color: '#22c55e', bg: '#f0fdf4' },
  { id: 'bulker',        label: 'Bulker',         icon: 'dumbbell',       color: '#f97316', bg: '#fff7ed' },
  { id: 'yogi',          label: 'Yogi',           icon: 'meditation',     color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'nutrition',     label: 'Nutrition Nerd', icon: 'food-apple',     color: '#14b8a6', bg: '#f0fdfa' },
  { id: 'athlete',       label: 'Athlete',        icon: 'lightning-bolt', color: '#3b82f6', bg: '#eff6ff' },
];

function getPreset(id: string | null): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const gamData = useGamificationStore((s) => s.data);

  const [avatar, setAvatar] = useState<AvatarData | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAvatar = useCallback(async () => {
    if (!user?.id) return;
    // show cached version instantly, then refresh from Firestore in background
    const cached = await getCachedAvatarData(user.id);
    if (cached) setAvatar(cached);
    const fresh = await getAvatarData(user.id);
    setAvatar(fresh);
  }, [user?.id]);

  useEffect(() => { loadAvatar(); }, [loadAvatar]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.email) { Alert.alert('Error', 'User email not found'); return; }
              await authAPI.deleteUserByEmail(user.email);
              await logout();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const pickPreset = async (preset: Preset) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await setAvatarPreset(user.id, preset.id);
      setAvatar((prev) => prev ? { ...prev, presetId: preset.id, photoBase64: null } : null);
    } finally {
      setSaving(false);
      setPickerOpen(false);
    }
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo library access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    if (!user?.id) return;
    setSaving(true);
    try {
      const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await setAvatarPhoto(user.id, b64);
      setAvatar((prev) => prev ? { ...prev, presetId: null, photoBase64: b64 } : null);
    } finally {
      setSaving(false);
      setPickerOpen(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const activePreset = getPreset(avatar?.presetId ?? null);
  const levelInfo = gamData ? getLevelInfo(gamData.totalXP) : null;
  const levelColor = levelInfo ? LEVEL_COLORS[levelInfo.current.level - 1] : '#9ca3af';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          {/* Avatar */}
          <TouchableOpacity onPress={() => setPickerOpen(true)} activeOpacity={0.85} style={styles.avatarWrap}>
            <View style={[styles.avatarRing, { borderColor: activePreset?.color ?? '#22c55e' }]}>
              {avatar?.photoBase64 ? (
                <Image source={{ uri: avatar.photoBase64 }} style={styles.avatarPhoto} />
              ) : activePreset ? (
                <View style={[styles.avatarInner, { backgroundColor: activePreset.bg }]}>
                  <MaterialCommunityIcons name={activePreset.icon as any} size={38} color={activePreset.color} />
                </View>
              ) : (
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={[styles.editBadge, { backgroundColor: activePreset?.color ?? '#22c55e' }]}>
              <Ionicons name="camera" size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Name + email */}
          <View style={styles.headerInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.fullName ?? 'Your Profile'}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>

            {/* Level pill */}
            {levelInfo && (
              <View style={[styles.levelPill, { backgroundColor: levelColor + '18' }]}>
                <MaterialCommunityIcons name="trophy" size={13} color={levelColor} />
                <Text style={[styles.levelPillText, { color: levelColor }]}>
                  Level {levelInfo.current.level} · {levelInfo.current.label}
                </Text>
                <View style={[styles.xpDot, { backgroundColor: levelColor }]} />
                <Text style={[styles.levelPillXP, { color: levelColor }]}>
                  {gamData?.totalXP ?? 0} XP
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Macro goals (2×2 grid) ── */}
        <Text style={styles.sectionLabel}>DAILY GOALS</Text>
        <View style={styles.macroGrid}>
          <MacroCard
            icon="flame-outline" color="#ef4444" bg="#fff5f5"
            label="Calories" value={`${user?.daily_calorie_goal ?? 2000}`} unit="kcal"
          />
          <MacroCard
            icon="barbell-outline" color="#3b82f6" bg="#eff6ff"
            label="Protein" value={`${user?.daily_protein_goal ?? 120}`} unit="g"
          />
          <MacroCard
            icon="leaf-outline" color="#f59e0b" bg="#fffbeb"
            label="Carbs" value={`${user?.daily_carbs_goal ?? 250}`} unit="g"
          />
          <MacroCard
            icon="water-outline" color="#8b5cf6" bg="#f5f3ff"
            label="Fat" value={`${user?.daily_fat_goal ?? 65}`} unit="g"
          />
        </View>

        {/* ── Account ── */}
        <Section label="ACCOUNT">
          <SettingRow
            icon="create-outline" iconBg="#f0fdf4" iconColor="#22c55e"
            label="Edit Profile" sub="Goals, weight, health info"
            onPress={() => router.push('/edit-profile')} showChevron
          />
          <Divider />
          <SettingRow
            icon="trophy-outline" iconBg="#fefce8" iconColor="#f59e0b"
            label="Progress" sub="Streaks, XP and level"
            onPress={() => router.push('/(tabs)/gamification')} showChevron
          />
          <Divider />
          <SettingRow
            icon="chatbubble-outline" iconBg="#eff6ff" iconColor="#3b82f6"
            label="Send Feedback" sub="Help us improve SehatGuru"
            onPress={() => router.push('/(tabs)/feedback')} showChevron
          />
        </Section>

        {/* ── Danger zone ── */}
        <Section label="DANGER ZONE">
          <SettingRow
            icon="log-out-outline" iconBg="#fff1f2" iconColor="#ef4444"
            label="Logout" onPress={handleLogout}
          />
          <Divider />
          <SettingRow
            icon="trash-outline" iconBg="#fff1f2" iconColor="#ef4444"
            label="Delete Account" sub="Permanently remove all your data"
            onPress={handleDeleteAccount} labelColor="#ef4444"
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Avatar picker modal ── */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Choose Avatar</Text>

          <View style={styles.presetGrid}>
            {PRESETS.map((p) => {
              const active = avatar?.presetId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.presetCell, active && { borderColor: p.color, borderWidth: 2.5 }]}
                  onPress={() => pickPreset(p)}
                  activeOpacity={0.8}
                  disabled={saving}
                >
                  <View style={[styles.presetCircle, { backgroundColor: p.bg }]}>
                    <MaterialCommunityIcons name={p.icon as any} size={32} color={p.color} />
                    {active && (
                      <View style={[styles.presetCheck, { backgroundColor: p.color }]}>
                        <MaterialCommunityIcons name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.presetCellLabel, active && { color: p.color, fontWeight: '700' }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.modalDivider} />

          <TouchableOpacity style={styles.uploadRow} onPress={pickPhoto} disabled={saving} activeOpacity={0.8}>
            <View style={styles.uploadIcon}>
              <Ionicons name="image-outline" size={20} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadLabel}>Upload from Gallery</Text>
              <Text style={styles.uploadSub}>Use your own photo</Text>
            </View>
            {avatar?.photoBase64 && <View style={styles.uploadActiveDot} />}
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>

          {saving && (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={styles.savingText}>Saving…</Text>
            </View>
          )}

          <View style={{ height: 24 }} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ── Sub-components ── */
function MacroCard({ icon, color, bg, label, value, unit }: {
  icon: any; color: string; bg: string; label: string; value: string; unit: string;
}) {
  return (
    <View style={[styles.macroCard, { borderLeftColor: color }]}>
      <View style={[styles.macroIconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.macroValue, { color }]}>{value}<Text style={styles.macroUnit}> {unit}</Text></Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingRow({ icon, iconBg, iconColor, label, sub, onPress, showChevron, labelColor }: {
  icon: any; iconBg: string; iconColor: string; label: string;
  sub?: string; onPress: () => void; showChevron?: boolean; labelColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, labelColor ? { color: labelColor } : {}]}>{label}</Text>
        {sub && <Text style={styles.settingSub}>{sub}</Text>}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={16} color="#d1d5db" />}
    </TouchableOpacity>
  );
}

/* ── Styles ── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6FA' },
  scroll: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 40 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  avatarWrap: { position: 'relative' },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  avatarInner: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarPhoto: { width: 68, height: 68, borderRadius: 34 },
  avatarInitials: { fontSize: 24, fontWeight: '800', color: '#22c55e', fontFamily: Fonts.extrabold },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  headerInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 18, fontWeight: '800', color: '#111', fontFamily: Fonts.extrabold },
  userEmail: { fontSize: 12, color: '#9ca3af', fontFamily: Fonts.regular },
  levelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginTop: 6,
  },
  levelPillText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.bold },
  xpDot: { width: 3, height: 3, borderRadius: 2, opacity: 0.6 },
  levelPillXP: { fontSize: 12, fontWeight: '600', opacity: 0.85, fontFamily: Fonts.semibold },

  /* Macro 2×2 grid */
  macroGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, marginBottom: 16,
  },
  macroCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 16, padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#F0F0F0',
    gap: 6,
  },
  macroIconBox: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  macroValue: { fontSize: 20, fontWeight: '800', fontFamily: Fonts.extrabold },
  macroUnit: { fontSize: 13, fontWeight: '500', color: '#9ca3af', fontFamily: Fonts.medium },
  macroLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.semibold },

  /* Section */
  section: { marginBottom: 14 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 1.2, marginBottom: 8, paddingLeft: 4, textTransform: 'uppercase', fontFamily: Fonts.bold,
  },

  /* Card */
  card: {
    backgroundColor: '#fff', borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 62 },

  /* Setting row */
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  settingIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#111', fontFamily: Fonts.semibold },
  settingSub: { fontSize: 12, color: '#9ca3af', marginTop: 2, fontFamily: Fonts.regular },

  /* Modal */
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 20, fontFamily: Fonts.extrabold },
  presetGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between',
    marginBottom: 20,
  },
  presetCell: {
    width: '18%', alignItems: 'center', gap: 6,
    borderRadius: 16, padding: 6, borderColor: 'transparent', borderWidth: 2.5,
  },
  presetCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  presetCheck: {
    position: 'absolute', top: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  presetCellLabel: { fontSize: 10, color: '#6b7280', fontWeight: '500', textAlign: 'center', fontFamily: Fonts.medium },
  modalDivider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 },
  uploadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
    backgroundColor: '#f8fafc', borderRadius: 14,
  },
  uploadIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadLabel: { fontSize: 15, fontWeight: '600', color: '#111', fontFamily: Fonts.semibold },
  uploadSub: { fontSize: 12, color: '#9ca3af', marginTop: 2, fontFamily: Fonts.regular },
  uploadActiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  savingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingTop: 12,
  },
  savingText: { fontSize: 13, color: '#9ca3af', fontFamily: Fonts.regular },
});
