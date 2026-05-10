import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMealStore } from '../store/useMealStore';
import { useAuth } from '../hooks/useAuth';
import * as Crypto from 'expo-crypto';
import { saveMealToFirestore } from '../services/meals.firestore';
import {
    searchIngredients,
    saveCustomDish,
    type IngredientResult,
    type CustomDishIngredient,
} from '../services/custom-dish.api';
import type { MealType } from '../types/meal.types';
import { Fonts } from '../constants/fonts';
import { ConfirmModal } from '../components/ConfirmModal';

// ── Types ────────────────────────────────────────────────────────────────────
interface BasketItem {
    food_name: string;
    grams: number;
    // scaled per-gram nutrients
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    // full raw 100g values for later scaling
    raw: IngredientResult;
}

const MEAL_META: Record<string, { icon: any; color: string; bg: string }> = {
    Breakfast: { icon: 'sunny-outline', color: '#f59e0b', bg: '#fffbeb' },
    Lunch: { icon: 'restaurant-outline', color: '#22c55e', bg: '#f0fdf4' },
    Dinner: { icon: 'moon-outline', color: '#6366f1', bg: '#eef2ff' },
    Snack: { icon: 'cafe-outline', color: '#ec4899', bg: '#fdf2f8' },
};

// ── Main screen ──────────────────────────────────────────────────────────────
export default function CustomDishScreen() {
    const { mealType: urlMealType } = useLocalSearchParams<{ mealType?: string }>();
    const currentMealType = urlMealType || 'Dinner';
    const meta = MEAL_META[currentMealType] || MEAL_META.Dinner;

    const [dishName, setDishName] = useState('');
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<IngredientResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [basket, setBasket] = useState<BasketItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [infoModal, setInfoModal] = useState<{ title: string; message: string; variant: 'info' | 'danger'; onConfirm?: () => void } | null>(null);

    // Gram-picker modal
    const [pendingIngredient, setPendingIngredient] = useState<IngredientResult | null>(null);
    const [gramInput, setGramInput] = useState('100');

    const { addMeal } = useMealStore();
    const { user } = useAuth();

    // Debounced search
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearchChange = (text: string) => {
        setSearch(text);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (!text.trim()) { setResults([]); return; }
        debounceTimer.current = setTimeout(async () => {
            setSearching(true);
            try {
                const data = await searchIngredients(text.trim(), 25);
                setResults(data);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    // Add ingredient to basket
    const confirmAddIngredient = () => {
        if (!pendingIngredient) return;
        const grams = Math.max(1, parseFloat(gramInput) || 100);
        const factor = grams / 100;
        setBasket(prev => [
            ...prev,
            {
                food_name: pendingIngredient.food_name,
                grams,
                calories: (pendingIngredient.energy_kcal ?? 0) * factor,
                carbs: (pendingIngredient.carb_g ?? 0) * factor,
                protein: (pendingIngredient.protein_g ?? 0) * factor,
                fat: (pendingIngredient.fat_g ?? 0) * factor,
                raw: pendingIngredient,
            },
        ]);
        setPendingIngredient(null);
        setGramInput('100');
        setSearch('');
        setResults([]);
    };

    const removeFromBasket = (index: number) => {
        setBasket(prev => prev.filter((_, i) => i !== index));
    };

    // Totals
    const totals = basket.reduce(
        (acc, item) => ({
            calories: acc.calories + item.calories,
            carbs: acc.carbs + item.carbs,
            protein: acc.protein + item.protein,
            fat: acc.fat + item.fat,
        }),
        { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    // Save & Log
    const handleSaveAndLog = async () => {
        if (!dishName.trim()) {
            setInfoModal({ title: 'Name Your Dish', message: 'Please enter a name for your custom dish before saving.', variant: 'info' });
            return;
        }
        if (basket.length === 0) {
            setInfoModal({ title: 'Add Ingredients', message: 'Please add at least one ingredient to your dish.', variant: 'info' });
            return;
        }
        if (!user) return;

        setSaving(true);
        try {
            const ingredients: CustomDishIngredient[] = basket.map(item => ({
                food_name: item.food_name,
                grams: item.grams,
            }));

            const saved = await saveCustomDish(dishName.trim(), ingredients);

            const meal = {
                id: Crypto.randomUUID(),
                userId: user.id,
                foodName: saved.food_name,
                mealType: currentMealType as MealType,
                grams: basket.reduce((s, i) => s + i.grams, 0),
                calories: Math.round(totals.calories),
                protein: Math.round(totals.protein * 10) / 10,
                carbs: Math.round(totals.carbs * 10) / 10,
                fat: Math.round(totals.fat * 10) / 10,
                source: 'manual' as const,
                createdAt: new Date().toISOString(),
            };

            await saveMealToFirestore(meal);
            addMeal(meal);

            setInfoModal({
                title: '✅ Dish Saved!',
                message: `"${dishName.trim()}" has been logged as ${currentMealType}.`,
                variant: 'info',
                onConfirm: () => { setInfoModal(null); router.replace('/(tabs)/' as any); },
            });
        } catch (err: any) {
            setInfoModal({ title: 'Save Failed', message: err?.message ?? 'Something went wrong. Please try again.', variant: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#333" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.heading}>Build Custom Dish</Text>
                    <Text style={styles.subheading}>Add ingredients and set gram weights</Text>
                </View>
                <View style={[styles.mealPill, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={12} color={meta.color} />
                    <Text style={[styles.mealPillText, { color: meta.color }]}>{currentMealType}</Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 120 }}
                >
                    {/* ── Dish Name ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Dish Name</Text>
                        <TextInput
                            style={styles.dishNameInput}
                            placeholder="e.g. My Daal Chawal"
                            placeholderTextColor="#bbb"
                            value={dishName}
                            onChangeText={setDishName}
                        />
                    </View>

                    {/* ── Basket ── */}
                    {basket.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Ingredients Added</Text>
                            {basket.map((item, i) => (
                                <View key={i} style={styles.basketRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.basketName} numberOfLines={1}>{item.food_name}</Text>
                                        <Text style={styles.basketMacros}>
                                            {item.grams}g · {Math.round(item.calories)} kcal · P {item.protein.toFixed(1)}g · C {item.carbs.toFixed(1)}g · F {item.fat.toFixed(1)}g
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeFromBasket(i)} style={styles.removeBtn}>
                                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Totals bar */}
                            <View style={styles.totalsBar}>
                                <TotalChip label="Total kcal" value={Math.round(totals.calories)} color="#f59e0b" />
                                <TotalChip label="Carbs" value={`${totals.carbs.toFixed(1)}g`} color="#22c55e" />
                                <TotalChip label="Protein" value={`${totals.protein.toFixed(1)}g`} color="#3b82f6" />
                                <TotalChip label="Fat" value={`${totals.fat.toFixed(1)}g`} color="#8b5cf6" />
                            </View>
                        </View>
                    )}

                    {/* ── Ingredient Search ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Search Ingredients</Text>
                        <View style={styles.searchWrapper}>
                            <Ionicons name="search-outline" size={16} color="#aaa" style={{ marginLeft: 12 }} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="e.g. butter, rice, lentils..."
                                placeholderTextColor="#bbb"
                                value={search}
                                onChangeText={handleSearchChange}
                            />
                            {searching && <ActivityIndicator size="small" color="#22c55e" style={{ marginRight: 12 }} />}
                            {!searching && search.length > 0 && (
                                <TouchableOpacity onPress={() => { setSearch(''); setResults([]); }} style={{ padding: 10 }}>
                                    <Ionicons name="close-circle" size={16} color="#ccc" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* ── Results ── */}
                    {results.length > 0 && (
                        <View style={{ paddingHorizontal: 16, gap: 8 }}>
                            {results.map((item, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={styles.resultRow}
                                    onPress={() => { setPendingIngredient(item); setGramInput('100'); }}
                                    activeOpacity={0.8}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.resultName} numberOfLines={1}>{item.food_name}</Text>
                                        <Text style={styles.resultMacros}>
                                            P {item.protein_g ?? 0}g · C {item.carb_g ?? 0}g · F {item.fat_g ?? 0}g per 100g
                                        </Text>
                                    </View>
                                    <View style={styles.kcalBadge}>
                                        <Text style={styles.kcalValue}>{Math.round(item.energy_kcal ?? 0)}</Text>
                                        <Text style={styles.kcalUnit}>kcal</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {!searching && search.length > 0 && results.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="leaf-outline" size={36} color="#D1FAE5" />
                            <Text style={styles.emptyText}>No ingredients found for "{search}"</Text>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Save & Log FAB ── */}
            <View style={styles.fabArea}>
                <TouchableOpacity
                    style={[styles.saveBtn, (saving || basket.length === 0) && styles.saveBtnDisabled]}
                    onPress={handleSaveAndLog}
                    disabled={saving || basket.length === 0}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>Save & Log Dish</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* ── Gram Picker Modal ── */}
            <Modal visible={!!pendingIngredient} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>{pendingIngredient?.food_name}</Text>
                        <Text style={styles.modalSub}>
                            {Math.round(pendingIngredient?.energy_kcal ?? 0)} kcal per 100g
                        </Text>

                        <Text style={styles.modalLabel}>How many grams?</Text>
                        <TextInput
                            style={styles.gramInput}
                            keyboardType="numeric"
                            value={gramInput}
                            onChangeText={setGramInput}
                            autoFocus
                            selectTextOnFocus
                        />
                        <Text style={styles.gramPreview}>
                            ≈ {Math.round((pendingIngredient?.energy_kcal ?? 0) * (parseFloat(gramInput) || 0) / 100)} kcal
                        </Text>

                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setPendingIngredient(null)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalAdd} onPress={confirmAddIngredient}>
                                <Text style={styles.modalAddText}>Add to Dish</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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

const TotalChip = ({ label, value, color }: { label: string; value: any; color: string }) => (
    <View style={[styles.totalChip, { backgroundColor: color + '18' }]}>
        <Text style={[styles.totalChipValue, { color }]}>{value}</Text>
        <Text style={styles.totalChipLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F3F6FA' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 14,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#E8EDF2',
    },
    heading: { fontSize: 18, fontWeight: '800', color: '#111', fontFamily: Fonts.extrabold },
    subheading: { fontSize: 12, color: '#888', marginTop: 2, fontFamily: Fonts.regular },
    mealPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    mealPillText: { fontSize: 11, fontWeight: '700', fontFamily: Fonts.bold },

    section: { paddingHorizontal: 16, marginBottom: 16 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, fontFamily: Fonts.bold },

    dishNameInput: {
        backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16,
        paddingVertical: 13, fontSize: 15, color: '#111',
        borderWidth: 1, borderColor: '#E8EDF2',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
        fontFamily: Fonts.regular,
    },

    /* Basket */
    basketRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 12, padding: 12, marginBottom: 8,
        borderWidth: 1, borderColor: '#F0F0F0',
    },
    basketName: { fontSize: 14, fontWeight: '600', color: '#111', fontFamily: Fonts.semibold },
    basketMacros: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: Fonts.regular },
    removeBtn: { padding: 6 },

    totalsBar: {
        flexDirection: 'row', justifyContent: 'space-between',
        marginTop: 8, gap: 6,
    },
    totalChip: {
        flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center',
    },
    totalChipValue: { fontSize: 14, fontWeight: '800', fontFamily: Fonts.extrabold },
    totalChipLabel: { fontSize: 9, color: '#888', marginTop: 1, fontWeight: '600', fontFamily: Fonts.semibold },

    /* Search */
    searchWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 14, borderWidth: 1, borderColor: '#E8EDF2',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
    },
    searchInput: {
        flex: 1, paddingHorizontal: 10, paddingVertical: 13,
        fontSize: 15, color: '#111',
        fontFamily: Fonts.regular,
    },

    /* Results */
    resultRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F0F0F0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
        marginBottom: 8,
    },
    resultName: { fontSize: 14, fontWeight: '600', color: '#111', fontFamily: Fonts.semibold },
    resultMacros: { fontSize: 11, color: '#9ca3af', marginTop: 3, fontFamily: Fonts.regular },
    kcalBadge: { alignItems: 'center', minWidth: 48 },
    kcalValue: { fontSize: 18, fontWeight: '900', color: '#111', fontFamily: Fonts.extrabold },
    kcalUnit: { fontSize: 10, color: '#999', fontWeight: '500', fontFamily: Fonts.medium },

    emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: { fontSize: 13, color: '#9ca3af', fontFamily: Fonts.regular },

    /* FAB */
    fabArea: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12,
        backgroundColor: '#F3F6FA',
    },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 16, gap: 8,
        shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    saveBtnDisabled: { backgroundColor: '#a3e4b4', shadowOpacity: 0 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: Fonts.bold },

    /* Gram modal */
    modalOverlay: {
        flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 36,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 4, fontFamily: Fonts.extrabold },
    modalSub: { fontSize: 13, color: '#9ca3af', marginBottom: 20, fontFamily: Fonts.regular },
    modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10, fontFamily: Fonts.semibold },
    gramInput: {
        backgroundColor: '#F3F6FA', borderRadius: 12, paddingHorizontal: 16,
        paddingVertical: 14, fontSize: 28, fontWeight: '800', color: '#111',
        textAlign: 'center', marginBottom: 6, borderWidth: 1, borderColor: '#E8EDF2',
        fontFamily: Fonts.extrabold,
    },
    gramPreview: { textAlign: 'center', color: '#9ca3af', fontSize: 13, marginBottom: 24, fontFamily: Fonts.regular },
    modalBtns: { flexDirection: 'row', gap: 12 },
    modalCancel: {
        flex: 1, paddingVertical: 14, borderRadius: 12,
        borderWidth: 1, borderColor: '#E8EDF2', alignItems: 'center',
    },
    modalCancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280', fontFamily: Fonts.semibold },
    modalAdd: {
        flex: 2, paddingVertical: 14, borderRadius: 12,
        backgroundColor: '#22c55e', alignItems: 'center',
    },
    modalAddText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: Fonts.bold },
});
