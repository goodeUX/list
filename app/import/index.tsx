import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '@/components/Button';
import ListFormModal from '@/components/ListFormModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLists } from '@/hooks/useLists';
import { addItemToList } from '@/hooks/useListItems';
import { absoluteFill } from '@/lib/absoluteFill';
import { showAppAlert } from '@/lib/appAlert';
import { applyEntriesToList } from '@/lib/importEntries';
import { fetchAndParseRecipe, fetchPageTitle } from '@/lib/recipeFetch';
import { ingredientToEntry } from '@/lib/recipeImport';

type Phase = 'choosing' | 'working' | 'pickList';
type ImportAction = 'ingredients' | 'link';

const DEFAULT_EMOJI = '📋';

function hostOf(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

export default function ImportScreen() {
  const params = useLocalSearchParams<{ url?: string | string[] }>();
  const url = typeof params.url === 'string' ? params.url : undefined;
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { lists, loading: listsLoading, createList } = useLists();

  const [phase, setPhase] = useState<Phase>('choosing');
  const [action, setAction] = useState<ImportAction>('link');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, []);

  const finishToList = useCallback((listId: string, summary: string) => {
    router.replace({ pathname: '/list/[id]', params: { id: listId } });
    showAppAlert('Import complete', summary);
  }, []);

  // Move to the list picker for the "add page as a link" flow, resolving a
  // page title first (falling back to the URL host if the fetch fails).
  const startLinkFlow = useCallback(async () => {
    if (!url) {
      return;
    }
    setPhase('working');
    let title: string | null = null;
    try {
      title = await fetchPageTitle(url);
    } catch {
      // Non-fatal: we can still add the link with the host as its name.
      title = null;
    }
    setPageTitle(title && title.length > 0 ? title : hostOf(url));
    setAction('link');
    setPhase('pickList');
  }, [url]);

  const offerLinkFallback = useCallback(
    (message: string) => {
      showAppAlert('No ingredients found', message, [
        { text: 'Add page as link', onPress: () => void startLinkFlow() },
        { text: 'Cancel', style: 'cancel', onPress: () => setPhase('choosing') },
      ]);
    },
    [startLinkFlow],
  );

  const handleImportIngredients = useCallback(async () => {
    if (!url) {
      return;
    }
    setPhase('working');
    try {
      const recipe = await fetchAndParseRecipe(url);
      if (recipe.ingredients.length > 0) {
        setIngredients(recipe.ingredients);
        setPageTitle(recipe.title);
        setAction('ingredients');
        setPhase('pickList');
        return;
      }
      offerLinkFallback(
        "We couldn't find an ingredient list on that page. Add it as a link instead?",
      );
    } catch {
      offerLinkFallback(
        "We couldn't read that page. Add it as a link instead?",
      );
    }
  }, [offerLinkFallback, url]);

  const applyToList = useCallback(
    async (listId: string) => {
      if (!url) {
        return;
      }
      setPhase('working');
      try {
        if (action === 'ingredients') {
          const names = await applyEntriesToList(
            listId,
            user,
            ingredients.map(ingredientToEntry),
          );
          const count = names.length;
          finishToList(
            listId,
            `Added ${count} ${count === 1 ? 'ingredient' : 'ingredients'}.`,
          );
        } else {
          const name = pageTitle && pageTitle.length > 0 ? pageTitle : hostOf(url);
          await addItemToList(listId, user, name, { link: url });
          finishToList(listId, 'Added the page as a link.');
        }
      } catch {
        setPhase('pickList');
        showAppAlert(
          'Could not add to that list',
          'Something went wrong. Please try again.',
        );
      }
    },
    [action, finishToList, ingredients, pageTitle, url, user],
  );

  const handleCreateList = useCallback(
    async (name: string, emoji: string) => {
      setCreating(true);
      try {
        const listId = await createList(name, emoji);
        setCreateModalVisible(false);
        await applyToList(listId);
      } catch {
        showAppAlert('Could not create list', 'Please try again.');
      } finally {
        setCreating(false);
      }
    },
    [applyToList, createList],
  );

  const headerTitle = useMemo(() => {
    if (phase === 'pickList') {
      return action === 'ingredients' ? 'Choose a list' : 'Save link to…';
    }
    return 'Import';
  }, [action, phase]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.flex,
          {
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingTop: insets.top,
          },
        ]}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.md,
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={goBack}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialIcons color={colors.accent} name="chevron-left" size={24} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {!url ? (
          <View style={[styles.centered, { padding: spacing.lg }]}>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Nothing was shared to import.
            </Text>
            <Button label="Back to lists" onPress={goBack} variant="secondary" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { gap: spacing.md, padding: spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.urlCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.card,
                  gap: spacing.xs,
                  padding: spacing.md,
                },
              ]}
            >
              <Text style={[styles.urlLabel, { color: colors.textSecondary }]}>
                Shared link
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.urlValue, { color: colors.text }]}
              >
                {url}
              </Text>
            </View>

            {phase === 'working' ? (
              <View style={[styles.centered, { paddingVertical: spacing.xl }]}>
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
            ) : phase === 'pickList' ? (
              <View style={{ gap: spacing.md }}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {action === 'ingredients'
                    ? `Add ${ingredients.length} ${
                        ingredients.length === 1 ? 'ingredient' : 'ingredients'
                      } to which list?`
                    : 'Which list should hold this link?'}
                </Text>

                {listsLoading ? (
                  <View style={[styles.centered, { paddingVertical: spacing.lg }]}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                ) : lists.length === 0 ? (
                  <Text style={[styles.body, { color: colors.textSecondary }]}>
                    You don't have any lists yet. Create one below.
                  </Text>
                ) : (
                  <View style={{ gap: spacing.sm }}>
                    {lists.map((list) => (
                      <Pressable
                        key={list.id}
                        accessibilityRole="button"
                        onPress={() => void applyToList(list.id)}
                        style={({ pressed }) => [
                          styles.listRow,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.border,
                            borderRadius: radii.item,
                            opacity: pressed ? 0.85 : 1,
                            padding: spacing.md,
                          },
                        ]}
                      >
                        <Text style={styles.listEmoji}>{list.emoji}</Text>
                        <Text
                          numberOfLines={1}
                          style={[styles.listName, { color: colors.text }]}
                        >
                          {list.name}
                        </Text>
                        <MaterialIcons
                          color={colors.textSecondary}
                          name="chevron-right"
                          size={22}
                        />
                      </Pressable>
                    ))}
                  </View>
                )}

                <Button
                  icon="add"
                  label="New list"
                  onPress={() => setCreateModalVisible(true)}
                  variant="secondary"
                />
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                <Text style={[styles.body, { color: colors.textSecondary }]}>
                  What would you like to do with this page?
                </Text>
                <Button
                  icon="restaurant"
                  label="Import ingredients"
                  onPress={() => void handleImportIngredients()}
                  variant="primary"
                />
                <Button
                  icon="link"
                  label="Add page as item"
                  onPress={() => void startLinkFlow()}
                  variant="secondary"
                />
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <ListFormModal
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateList}
        initialEmoji={DEFAULT_EMOJI}
        submitLabel="Create & add"
        submitting={creating}
        title="New list"
        visible={createModalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...absoluteFill,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 22,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerSpacer: {
    flexShrink: 0,
    height: 44,
    width: 44,
  },
  title: {
    flex: 1,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    minWidth: 0,
  },
  content: {
    flexGrow: 1,
  },
  centered: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  urlCard: {
    borderWidth: 1,
  },
  urlLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  urlValue: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  sectionLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  listRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  listEmoji: { fontSize: 22, lineHeight: 26 },
  listName: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
});
