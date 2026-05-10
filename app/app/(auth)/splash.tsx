import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/SehatGuruNew.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 300,
    height: 140,
  },
});
