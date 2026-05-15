import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomInput } from '../components/auth/CustomInput';
import { Checkbox } from '../components/auth/Checkbox';
import { useAuth } from '../hooks/useAuth';
import { userAPI } from '../services/user.api';
import { OnboardingContext } from '../context/OnboardingContext';
import { validateName, validateHeight, validateWeight, validateAge } from '../utils/validation';
import type { ActivityLevel, HealthGoal } from '../types/onboarding.types';
import { Fonts } from '../constants/fonts';
import { ConfirmModal } from '../components/ConfirmModal';

const PRESET_CONDITIONS = ['Diabetes', 'Hypertension', 'High Cholesterol', 'PCOS', 'Thyroid'];

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
    const [mealPreferences, setMealPreferences] = useState({ breakfast: true, lunch: true, dinner: true, snacks: false });
    const [dietaryPreferences, setDietaryPreferences] = useState({ vegetarian: false, vegan: false, glutenFree: false, other: '', medicalConditions: [] as string[] });
    const [customCondition, setCustomCondition] = useState('');

    const [errors, setErrors] = useState({ fullName: null as string | null, height: null as string | null, weight: null as string | null, age: null as string | null });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [infoModal, setInfoModal] = useState<{ title: string; message: string; variant: 'info' | 'danger'; onConfirm?: () => void } | null>(null);

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
                    if (profile.mealPreferences) setMealPreferences(profile.mealPreferences);
                    if (profile.dietaryPreferences) setDietaryPreferences({
                        ...profile.dietaryPreferences,
                        medicalConditions: profile.dietaryPreferences.medicalConditions ?? [],
                    });
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
        if (!activityLevel) {
            setInfoModal({ title: 'Activity Level Required', message: 'Please select an activity level before saving.', variant: 'info' });
            return;
        }
        if (healthGoals.length === 0) {
            setInfoModal({ title: 'Health Goal Required', message: 'Please select at least one health goal before saving.', variant: 'info' });
            return;
        }

        setLoading(true);
        try {
            await userAPI.updateProfile({
                basicInfo: { fullName, height, heightUnit, weight, weightUnit, age, gender },
                activityLevel: activityLevel as ActivityLevel,
                healthGoals,
                mealPreferences,
                dietaryPreferences,
            });

            /* refresh calorie/macro goals in auth context */
            await refreshUserGoals();

            /* refresh onboarding data in context + AsyncStorage so chatbot picks up new preferences immediately */
            await onboardingContext?.refreshOnboardingData();

            setInfoModal({
                title: 'Profile Updated! 🎉',
                message: 'Your calorie and macro goals have been recalculated based on your new profile.',
                variant: 'info',
                onConfirm: () => { setInfoModal(null); router.back(); },
            });
        } catch (err: any) {
            setInfoModal({
                title: 'Update Failed',
                message: err?.response?.data?.detail || 'Failed to update profile. Please try again.',
                variant: 'danger',
            });
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

                    {/* ── Section: Medical Conditions (only when manage-condition selected) ── */}
                    {healthGoals.includes('manage-condition') && (
                        <SectionCard title="Medical Conditions" icon="medkit-outline">
                            <Text style={styles.multiSelectHint}>Select presets or add your own</Text>
                            <View style={styles.chipRow}>
                                {PRESET_CONDITIONS.map((c) => {
                                    const active = dietaryPreferences.medicalConditions.includes(c);
                                    return (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.chip, active && styles.chipActive]}
                                            onPress={() => setDietaryPreferences((prev) => ({
                                                ...prev,
                                                medicalConditions: active
                                                    ? prev.medicalConditions.filter((x) => x !== c)
                                                    : [...prev.medicalConditions, c],
                                            }))}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.customRow}>
                                <TextInput
                                    style={styles.customInput}
                                    placeholder="e.g. IBS, Crohn's, GERD…"
                                    placeholderTextColor="#aaa"
                                    value={customCondition}
                                    onChangeText={setCustomCondition}
                                    onSubmitEditing={() => {
                                        const t = customCondition.trim();
                                        if (t && !dietaryPreferences.medicalConditions.includes(t)) {
                                            setDietaryPreferences((prev) => ({ ...prev, medicalConditions: [...prev.medicalConditions, t] }));
                                        }
                                        setCustomCondition('');
                                    }}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity
                                    style={[styles.addBtn, !customCondition.trim() && styles.addBtnDisabled]}
                                    disabled={!customCondition.trim()}
                                    onPress={() => {
                                        const t = customCondition.trim();
                                        if (t && !dietaryPreferences.medicalConditions.includes(t)) {
                                            setDietaryPreferences((prev) => ({ ...prev, medicalConditions: [...prev.medicalConditions, t] }));
                                        }
                                        setCustomCondition('');
                                    }}
                                >
                                    <Ionicons name="add" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {dietaryPreferences.medicalConditions.filter((c) => !PRESET_CONDITIONS.includes(c)).length > 0 && (
                                <View style={styles.chipRow}>
                                    {dietaryPreferences.medicalConditions
                                        .filter((c) => !PRESET_CONDITIONS.includes(c))
                                        .map((c) => (
                                            <TouchableOpacity
                                                key={c}
                                                style={[styles.chip, styles.chipActive]}
                                                onPress={() => setDietaryPreferences((prev) => ({
                                                    ...prev,
                                                    medicalConditions: prev.medicalConditions.filter((x) => x !== c),
                                                }))}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.chipText, styles.chipTextActive]}>{c}</Text>
                                                <Ionicons name="close" size={13} color="#22c55e" style={{ marginLeft: 4 }} />
                                            </TouchableOpacity>
                                        ))}
                                </View>
                            )}
                        </SectionCard>
                    )}

                    {/* ── Section: Meal Preferences ── */}
                    <SectionCard title="Meal Preferences" icon="restaurant-outline">
                        <Text style={styles.multiSelectHint}>Which meals do you typically eat?</Text>
                        {([
                            { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
                            { key: 'lunch',     label: 'Lunch',     icon: 'partly-sunny-outline' },
                            { key: 'dinner',    label: 'Dinner',    icon: 'moon-outline' },
                            { key: 'snacks',    label: 'Snacks',    icon: 'cafe-outline' },
                        ] as const).map((meal) => (
                            <Checkbox
                                key={meal.key}
                                label={meal.label}
                                checked={mealPreferences[meal.key]}
                                onToggle={() => setMealPreferences({ ...mealPreferences, [meal.key]: !mealPreferences[meal.key] })}
                            />
                        ))}
                    </SectionCard>

                    {/* ── Section: Dietary Preferences ── */}
                    <SectionCard title="Dietary Preferences" icon="leaf-outline">
                        <Text style={styles.multiSelectHint}>Select any that apply</Text>
                        <Checkbox
                            label="Vegetarian"
                            checked={dietaryPreferences.vegetarian}
                            onToggle={() => setDietaryPreferences({ ...dietaryPreferences, vegetarian: !dietaryPreferences.vegetarian })}
                        />
                        <Checkbox
                            label="Vegan"
                            checked={dietaryPreferences.vegan}
                            onToggle={() => setDietaryPreferences({ ...dietaryPreferences, vegan: !dietaryPreferences.vegan })}
                        />
                        <Checkbox
                            label="Gluten Free"
                            checked={dietaryPreferences.glutenFree}
                            onToggle={() => setDietaryPreferences({ ...dietaryPreferences, glutenFree: !dietaryPreferences.glutenFree })}
                        />
                        <CustomInput
                            label="Other restrictions"
                            placeholder="e.g. dairy-free, nut allergy…"
                            value={dietaryPreferences.other}
                            onChangeText={(t) => setDietaryPreferences({ ...dietaryPreferences, other: t })}
                        />
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

            <ConfirmModal
                visible={!!infoModal}
                title={infoModal?.title ?? ''}
                message={infoModal?.message ?? ''}
                variant={infoModal?.variant ?? 'info'}
                confirmLabel="OK"
                cancelLabel={null}
                icon={infoModal?.variant === 'danger' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                onConfirm={infoModal?.onConfirm ?? (() => setInfoModal(null))}
                onCancel={() => setInfoModal(null)}
            />
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
    loadingText: { fontSize: 14, color: '#888', fontFamily: Fonts.regular },

    /* Header */
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingTop: 4 },
    backBtn: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#E8EDF2',
    },
    heading: { fontSize: 20, fontWeight: '800', color: '#111', fontFamily: Fonts.extrabold },
    subheading: { fontSize: 12, color: '#888', marginTop: 2, fontFamily: Fonts.regular },

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
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', fontFamily: Fonts.bold },

    /* Row + unit toggle */
    row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    unitToggle: { width: 90, marginTop: 2 },
    unitToggleLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, fontFamily: Fonts.semibold },
    unitBtns: { flexDirection: 'row', gap: 6 },
    unitBtn: {
        flex: 1, paddingVertical: 12, borderRadius: 10,
        borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center',
    },
    unitBtnActive: { borderColor: '#22c55e', backgroundColor: '#22c55e' },
    unitBtnText: { fontSize: 13, fontWeight: '600', color: '#666', fontFamily: Fonts.semibold },
    unitBtnTextActive: { color: '#fff' },

    /* Gender chips */
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 4, fontFamily: Fonts.semibold },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip: {
        paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
        borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
    },
    chipActive: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#666', fontFamily: Fonts.semibold },
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
    optionTitle: { fontSize: 14, fontWeight: '700', color: '#111', fontFamily: Fonts.bold },
    optionTitleActive: { color: '#16a34a' },
    optionDesc: { fontSize: 12, color: '#888', marginTop: 2, fontFamily: Fonts.regular },
    optionDescActive: { color: '#4ade80' },

    /* Health goal grid */
    multiSelectHint: { fontSize: 12, color: '#aaa', marginBottom: 12, marginTop: -4, fontFamily: Fonts.regular },
    goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    goalCard: {
        width: '47%', padding: 14, borderRadius: 14, alignItems: 'center', gap: 6,
        borderWidth: 1.5, borderColor: '#E8EDF2', backgroundColor: '#F9FAFB', position: 'relative',
    },
    goalCardActive: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
    goalLabel: { fontSize: 12, fontWeight: '600', color: '#555', textAlign: 'center', fontFamily: Fonts.semibold },
    goalLabelActive: { color: '#16a34a' },
    goalCheck: {
        position: 'absolute', top: 6, right: 6, width: 16, height: 16,
        borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
    },

    /* Medical conditions custom input */
    customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    customInput: {
        flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
        paddingHorizontal: 12, fontSize: 14, fontFamily: Fonts.regular, color: '#111',
        backgroundColor: '#F9FAFB',
    },
    addBtn: {
        width: 42, height: 42, borderRadius: 10, backgroundColor: '#22c55e',
        alignItems: 'center', justifyContent: 'center',
    },
    addBtnDisabled: { backgroundColor: '#E5E7EB' },

    /* Save button */
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 16, marginTop: 8,
        shadowColor: '#22c55e', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', fontFamily: Fonts.extrabold },
});
