import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomInput } from '../components/auth/CustomInput';
import { useAuth } from '../hooks/useAuth';
import { userAPI } from '../services/user.api';
import { OnboardingContext } from '../context/OnboardingContext';
import { validateName, validateHeight, validateWeight, validateAge } from '../utils/validation';
import type { ActivityLevel, HealthGoal } from '../types/onboarding.types';

/* ── Static data (mirrors onboarding screens) ── */
const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; desc: string; icon: any }[] = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise', icon: 'bed-outline' },
    { value: 'lightly-active', label: 'Lightly Active', desc: 'Exercise 1–3 times per week', icon: 'walk-outline' },
    { value: 'moderately-active', label: 'Moderately Active', desc: 'Exercise 4–5 times per week', icon: 'bicycle-outline' },
    { value: 'very-active', label: 'Very Active', desc: 'Intense exercise 6–7 times per week', icon: 'barbell-outline' },
    { value: 'extra-active', label: 'Extra Active', desc: 'Very intense exercise / physical job', icon: 'flash-outline' },
];

const HEALTH_GOALS: { value: HealthGoal; label: string; icon: any }[] = [
    { value: 'lose-weight', label: 'Lose Weight', icon: 'trending-down-outline' },
    { value: 'maintain-weight', label: 'Maintain Weight', icon: 'remove-outline' },
    { value: 'gain-weight', label: 'Gain Weight', icon: 'trending-up-outline' },
    { value: 'build-muscle', label: 'Build Muscle', icon: 'barbell-outline' },
    { value: 'improve-health', label: 'Improve Health', icon: 'heart-outline' },
    { value: 'manage-condition', label: 'Manage Condition', icon: 'medkit-outline' },
];

