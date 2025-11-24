import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert, ScrollView } from 'react-native';
import apiClient from '../services/api';

interface FoodDetectionResult {
  food_name: string;
  confidence: number;
  is_low_confidence: boolean;
}

export default function CameraScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [detection, setDetection] = useState<FoodDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      setDetection(null);
      // Automatically detect food when image is captured
      await detectFood(imageUri);
    }
  };

  const detectFood = async (imageUri: string) => {
    setLoading(true);
    setError(null);
    try {
      // Create FormData for multipart file upload
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'food.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      // Send to backend
      const response = await apiClient.post('/api/food/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setDetection(response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to detect food. Try again.';
      setError(errorMsg);
      Alert.alert('Detection Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add a Meal</Text>

      <TouchableOpacity style={styles.button} onPress={openCamera} disabled={loading}>
        <Ionicons name="camera" size={24} color="white" />
        <Text style={styles.buttonText}>Open Camera</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Analyzing food...</Text>
        </View>
      )}

      {image && (
        <Image
          source={{ uri: image }}
          style={styles.preview}
        />
      )}

      {detection && !loading && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Detected Food</Text>
          <Text style={styles.foodName}>{detection.food_name}</Text>
          <Text style={styles.confidence}>
            Confidence: {(detection.confidence * 100).toFixed(1)}%
          </Text>
          {detection.is_low_confidence && (
            <Text style={styles.warningText}>
              ⚠️ Low confidence - result may be inaccurate
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={openCamera}>
            <Text style={styles.retryButtonText}>Try Another Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && !loading && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 30,
    color: '#1f2937',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    elevation: 3,              // Android shadow
    shadowColor: '#000',       // iOS shadow
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 17,
    fontWeight: '600',
  },
  preview: {
    width: 260,
    height: 260,
    borderRadius: 16,
    marginTop: 25,
  },
  loadingContainer: {
    marginTop: 30,
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
    padding: 16,
    borderRadius: 8,
    marginTop: 25,
  },
  resultTitle: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 8,
  },
  foodName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  confidence: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#d97706',
    marginBottom: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    marginTop: 25,
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
    fontWeight: '500',
  },
});
