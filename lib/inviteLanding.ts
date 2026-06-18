import { Platform } from 'react-native';

import { getAppWebOrigin } from '@/lib/inviteUrl';

export function getAppWebHost(): string | null {
  const origin = getAppWebOrigin();
  if (!origin) {
    return null;
  }

  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

export function isMobileWebUserAgent(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isStandaloneWebApp(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches;
}

export function shouldShowInviteAppLanding(): boolean {
  return isMobileWebUserAgent() && !isStandaloneWebApp();
}
