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
import { SafeAreaView } from "react-native-safe-area-context";
import apiClient from '../../services/api';
import AddMealModal from "../../components/AddMealModal";
import { router, useLocalSearchParams } from "expo-router";
import { useMealStore } from "../../store/useMealStore";
import { Meal } from "../../types/meal.types";
import * as Crypto from "expo-crypto";
import { useAuth } from "../../hooks/useAuth";
import { saveMealToFirestore } from "../../services/meals.firestore";





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

export default function CameraScreen({ navigation }: any) {
  const { mealType: urlMealType } = useLocalSearchParams<{ mealType?: string }>();
  const [image, setImage] = useState<string | null>(null);
  const [detection, setDetection] = useState<FoodDetectionResult | null>(null);
  const [nutrients, setNutrients] = useState<Nutrition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { addMeal } = useMealStore();
  const { user } = useAuth();



  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Camera permission is required!");
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

      setModalVisible(true);

      await detectFood(imageUri);
    }
  };

    const handleModalClose = () => {
    setModalVisible(false);
    setImage(null);
    setDetection(null);
    setNutrients(null);
    setError(null);
  };


  const handleRetake = () => {
      handleModalClose();
      setTimeout(openCamera, 200);
    };

  const handleManual = () => {
  setModalVisible(false);

  // wait for modal to close before navigating
  setTimeout(() => {
    router.push(`/manual?mealType=${urlMealType || "Dinner"}`);
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
      source: "camera",
      createdAt: new Date().toISOString(),
    };


    await saveMealToFirestore(meal);


    addMeal(meal);


    handleModalClose();

    // Navigate to dashboard to see the added meal
    setTimeout(() => {
      router.push("/(tabs)/");
    }, 150);
    };




  const detectFood = async (imageUri: string) => {
    setLoading(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'food.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append("file", {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await apiClient.post("/api/food/detect", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setDetection(response.data);
      setNutrients(response.data.nutrients || null);
      // // Only show the modal if we have a detection result
      // if (response.data) {
      //   setModalVisible(true);
      // }


    } catch (err: any) {
      const errorMsg =
        err.response?.data?.detail || err.message || "Failed to detect food.";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* HEADER */}
        <Text style={styles.title}>Add a Meal</Text>

        <Text style={styles.subtitle}>
          Track your nutrition with camera or manual entry
        </Text>

        {/* {urlMealType && (
  <View style={styles.mealTypePill}>
    <Text style={styles.mealTypeText}>{urlMealType}</Text>
  </View>
)} */}



        {/* MAIN MENU (no image yet) */}
        <View style={styles.card}>

          <TouchableOpacity style={styles.cameraMainBtn} onPress={openCamera}>
            <Ionicons name="camera" size={22} color="white" />
            <Text style={styles.cameraMainBtnText}>Add Meal with Camera</Text>
          </TouchableOpacity>

          <View style={styles.divider} />


          <TouchableOpacity style={styles.manualBtn} onPress={() => router.push(`/manual?mealType=${urlMealType || "Dinner"}`)}>
            <Ionicons name="create-outline" size={18} color="#374151" />
            <Text style={styles.manualBtnText}>Log Meal Manually</Text>
          </TouchableOpacity>
        </View>


      
        {/* ERROR */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

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
          defaultMealType={urlMealType || "Dinner"}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  scrollContainer: {
  paddingHorizontal: 20,
  paddingTop: 20,   // ⬅ ADD
  paddingBottom: 40,
  alignItems: "center",
},


  title: {
  fontSize: 24,
  fontWeight: "700",
  marginTop: 10,
  marginBottom: 6,   // ⬅ reduce from 20
  color: "#1f2937",
  textAlign: "center",
},

 

  cameraMainBtn: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#22c55e",
  paddingVertical: 16,
  paddingHorizontal: 22,
  borderRadius: 14,
  width: "100%",
  justifyContent: "center",
  shadowColor: "#22c55e",
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 3,
},


  cameraMainBtnText: {
    color: "white",
    marginLeft: 10,
    fontSize: 17,
    fontWeight: "600",
  },

  manualBtn: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#e5e7eb",
  paddingVertical: 14,
  borderRadius: 12,
  width: "100%",          // ⬅ change from 75%
  justifyContent: "center",
},


  manualBtnText: {
    fontSize: 15,
    color: "#374151",
    marginLeft: 8,
    fontWeight: "500",
  },

  preview: {
    width: "95%",
    height: 260,
    borderRadius: 16,
    marginTop: 20,
  },

  resultCard: {
    width: "95%",
    backgroundColor: "#ecfdf5",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#22c55e",
    marginTop: 20,
  },

  resultTitle: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "600",
    marginBottom: 6,
  },

  foodName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },

  retakeBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  retakeBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  nutritionCard: {
    width: "95%",
    marginTop: 20,
    padding: 18,
    backgroundColor: "white",
    borderRadius: 12,
  },

  nutritionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  nutritionItem: {
    fontSize: 15,
    marginBottom: 4,
    color: "#374151",
  },

  errorCard: {
    width: "95%",
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },

  errorText: {
    color: "#b91c1c",
    fontSize: 15,
    fontWeight: "600",
  },

  subtitle: {
  fontSize: 14,
  color: "#6b7280",
  marginBottom: 30,
  textAlign: "center",
},

card: {
  width: "100%",
  backgroundColor: "white",
  borderRadius: 18,
  padding: 20,
  marginTop: 12,     // ⬅ ADD THIS
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 4,
},


divider: {
  height: 1,
  backgroundColor: "#e5e7eb",
  marginVertical: 16,
},

// mealTypePill: {
//   alignSelf: "center",
//   backgroundColor: "#ecfdf5",
//   paddingHorizontal: 14,
//   paddingVertical: 6,
//   borderRadius: 999,
//   marginBottom: 16,
// },

// mealTypeText: {
//   color: "#059669",
//   fontSize: 13,
//   fontWeight: "600",
// },


});