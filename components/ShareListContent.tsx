import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
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

  const inviteUrl = useMemo(
    () => Linking.createURL(`join/${listId}`),
    [listId],
  );

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

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my list “${listName}” on List App: ${inviteUrl}`,
        url: inviteUrl,
        title: `Join ${listName}`,
      });
    } catch {
      Alert.alert('Could not share', 'Please try again.');
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Invite someone to collaborate on “{listName}”
      </Text>

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
  actionButton: {
    borderWidth: 1,
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
