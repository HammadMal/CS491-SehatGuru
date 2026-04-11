import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/auth.api';

const ACTIVITY_LABELS: Record<string, string> = {
  'sedentary': 'Sedentary',
  'lightly-active': 'Lightly Active',
  'moderately-active': 'Moderately Active',
  'very-active': 'Very Active',
  'extra-active': 'Extra Active',
};

const GOAL_LABELS: Record<string, string> = {
  'lose-weight': 'Lose Weight',
  'maintain-weight': 'Maintain Weight',
  'gain-weight': 'Gain Weight',
  'build-muscle': 'Build Muscle',
  'improve-health': 'Improve Health',
  'manage-condition': 'Manage Condition',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  const handleDeleteAccount = async () => {
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

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Avatar + name ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.fullName ?? 'Your Profile'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* ── Goals strip ── */}
        <View style={styles.goalsStrip}>
          <GoalPill icon="flame-outline" color="#ef4444" label="Calories" value={`${user?.daily_calorie_goal ?? 2000} kcal`} />
          <GoalPill icon="leaf-outline" color="#f59e0b" label="Carbs" value={`${user?.daily_carbs_goal ?? 250}g`} />
          <GoalPill icon="barbell-outline" color="#3b82f6" label="Protein" value={`${user?.daily_protein_goal ?? 120}g`} />
          <GoalPill icon="water-outline" color="#8b5cf6" label="Fat" value={`${user?.daily_fat_goal ?? 65}g`} />
        </View>

        {/* ── Settings list ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            <SettingRow
              icon="create-outline"
              iconBg="#f0fdf4"
              iconColor="#22c55e"
              label="Edit Profile"
              sub="Update goals, weight, health info"
              onPress={() => router.push('/edit-profile')}
              showChevron
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DANGER ZONE</Text>
          <View style={styles.card}>
            <SettingRow
              icon="log-out-outline"
              iconBg="#fff1f2"
              iconColor="#ef4444"
              label="Logout"
              onPress={handleLogout}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="trash-outline"
              iconBg="#fff1f2"
              iconColor="#ef4444"
              label="Delete Account"
              sub="Permanently delete all your data"
              onPress={handleDeleteAccount}
              labelColor="#ef4444"
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Sub-components ── */
const GoalPill = ({ icon, color, label, value }: { icon: any; color: string; label: string; value: string }) => (
  <View style={styles.goalPill}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.goalPillValue, { color }]}>{value}</Text>
    <Text style={styles.goalPillLabel}>{label}</Text>
  </View>
);

const SettingRow = ({
  icon, iconBg, iconColor, label, sub, onPress, showChevron, labelColor,
}: {
  icon: any; iconBg: string; iconColor: string; label: string;
  sub?: string; onPress: () => void; showChevron?: boolean; labelColor?: string;
}) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.settingLabel, labelColor ? { color: labelColor } : {}]}>{label}</Text>
      {sub && <Text style={styles.settingSub}>{sub}</Text>}
    </View>
    {showChevron && <Ionicons name="chevron-forward" size={16} color="#ccc" />}
  </TouchableOpacity>
);

/* ── Styles ── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6FA' },
  scroll: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 40 },

  /* Avatar */
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarRing: {
    width: 94, height: 94, borderRadius: 47,
    borderWidth: 3, borderColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 28, fontWeight: '800', color: '#22c55e' },
  userName: { fontSize: 20, fontWeight: '800', color: '#111', textAlign: 'center' },
  userEmail: { fontSize: 13, color: '#888', marginTop: 4, textAlign: 'center' },

  /* Goals strip */
  goalsStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  goalPill: { alignItems: 'center', gap: 4 },
  goalPillValue: { fontSize: 13, fontWeight: '800' },
  goalPillLabel: { fontSize: 10, color: '#aaa', fontWeight: '500' },

  /* Section */
  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#aaa',
    letterSpacing: 1, marginBottom: 8, paddingLeft: 4,
  },

  /* Cards */
  card: {
    backgroundColor: '#fff', borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 58 },

  /* Setting row */
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#111' },
  settingSub: { fontSize: 12, color: '#888', marginTop: 2 },
});
