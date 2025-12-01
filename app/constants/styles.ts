import { ViewStyle, TextStyle } from 'react-native';
import { Colors } from './colors';

export const CommonStyles = {
  // Cards
  card: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 15,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  } as ViewStyle,

  // Containers
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  } as ViewStyle,

  // Buttons
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  } as ViewStyle,

  secondaryButton: {
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  } as ViewStyle,

  // Inputs
  input: {
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  } as ViewStyle,

  inputError: {
    borderColor: Colors.error,
  } as ViewStyle,

  // Typography
  heading1: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  } as TextStyle,

  heading2: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  } as TextStyle,

  body: {
    fontSize: 16,
    color: Colors.textSecondary,
  } as TextStyle,

  caption: {
    fontSize: 14,
    color: Colors.textSecondary,
  } as TextStyle,

  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  } as TextStyle,
};
