import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../services/api';
import AddMealModal from '../../components/AddMealModal';
import FoodSelectionModal from '../../components/FoodSelectionModal';
import { router, useLocalSearchParams } from 'expo-router';
import { useMealStore } from '../../store/useMealStore';
import { Meal } from '../../types/meal.types';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../../hooks/useAuth';
import { saveMealToFirestore } from '../../services/meals.firestore';

interface Nutrition {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

interface FoodDetectionResult {
  food_name: string;
  confidence: number;
  is_low_confidence: boolean;
  nutrients?: Nutrition;
}

interface FoodOption {
  food_name: string;
  confidence: number;
  is_low_confidence: boolean;
  nutrients?: Nutrition;
}

const MEAL_META: Record<string, { icon: any; color: string; bg: string }> = {
  Breakfast: { icon: 'sunny-outline', color: '#f59e0b', bg: '#fffbeb' },
  Lunch: { icon: 'restaurant-outline', color: '#22c55e', bg: '#f0fdf4' },
  Dinner: { icon: 'moon-outline', color: '#6366f1', bg: '#eef2ff' },
  Snack: { icon: 'cafe-outline', color: '#ec4899', bg: '#fdf2f8' },
};

export default function CameraScreen() {
  const { mealType: urlMealType } = useLocalSearchParams<{ mealType?: string }>();
  const [image, setImage] = useState<string | null>(null);
  const [detection, setDetection] = useState<FoodDetectionResult | null>(null);
  const [nutrients, setNutrients] = useState<Nutrition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [foodOptions, setFoodOptions] = useState<FoodOption[]>([]);
  const { addMeal } = useMealStore();
  const { user } = useAuth();

  const currentMealType = urlMealType || 'Dinner';
  const meta = MEAL_META[currentMealType] || MEAL_META.Dinner;

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required!');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 4],
      quality: 0.8,
    });
    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);
      setDetection(null);
      setNutrients(null);
      setError(null);
      setFoodOptions([]);
      setSelectionModalVisible(false);
      setModalVisible(false);
      await detectFood(imageUri);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectionModalVisible(false);
    setImage(null);
    setDetection(null);
    setNutrients(null);
    setFoodOptions([]);
    setError(null);
  };

  const handleFoodSelection = (selectedFood: FoodOption) => {
    setSelectionModalVisible(false);
    setDetection({
      food_name: selectedFood.food_name,
      confidence: selectedFood.confidence,
      is_low_confidence: false,
      nutrients: selectedFood.nutrients,
    });
    setNutrients(selectedFood.nutrients || null);
    setModalVisible(true);
  };

  const handleRetake = () => {
    handleModalClose();
    setTimeout(openCamera, 200);
  };

  const handleManual = () => {
    setModalVisible(false);
    setTimeout(() => {
      router.push(`/manual?mealType=${currentMealType}`);
    }, 150);
  };

  const handleDone = async (mealData: any) => {
    if (!user) return;
    const meal: Meal = {
      id: Crypto.randomUUID(),
      userId: user.id,
      foodName: mealData.foodName,
      mealType: mealData.mealType,
      grams: mealData.grams,
      calories: Number(mealData.nutrients.calories),
      protein: Number(mealData.nutrients.protein),
      carbs: Number(mealData.nutrients.carbs),
      fat: Number(mealData.nutrients.fat),
      source: 'camera',
      createdAt: new Date().toISOString(),
    };
    await saveMealToFirestore(meal);
    addMeal(meal);
    handleModalClose();
    setTimeout(() => router.push('/(tabs)/'), 150);
  };

  const detectFood = async (imageUri: string) => {
    setLoading(true);
    setModalVisible(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'food.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri: imageUri, name: filename, type } as any);

      const response = await apiClient.post(
        '/api/food/detect/detailed?top_k=3',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.predictions?.length > 0) {
        const first = response.data.predictions[0];
        if (first.is_low_confidence) {
          setLoading(false);
          setError(null);
          setDetection(null);
          setModalVisible(false);
          setFoodOptions(response.data.predictions);
          setSelectionModalVisible(true);
          return;
        }
        setError(null);
        setDetection(first);
        setNutrients(first.nutrients || null);
        setLoading(false);
      } else {
        throw new Error('No predictions returned');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to detect food.';
      setError(errorMsg);
      setLoading(false);
      Alert.alert('Error', errorMsg);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.heading}>Add a Meal</Text>
          <Text style={styles.subheading}>Snap a photo or search manually</Text>
        </View>

        {/* ── Meal type context pill ── */}
        {urlMealType && (
          <View style={[styles.mealPill, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={14} color={meta.color} />
            <Text style={[styles.mealPillText, { color: meta.color }]}>
              Adding to {currentMealType}
            </Text>
          </View>
        )}

        {/* ── Camera action ── */}
        <TouchableOpacity style={styles.cameraCard} onPress={openCamera} activeOpacity={0.85}>
          <View style={styles.cameraIconRing}>
            <Ionicons name="camera" size={32} color="#22c55e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cameraCardTitle}>Scan with Camera</Text>
            <Text style={styles.cameraCardSub}>AI identifies your food instantly</Text>
          </View>
          <View style={styles.cameraArrow}>
            <Ionicons name="arrow-forward" size={18} color="#22c55e" />
          </View>
        </TouchableOpacity>

        {/* ── Divider ── */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        {/* ── Manual entry ── */}
        <TouchableOpacity
          style={styles.manualCard}
          activeOpacity={0.85}
          onPress={() => router.push(`/manual?mealType=${currentMealType}`)}
        >
          <View style={styles.manualIconRing}>
            <Ionicons name="search" size={20} color="#6366f1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.manualCardTitle}>Search Food Database</Text>
            <Text style={styles.manualCardSub}>Browse thousands of foods & calories</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#bbb" />
        </TouchableOpacity>

        {/* ── Tips card ── */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsHeading}>📸 Camera tips</Text>
          {[
            'Place food on a flat surface',
            'Good lighting gives better results',
            'Get close so the food fills the frame',
          ].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* ── Error ── */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <AddMealModal
        visible={modalVisible}
        loading={loading}
        onClose={handleModalClose}
        onRetake={handleRetake}
        onManual={handleManual}
        onDone={handleDone}
        foodName={detection?.food_name}
        nutrients={nutrients}
        image={image}
        isManual={false}
        defaultMealType={currentMealType}
      />

      {selectionModalVisible && (
        <FoodSelectionModal
          visible={selectionModalVisible}
          onClose={handleModalClose}
          onRetake={handleRetake}
          onManual={handleManual}
          onSelect={handleFoodSelection}
          options={foodOptions}
          image={image}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6FA' },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },

  /* Header */
  header: { marginBottom: 20 },
  heading: { fontSize: 26, fontWeight: '800', color: '#111' },
  subheading: { fontSize: 14, color: '#888', marginTop: 4 },

  /* Meal type pill */
  mealPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  mealPillText: { fontSize: 13, fontWeight: '700' },

  /* Camera card */
  cameraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
    marginBottom: 20,
  },
  cameraIconRing: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cameraCardSub: { fontSize: 12, color: '#888', marginTop: 3 },
  cameraArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* OR divider */
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  orText: { fontSize: 12, color: '#aaa', fontWeight: '600' },

  /* Manual card */
  manualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  manualIconRing: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualCardTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  manualCardSub: { fontSize: 12, color: '#888', marginTop: 3 },

  /* Tips card */
  tipsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 8,
    marginBottom: 20,
  },
  tipsHeading: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#f59e0b' },
  tipText: { fontSize: 13, color: '#78350f' },

  /* Error */
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 14,
  },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 14, fontWeight: '500' },
});