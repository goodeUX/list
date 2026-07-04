import type { AuthCredential } from 'firebase/auth';

export type SocialCredentialResult =
  | { credential: AuthCredential; fullName?: string }
  | 'cancelled'
  | 'unavailable';

export function isGoogleSignInAvailable(): boolean {
  return false;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  return false;
}

export async function getGoogleCredential(): Promise<SocialCredentialResult> {
  return 'unavailable';
}

export async function getAppleCredential(): Promise<SocialCredentialResult> {
  return 'unavailable';
}
