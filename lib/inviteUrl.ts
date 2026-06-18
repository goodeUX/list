import * as Linking from 'expo-linking';

export function getAppWebOrigin(): string | null {
  const configured = process.env.EXPO_PUBLIC_APP_WEB_URL?.trim().replace(/\/$/, '');
  if (configured) {
    return configured;
  }

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (projectId) {
    return `https://${projectId}.web.app`;
  }

  return null;
}

/** Public HTTPS link for invites — clickable in SMS, email, etc. */
export function getInviteUrl(listId: string): string {
  const webOrigin = getAppWebOrigin();
  if (webOrigin) {
    return `${webOrigin}/join/${listId}`;
  }

  return Linking.createURL(`join/${listId}`);
}
