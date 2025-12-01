import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GOOGLE_WEB_CLIENT_ID } from '../config';

// Required for web browser to close properly after authentication
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  idToken: string;
  accessToken: string;
}

/**
 * Hook to handle Google OAuth authentication
 * Returns the authentication request, response, and prompt function
 */
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
  });

  return {
    request,
    response,
    promptAsync,
  };
};

/**
 * Extract ID token from Google OAuth response
 */
export const getGoogleIdToken = (response: any): string | null => {
  if (response?.type === 'success') {
    const { id_token } = response.params;
    return id_token || null;
  }
  return null;
};
