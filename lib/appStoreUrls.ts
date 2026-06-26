import { Platform } from 'react-native';

export const ANDROID_PACKAGE = 'com.goode_company.listkitty';

export function getPlayStoreUrl(listId?: string): string {
  const base = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
  if (!listId) {
    return base;
  }

  const referrer = encodeURIComponent(`listId=${listId}`);
  return `${base}&referrer=${referrer}`;
}

export function getAndroidInviteIntentUrl(listId: string): string {
  const encodedListId = encodeURIComponent(listId);
  const fallbackUrl = encodeURIComponent(getPlayStoreUrl(listId));

  return [
    `intent://join/${encodedListId}`,
    '#Intent',
    ';scheme=list',
    `;package=${ANDROID_PACKAGE}`,
    `;S.browser_fallback_url=${fallbackUrl}`,
    ';end',
  ].join('');
}

export function getIosAppStoreUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_IOS_APP_STORE_URL?.trim();
  return configured || null;
}

export function getAppStoreUrlForPlatform(listId?: string): string | null {
  if (Platform.OS === 'ios') {
    return getIosAppStoreUrl();
  }

  if (Platform.OS === 'android') {
    return getPlayStoreUrl(listId);
  }

  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      return getIosAppStoreUrl();
    }

    if (/Android/i.test(navigator.userAgent)) {
      return getPlayStoreUrl(listId);
    }
  }

  return getPlayStoreUrl(listId);
}
