import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

interface CustomInputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  containerStyle,
  icon,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[
            styles.input,
            error && styles.inputError,
            icon && styles.inputWithIcon,
            style,
          ]}
          placeholderTextColor={Colors.placeholder}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.semibold,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  inputError: {
    borderColor: Colors.error,
  },
  iconContainer: {
    position: 'absolute',
    right: 16,
    top: 14,
    zIndex: 1,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});
