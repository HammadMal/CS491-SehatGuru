import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomInput } from './CustomInput';
import { Colors } from '../../constants/colors';

interface PasswordInputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  autoCapitalize = 'none',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <CustomInput
      label={label}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      error={error}
      secureTextEntry={!showPassword}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      icon={
        <TouchableOpacity onPress={togglePasswordVisibility}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      }
    />
  );
};
