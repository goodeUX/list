import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleAuthProvider, OAuthProvider, type AuthCredential } from 'firebase/auth';
import { Platform } from 'react-native';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

export type SocialCredentialResult =
  | { credential: AuthCredential; fullName?: string }
  | 'cancelled'
  | 'unavailable';

const webClientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();

// The Google sign-in package registers a native module (RNGoogleSignin) at import
// time, so a top-level import crashes the whole app on any build that lacks it —
// Expo Go, or a dev client built before the dependency was added. Require it
// lazily and defensively so its absence degrades to "unavailable" instead of
// taking the entire module graph (and the app) down on startup.
let googleModule: GoogleSignInModule | null | undefined;

function getGoogleModule(): GoogleSignInModule | null {
  if (googleModule === undefined) {
    try {
      googleModule = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
    } catch {
      googleModule = null;
    }
  }

  return googleModule;
}

let googleConfigured = false;

function ensureGoogleConfigured(mod: GoogleSignInModule): void {
  if (!googleConfigured) {
    mod.GoogleSignin.configure({ webClientId });
    googleConfigured = true;
  }
}

export function isGoogleSignInAvailable(): boolean {
  return webClientId.length > 0 && getGoogleModule() !== null;
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
  const mod = getGoogleModule();
  if (webClientId.length === 0 || !mod) {
    return 'unavailable';
  }

  const { GoogleSignin, isErrorWithCode, statusCodes } = mod;
  ensureGoogleConfigured(mod);

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
      console.warn('[socialAuth] Google sign-in failed with code', error.code);
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
