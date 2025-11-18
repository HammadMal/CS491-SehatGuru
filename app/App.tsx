import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { api } from './services/api';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  const testBackendConnection = async () => {
    setLoading(true);
    setConnectionStatus('');
    try {
      const response = await api.healthCheck();
      setConnectionStatus('✓ Connected to backend successfully!');
    } catch (error: any) {
      setConnectionStatus(`✗ Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SehatGuru</Text>
      <Text style={styles.subtitle}>Health Management App</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={testBackendConnection}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test Backend Connection</Text>
        )}
      </TouchableOpacity>

      {connectionStatus ? (
        <Text style={[
          styles.status,
          connectionStatus.includes('✓') ? styles.success : styles.error
        ]}>
          {connectionStatus}
        </Text>
      ) : null}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    marginTop: 20,
    fontSize: 14,
    textAlign: 'center',
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#F44336',
  },
});
