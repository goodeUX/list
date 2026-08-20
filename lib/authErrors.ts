const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

export function getAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null | undefined)?.code;
  const message = getMessageForCode(code);

  if (message !== GENERIC_MESSAGE) {
    return message;
  }

  // An unmapped code is the only thing standing between a support report and a
  // diagnosis, so make it recoverable: always log it, and — when
  // EXPO_PUBLIC_DEBUG_AUTH_ERRORS is set on a diagnostic build — show it on
  // screen for devices that can't be attached to Metro or logcat.
  console.warn('[auth] unmapped error code', code ?? '(none)', error);

  return process.env.EXPO_PUBLIC_DEBUG_AUTH_ERRORS
    ? `${GENERIC_MESSAGE} [${code ?? 'no-code'}]`
    : GENERIC_MESSAGE;
}

/**
 * True when the error is Firebase's authoritative "this email already has an
 * account" rejection — the signal to route the message under the email field.
 */
export function isEmailTakenError(error: unknown): boolean {
  return (
    (error as { code?: string } | null | undefined)?.code ===
    'auth/email-already-in-use'
  );
}

function getMessageForCode(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/requires-recent-login':
      return 'Please sign in again and try updating your account.';
    case 'auth/missing-display-name':
      return 'Please enter your name.';
    case 'auth/missing-current-password':
      return 'Enter your current password to change email or password.';
    case 'auth/account-exists-with-different-credential':
      return 'That email already uses a different sign-in method — log in the way you originally signed up.';
    case 'auth/play-services-unavailable':
      return "Google sign-in isn't available on this device.";
    case 'auth/google-config-error':
      return "Google sign-in isn't set up for this version of the app.";
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    case 'auth/provider-unavailable':
      return "That sign-in method isn't available on this device.";
    default:
      return GENERIC_MESSAGE;
  }
}
