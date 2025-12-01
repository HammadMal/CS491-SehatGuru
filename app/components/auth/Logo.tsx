import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface LogoProps {
  size?: number;
  variant?: 'default' | 'transparent';
}

export const Logo: React.FC<LogoProps> = ({ size = 150, variant = 'default' }) => {
  const logoSource = variant === 'transparent'
    ? require('../../assets/images/logobgrm.png')
    : require('../../assets/images/logo1.png');

  return (
    <View style={styles.container}>
      <Image
        source={logoSource}
        style={[styles.logo, { width: size, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
});
