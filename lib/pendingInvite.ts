import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'pendingInviteListId';

function getWebStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export async function getPendingInviteListId(): Promise<string | null> {
  const webStorage = getWebStorage();
  if (webStorage) {
    return webStorage.getItem(STORAGE_KEY);
  }

  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function setPendingInviteListId(listId: string): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(STORAGE_KEY, listId);
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEY, listId);
}

export async function clearPendingInviteListId(): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(STORAGE_KEY);
    return;
  }

  await AsyncStorage.removeItem(STORAGE_KEY);
}
