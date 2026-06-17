import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';
import { db } from '@/lib/firebase';
import { handleFirestoreListenerError } from '@/lib/firestoreListenerErrors';
import { getInviteUrl } from '@/lib/inviteUrl';
import { shareListInvite } from '@/lib/shareListInvite';

type Collaborator = {
  uid: string;
  displayName: string;
};

type ShareListContentProps = {
  listId: string;
  listName: string;
};

export default function ShareListContent({
  listId,
  listName,
}: ShareListContentProps) {
  const { colors, radii, spacing } = useTheme();
  const { user } = useAuth();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const inviteUrl = useMemo(() => getInviteUrl(listId), [listId]);

  useEffect(() => {
    if (!listId) {
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'lists', listId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setMemberIds([]);
          return;
        }
        setMemberIds((snapshot.data().memberIds as string[]) ?? []);
      },
      handleFirestoreListenerError,
    );

    return unsubscribe;
  }, [listId]);

  useEffect(() => {
    let active = true;
    setLoadingMembers(true);

    const loadCollaborators = async () => {
      const results = await Promise.all(
        memberIds.map(async (uid) => {
          const snapshot = await getDoc(doc(db, 'users', uid));
          const data = snapshot.data();
          return {
            uid,
            displayName: (data?.displayName as string) || (data?.email as string) || 'Member',
          };
        }),
      );

      if (active) {
        setCollaborators(results);
        setLoadingMembers(false);
      }
    };

    void loadCollaborators();

    return () => {
      active = false;
    };
  }, [memberIds]);

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(inviteUrl);
      Alert.alert('Link copied', 'Invite link copied to clipboard.');
    } catch {
      Alert.alert('Could not copy', 'Please try again.');
    }
  };

  const handleOpenLink = async () => {
    try {
      await Linking.openURL(inviteUrl);
    } catch {
      Alert.alert('Could not open link', 'Please try again.');
    }
  };

  const handleShare = () => {
    void shareListInvite(listId, listName);
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Invite someone to collaborate on “{listName}”
      </Text>

      <View style={{ gap: spacing.xs }}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
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
              borderRadius: radii.item,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text selectable style={[styles.linkText, { color: colors.accent }]}>
            {inviteUrl}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleCopyLink}
          style={({ pressed }) => [
            styles.secondaryButton,
            buttonLayoutStyle,
            {
              backgroundColor: colors.surfaceMuted,
              borderRadius: radii.item,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[buttonLabelStyle(15), { color: colors.text }]}>
            Copy link
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handleShare}
        style={({ pressed }) => [
          styles.actionButton,
          buttonLayoutStyle,
          {
            backgroundColor: colors.accent,
            borderRadius: radii.item,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[buttonLabelStyle(15), { color: colors.surface }]}>
          Invite someone
        </Text>
      </Pressable>

      <View style={{ gap: spacing.sm }}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Collaborators
        </Text>
        {loadingMembers ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          collaborators.map((collaborator) => (
            <View key={collaborator.uid} style={styles.collaboratorRow}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.accentSoft },
                ]}
              >
                <Text style={[styles.avatarText, { color: colors.text }]}>
                  {collaborator.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.collaboratorName, { color: colors.text }]}>
                {collaborator.displayName}
                {collaborator.uid === user?.uid ? ' (you)' : ''}
              </Text>
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: colors.success },
                ]}
              />
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  linkBox: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    minHeight: 44,
    width: '100%',
  },
  actionButton: {
    minHeight: 48,
    width: '100%',
  },
  sectionLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  collaboratorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  collaboratorName: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 20,
  },
  onlineDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
