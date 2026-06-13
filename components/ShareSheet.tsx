import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { db } from '@/lib/firebase';
import { handleFirestoreListenerError } from '@/lib/firestoreListenerErrors';

type Collaborator = {
  uid: string;
  displayName: string;
};

type ShareSheetProps = {
  visible: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
};

export default function ShareSheet({
  visible,
  onClose,
  listId,
  listName,
}: ShareSheetProps) {
  const { colors, radii, spacing } = useTheme();
  const { user } = useAuth();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [copied, setCopied] = useState(false);

  const inviteUrl = useMemo(
    () => Linking.createURL(`join/${listId}`),
    [listId],
  );

  useEffect(() => {
    if (!visible || !listId) {
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
  }, [listId, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

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
  }, [memberIds, visible]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my list “${listName}” on List App: ${inviteUrl}`,
        url: inviteUrl,
        title: `Join ${listName}`,
      });
    } catch {
      Alert.alert('Could not share', 'Please try copying the link instead.');
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderTopLeftRadius: radii.card,
              borderTopRightRadius: radii.card,
              padding: spacing.lg,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Share list</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Invite someone to collaborate on “{listName}”
          </Text>

          <View
            style={[
              styles.linkBox,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                borderRadius: radii.item,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text
              numberOfLines={2}
              style={[styles.linkText, { color: colors.text }]}
            >
              {inviteUrl}
            </Text>
          </View>

          <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.md }]}>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radii.item,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.actionButtonText, { color: colors.surface }]}>
                {copied ? 'Copied!' : 'Copy link'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  borderColor: colors.border,
                  borderRadius: radii.item,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Invite someone
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
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

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              {
                borderColor: colors.border,
                borderRadius: radii.item,
                marginTop: spacing.lg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.closeButtonText, { color: colors.text }]}>
              Done
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 23, 0.35)',
  },
  sheet: {
    borderTopWidth: 1,
    gap: 4,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
  },
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
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
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
  closeButton: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
  },
});
