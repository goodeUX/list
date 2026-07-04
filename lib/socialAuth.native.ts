import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleAuthProvider, OAuthProvider, type AuthCredential } from 'firebase/auth';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

export type SocialCredentialResult =
  | { credential: AuthCredential; fullName?: string }
  | 'cancelled'
  | 'unavailable';

const webClientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();

// The Google sign-in package calls TurboModuleRegistry.getEnforcing('RNGoogleSignin')
// at import time, which throws hard when the native module isn't in the binary —
// Expo Go, or a dev client built before the dependency was added. In Metro's dev
// loader that throw escapes a surrounding try/catch and reaches React's render, so
// we must never even import the package unless the native module is actually
// present. Probe with the non-throwing get()/NativeModules lookup first.
let googleModule: GoogleSignInModule | null | undefined;

function getGoogleModule(): GoogleSignInModule | null {
  if (googleModule === undefined) {
    try {
      const hasNativeModule =
        TurboModuleRegistry.get('RNGoogleSignin') != null ||
        (NativeModules as Record<string, unknown>).RNGoogleSignin != null;
      googleModule = hasNativeModule
        ? (require('@react-native-google-signin/google-signin') as GoogleSignInModule)
        : null;
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
