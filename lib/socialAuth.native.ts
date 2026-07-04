import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleAuthProvider, OAuthProvider, type AuthCredential } from 'firebase/auth';
import { Platform } from 'react-native';

export type SocialCredentialResult =
  | { credential: AuthCredential; fullName?: string }
  | 'cancelled'
  | 'unavailable';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
let googleConfigured = false;

function ensureGoogleConfigured(): void {
  if (!googleConfigured) {
    GoogleSignin.configure({ webClientId });
    googleConfigured = true;
  }
}

export function isGoogleSignInAvailable(): boolean {
  return webClientId.length > 0;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getGoogleCredential(): Promise<SocialCredentialResult> {
  if (!isGoogleSignInAvailable()) {
    return 'unavailable';
  }

  ensureGoogleConfigured();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type !== 'success') {
      return 'cancelled';
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      throw { code: 'auth/provider-unavailable' };
    }

    return { credential: GoogleAuthProvider.credential(idToken) };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS) {
        return 'cancelled';
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw { code: 'auth/play-services-unavailable' };
      }
    }
    throw error;
  }
}

export async function getAppleCredential(): Promise<SocialCredentialResult> {
  if (!(await isAppleSignInAvailable())) {
    return 'unavailable';
  }

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  let appleCredential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      return 'cancelled';
    }
    throw error;
  }

  if (!appleCredential.identityToken) {
    throw { code: 'auth/provider-unavailable' };
  }

  // Apple only supplies the name on the FIRST authorization — capture it now.
  const fullName = [
    appleCredential.fullName?.givenName,
    appleCredential.fullName?.familyName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const provider = new OAuthProvider('apple.com');
  return {
    credential: provider.credential({
      idToken: appleCredential.identityToken,
      rawNonce,
    }),
    fullName: fullName || undefined,
  };
}
