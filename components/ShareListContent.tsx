import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Button from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { showAppAlert } from '@/lib/appAlert';
import { useListCollaborators } from '@/hooks/useListCollaborators';
import { getInviteUrl } from '@/lib/inviteUrl';
import { shareListInvite } from '@/lib/shareListInvite';
import { space } from '@/lib/design';

type ShareListContentProps = {
  listId: string;
  listName: string;
};

export default function ShareListContent({
  listId,
  listName,
}: ShareListContentProps) {
  const { colors, radius, space, typography } = useTheme();
  const { user } = useAuth();
  const { collaborators, loading: loadingMembers } = useListCollaborators(listId);

  const inviteUrl = useMemo(() => getInviteUrl(listId), [listId]);

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(inviteUrl);
      showAppAlert('Link copied', 'Invite link copied to clipboard.');
    } catch {
      showAppAlert('Could not copy', 'Please try again.');
    }
  };

  const handleOpenLink = async () => {
    try {
      await Linking.openURL(inviteUrl);
    } catch {
      showAppAlert('Could not open link', 'Please try again.');
    }
  };

  const handleShare = () => {
    void shareListInvite(listId, listName);
  };

  return (
    <View style={{ gap: space[4] }}>
      <Text style={[typography.body, { color: colors.textSecondary }]}>
        Invite someone to collaborate on “{listName}”
      </Text>

      {Platform.OS === 'web' ? (
        <View style={{ gap: space[1] }}>
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
            Invite link
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={handleOpenLink}
            style={({ pressed }) => [
              styles.linkBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text selectable style={[typography.bodyS, { color: colors.primary }]}>
              {inviteUrl}
            </Text>
          </Pressable>
          <Button label="Copy link" onPress={handleCopyLink} variant="surface" />
        </View>
      ) : null}

      <Button
        label={Platform.OS === 'web' ? 'Invite someone' : 'Share invite link'}
        onPress={handleShare}
        variant="primary"
      />

      <View style={{ gap: space[2] }}>
        <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
          Collaborators
        </Text>
        {loadingMembers ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          collaborators.map((collaborator) => {
            const showEmail =
              collaborator.email &&
              collaborator.email.toLowerCase() !==
                collaborator.displayName.toLowerCase();

            return (
              <View key={collaborator.uid} style={styles.collaboratorRow}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.primarySoft, borderRadius: radius.md },
                  ]}
                >
                  <Text style={[typography.bodyS, { color: colors.text }]}>
                    {collaborator.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.collaboratorDetails}>
                  <Text style={[typography.body, { color: colors.text }]}>
                    {collaborator.displayName}
                    {collaborator.uid === user?.uid ? ' (you)' : ''}
                  </Text>
                  {showEmail ? (
                    <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                      {collaborator.email}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.onlineDot,
                    { backgroundColor: colors.success },
                  ]}
                />
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linkBox: {
    borderWidth: 1,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  collaboratorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[3],
  },
  avatar: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  collaboratorDetails: {
    flex: 1,
    gap: 2,
  },
  onlineDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