export default function EditProfileScreen() {
    const { refreshUserGoals } = useAuth();
    const onboardingContext = React.useContext(OnboardingContext);

    /* form state */
    const [fullName, setFullName] = useState('');
    const [height, setHeight] = useState('');
    const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
    const [weight, setWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer-not-to-say' | ''>('');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>('');
    const [healthGoals, setHealthGoals] = useState<HealthGoal[]>([]);

    const [errors, setErrors] = useState({ fullName: null as string | null, height: null as string | null, weight: null as string | null, age: null as string | null });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    /* load current profile on mount */
    useEffect(() => {
        (async () => {
            try {
                const profile = await userAPI.getProfile();
                if (profile) {
                    setFullName(profile.basicInfo.fullName);
                    setHeight(profile.basicInfo.height);
                    setHeightUnit(profile.basicInfo.heightUnit);
                    setWeight(profile.basicInfo.weight);
                    setWeightUnit(profile.basicInfo.weightUnit);
                    setAge(profile.basicInfo.age);
                    setGender(profile.basicInfo.gender as any);
                    setActivityLevel(profile.activityLevel as any);
                    setHealthGoals(profile.healthGoals as any);
                }
            } catch (err) {
                console.error('Failed to load profile:', err);
            } finally {
                setFetching(false);
            }
        })();
    }, []);

    const toggleGoal = (goal: HealthGoal) => {
        setHealthGoals((prev) =>
            prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
        );
    };

    const handleSave = async () => {
        const newErrors = {
            fullName: validateName(fullName),
            height: validateHeight(height, heightUnit),
            weight: validateWeight(weight, weightUnit),
            age: validateAge(age),
        };
        setErrors(newErrors);
        if (Object.values(newErrors).some(Boolean)) return;
        if (!activityLevel) { Alert.alert('Please select an activity level'); return; }
        if (healthGoals.length === 0) { Alert.alert('Please select at least one health goal'); return; }

        setLoading(true);
        try {
            await userAPI.updateProfile({
                basicInfo: { fullName, height, heightUnit, weight, weightUnit, age, gender },
                activityLevel: activityLevel as ActivityLevel,
                healthGoals,
            });

            /* refresh calorie/macro goals in auth context */
            await refreshUserGoals();

            /* refresh onboarding data in context + AsyncStorage so chatbot picks up new preferences immediately */
            await onboardingContext?.refreshOnboardingData();

            Alert.alert('Profile Updated! 🎉', 'Your calorie and macro goals have been recalculated.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.detail || 'Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <SafeAreaView style={styles.safe}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color="#22c55e" />
                    <Text style={styles.loadingText}>Loading your profile…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

                    {/* ── Header ── */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={20} color="#333" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heading}>Edit Profile</Text>
                            <Text style={styles.subheading}>Changes recalculate your goals</Text>
                        </View>
                    </View>

                    {/* ── Section: Personal Info ── */}
                    <SectionCard title="Personal Information" icon="person-outline">
                        <CustomInput
                            label="Full Name"
                            placeholder="Your full name"
                            value={fullName}
                            onChangeText={(t) => { setFullName(t); setErrors({ ...errors, fullName: null }); }}
                            error={errors.fullName}
                        />

                        {/* Height */}
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <CustomInput
                                    label="Height"
                                    placeholder="0"
                                    value={height}
                                    onChangeText={(t) => { setHeight(t); setErrors({ ...errors, height: null }); }}
                                    error={errors.height}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            <View style={styles.unitToggle}>
                                <Text style={styles.unitToggleLabel}>Unit</Text>
                                <View style={styles.unitBtns}>
                                    {(['cm', 'ft'] as const).map((u) => (
                                        <TouchableOpacity key={u} style={[styles.unitBtn, heightUnit === u && styles.unitBtnActive]} onPress={() => setHeightUnit(u)}>
                                            <Text style={[styles.unitBtnText, heightUnit === u && styles.unitBtnTextActive]}>{u}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Weight */}
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <CustomInput
                                    label="Weight"
                                    placeholder="0"
                                    value={weight}
                                    onChangeText={(t) => { setWeight(t); setErrors({ ...errors, weight: null }); }}
                                    error={errors.weight}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            <View style={styles.unitToggle}>
                                <Text style={styles.unitToggleLabel}>Unit</Text>
                                <View style={styles.unitBtns}>
                                    {(['kg', 'lbs'] as const).map((u) => (
                                        <TouchableOpacity key={u} style={[styles.unitBtn, weightUnit === u && styles.unitBtnActive]} onPress={() => setWeightUnit(u)}>
                                            <Text style={[styles.unitBtnText, weightUnit === u && styles.unitBtnTextActive]}>{u}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <CustomInput
                            label="Age"
                            placeholder="Your age"
                            value={age}
                            onChangeText={(t) => { setAge(t); setErrors({ ...errors, age: null }); }}
                            error={errors.age}
                            keyboardType="number-pad"
                        />

                        {/* Gender */}
                        <Text style={styles.fieldLabel}>Gender</Text>
                        <View style={styles.chipRow}>
                            {[
                                { value: 'male', label: 'Male' },
                                { value: 'female', label: 'Female' },
                                { value: 'other', label: 'Other' },
                                { value: 'prefer-not-to-say', label: 'Prefer not to say' },
                            ].map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.chip, gender === opt.value && styles.chipActive]}
                                    onPress={() => setGender(opt.value as any)}
                                >
                                    <Text style={[styles.chipText, gender === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </SectionCard>

                    {/* ── Section: Activity Level ── */}
                    <SectionCard title="Activity Level" icon="walk-outline">
                        {ACTIVITY_LEVELS.map((level) => (
                            <TouchableOpacity
                                key={level.value}
                                style={[styles.optionCard, activityLevel === level.value && styles.optionCardActive]}
                                onPress={() => setActivityLevel(level.value)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.optionIcon, activityLevel === level.value && styles.optionIconActive]}>
                                    <Ionicons name={level.icon} size={18} color={activityLevel === level.value ? '#fff' : '#555'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.optionTitle, activityLevel === level.value && styles.optionTitleActive]}>{level.label}</Text>
                                    <Text style={[styles.optionDesc, activityLevel === level.value && styles.optionDescActive]}>{level.desc}</Text>
                                </View>
                                {activityLevel === level.value && <Ionicons name="checkmark-circle" size={20} color="#22c55e" />}
                            </TouchableOpacity>
                        ))}
                    </SectionCard>

                    {/* ── Section: Health Goals ── */}
                    <SectionCard title="Health Goals" icon="fitness-outline">
                        <Text style={styles.multiSelectHint}>Select one or more</Text>
                        <View style={styles.goalGrid}>
                            {HEALTH_GOALS.map((goal) => {
                                const selected = healthGoals.includes(goal.value);
                                return (
                                    <TouchableOpacity
                                        key={goal.value}
                                        style={[styles.goalCard, selected && styles.goalCardActive]}
                                        onPress={() => toggleGoal(goal.value)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name={goal.icon} size={20} color={selected ? '#22c55e' : '#aaa'} />
                                        <Text style={[styles.goalLabel, selected && styles.goalLabelActive]}>{goal.label}</Text>
                                        {selected && <View style={styles.goalCheck}><Ionicons name="checkmark" size={11} color="#fff" /></View>}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </SectionCard>

                    {/* ── Save button ── */}
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <>
                                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </>
                        }
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/* ── Helper component ── */
const SectionCard = ({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
                <Ionicons name={icon} size={16} color="#22c55e" />
            </View>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {children}
    </View>
);

/* ── Styles ── */
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F3F6FA' },
    scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

    loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#888' },

    /* Header */
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingTop: 4 },
    backBtn: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#E8EDF2',
    },
    heading: { fontSize: 20, fontWeight: '800', color: '#111' },
    subheading: { fontSize: 12, color: '#888', marginTop: 2 },

    /* Section card */
    sectionCard: {
        backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
        borderWidth: 1, borderColor: '#F0F0F0',
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionIconBadge: {
        width: 30, height: 30, borderRadius: 9, backgroundColor: '#f0fdf4',
        alignItems: 'center', justifyContent: 'center',
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111' },

    /* Row + unit toggle */
    row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    unitToggle: { width: 90, marginTop: 2 },
    unitToggleLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
    unitBtns: { flexDirection: 'row', gap: 6 },
    unitBtn: {
        flex: 1, paddingVertical: 12, borderRadius: 10,
        borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center',
    },
    unitBtnActive: { borderColor: '#22c55e', backgroundColor: '#22c55e' },
    unitBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
    unitBtnTextActive: { color: '#fff' },

    /* Gender chips */
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 4 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip: {
        paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
        borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
    },
    chipActive: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#666' },
    chipTextActive: { color: '#22c55e' },

    /* Activity level option cards */
    optionCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: 12, padding: 12, marginBottom: 8,
        borderWidth: 1, borderColor: '#E8EDF2', backgroundColor: '#F9FAFB',
    },
    optionCardActive: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
    optionIcon: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8EDF2',
        alignItems: 'center', justifyContent: 'center',
    },
    optionIconActive: { backgroundColor: '#22c55e' },
    optionTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
    optionTitleActive: { color: '#16a34a' },
    optionDesc: { fontSize: 12, color: '#888', marginTop: 2 },
    optionDescActive: { color: '#4ade80' },

    /* Health goal grid */
    multiSelectHint: { fontSize: 12, color: '#aaa', marginBottom: 12, marginTop: -4 },
    goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    goalCard: {
        width: '47%', padding: 14, borderRadius: 14, alignItems: 'center', gap: 6,
        borderWidth: 1.5, borderColor: '#E8EDF2', backgroundColor: '#F9FAFB', position: 'relative',
    },
    goalCardActive: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
    goalLabel: { fontSize: 12, fontWeight: '600', color: '#555', textAlign: 'center' },
    goalLabelActive: { color: '#16a34a' },
    goalCheck: {
        position: 'absolute', top: 6, right: 6, width: 16, height: 16,
        borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
    },

    /* Save button */
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 16, marginTop: 8,
        shadowColor: '#22c55e', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
