import { Platform, Share } from 'react-native';

import { APP_NAME } from '@/lib/appName';
import { showAppAlert } from '@/lib/appAlert';
import { getInviteUrl } from '@/lib/inviteUrl';

export async function shareListInvite(listId: string, listName: string): Promise<void> {
  const inviteUrl = getInviteUrl(listId);
  const message = `Join my list “${listName}” on ${APP_NAME}:\n${inviteUrl}`;

  try {
    if (Platform.OS === 'ios') {
      await Share.share({
        message,
        url: inviteUrl,
        title: `Join ${listName}`,
      });
      return;
    }

    await Share.share({
      message,
      title: `Join ${listName}`,
    });
  } catch {
    showAppAlert('Could not share', 'Please try again.');
  }
}
